"""
Holds `Sample`, a copy of the sample checkout under
`tests/repo/fixtures/checkout/` that a test edits to pose one divergence at
a time.
"""

from collections.abc import Mapping, Sequence
from json            import dumps
from pathlib         import Path
from pydantic        import BaseModel, Field
from pytest_subprocess.fake_process import FakeProcess
from re      import sub
from shutil  import copytree
from tomllib import loads
from typing  import Self

from scotch.cli           import app
from scotch.repo.checkout import Checkout


class Sample(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    A copy of the sample checkout written into a directory the test owns.

    The fixture keeps the files GitHub's dependency graph and
    `jdx/mise-action` read, and the workflows zizmor reads, under
    other names, which each copy renames, a `dot-` folder taking its
    leading dot and `crate.toml`, `manifest.toml`, `lock.toml`, and
    `manifest.json` landing as `Cargo.toml`, `pyproject.toml`, `uv.lock`,
    and `package.json`.
    """

    root: Path
    """
    The directory holding the copy.
    """

    fixtures: Path = Field(
        default_factory = lambda: Path(__file__).parents[1] / "repo" / "fixtures"
    )
    """
    The folder holding the sample checkout and the task listing mise answers
    with.
    """

    @property
    def checkout(self) -> Checkout:
        """
        Opens a fresh `Checkout` over the copy, so a file edited since the
        last one is read again.
        """
        return Checkout(app=app, root=self.root)

    def answer(self, fp: FakeProcess, issues: Sequence[Mapping[str, str]] = ()):
        """
        Registers the answers mise gives the checkout, listing the tasks
        `tests/repo/fixtures/tasks.toml` declares with each file joined onto
        the copy and resolved as mise prints it, and reporting `issues` from
        `mise tasks validate`.
        """
        listing = loads((self.fixtures / "tasks.toml").read_text())["tasks"]

        fp.register(
            ["mise", "tasks", "ls", "--json", "--local"],
            stdout = dumps(
                [
                    {
                        **task,
                        "file": str(
                            (self.root / task["file"]).resolve()
                        ) if "file" in task else None
                    }
                    for task in listing
                ]
            )
        )
        fp.register(
            ["mise", "tasks", "validate", "--json"],
            returncode = 1 if issues else 0,
            stdout     = dumps({"issues": issues})
        )

    @classmethod
    def copy(cls, root: Path) -> Self:
        """
        Copies the sample checkout into `root` and restores each file's real
        name, renaming each path before the folder holding it, so every path
        the listing holds still exists when its turn comes.
        """
        sample = cls(root=root)
        names  = {
            "crate.toml"    : "Cargo.toml",
            "lock.toml"     : "uv.lock",
            "manifest.json" : "package.json",
            "manifest.toml" : "pyproject.toml"
        }
        copytree(sample.fixtures / "checkout", root, dirs_exist_ok=True)

        for path in sorted(root.rglob("*"), reverse=True):
            path.rename(
                path.with_name(names.get(path.name, sub(r"^dot-", ".", path.name)))
            )

        return sample

    def edit(self, path: str, *, new: str, old: str):
        """
        Replaces `old` with `new` in the file at `path` under the copy,
        failing where the file does not hold `old` rather than leaving the
        copy as it stood.
        """
        file = self.root / path
        text = file.read_text()

        assert old in text, f"{path} holds no {old!r}"
        file.write_text(text.replace(old, new))
