"""
Holds `Sample`, a copy of the sample checkout under
`tests/py/repo/fixtures/checkout/` that a test edits to pose one divergence
at a time.
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

    def answer(
        self,
        fp      : FakeProcess,
        *,
        aliases : Mapping[str, Sequence[str]] = {},
        issues  : Sequence[Mapping[str, str]] = ()
    ):
        """
        Registers the answers mise and git give the checkout, listing
        the tasks `tests/py/repo/fixtures/tasks.toml` declares with
        each file and source joined onto the copy and resolved as
        mise prints them, each task `aliases` names taking the aliases
        it gives and each directory defaulting to the copy's root.
        The answers also report `issues` from `mise tasks validate`,
        print `tests/py/repo/fixtures/usage.kdl` from `mise usage` and
        `tests/py/repo/fixtures/help.txt` from `mise --help`, and list every
        file the copy holds from `git ls-files`.
        """
        listing = loads((self.fixtures / "tasks.toml").read_text())["tasks"]

        fp.register(
            ["mise", "tasks", "ls", "--json", "--local"],
            stdout = dumps(
                [
                    {
                        **task,
                        "aliases" : aliases.get(task["name"], task.get("aliases", ())),
                        "dir"     : str((self.root / task.get("dir", "")).resolve()),
                        "file"    : str(
                            (self.root / task["file"]).resolve()
                        ) if "file" in task else None,
                        "run"     : self.run(task),
                        "source"  : str((self.root / task["source"]).resolve())
                    }
                    for task in listing
                ]
            )
        )
        fp.register(
            ["git", "ls-files", "-z"],
            stdout = "".join(
                f"{path.relative_to(self.root)}\0"
                for path in sorted(self.root.rglob("*"))
                if path.is_file()
            )
        )
        fp.register(
            ["mise", "tasks", "validate", "--json"],
            returncode = 1 if issues else 0,
            stdout     = dumps({"issues": issues})
        )
        fp.register(
            ["mise", "usage"],
            stdout = (self.fixtures / "usage.kdl").read_text()
        )
        fp.register(
            ["mise", "--help"],
            stdout = (self.fixtures / "help.txt").read_text()
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

    def run(self, task: Mapping[str, str]) -> list[object]:
        """
        Reads the `run` of a task declared in TOML from the table its source
        holds under the task's name, a lone string as a list of one, as
        `mise tasks ls` lists it, and none for a task with a file.
        """
        if "file" in task:
            return []

        tables = loads((self.root / task["source"]).read_text())
        run    = (
            tables.get("tasks", tables)
                  .get(task["name"], {})
                  .get("run", [])
        )

        return [run] if isinstance(run, str) else run
