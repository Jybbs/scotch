"""
Holds `Tree`, the checkout `scotch lift pins` runs from or a scratch clone
of it, beside the environment each command run there starts with, through
which each kind of pin queries the tool managing it for the newest release
and a lift is written and tried.
"""

from collections.abc import Collection, Iterator, Mapping
from contextlib      import contextmanager
from os              import pathsep
from pathlib         import Path
from pydantic        import BaseModel
from shlex           import join
from shutil          import copy2
from subprocess      import CompletedProcess, STDOUT, run
from tempfile        import TemporaryDirectory
from typing          import Self, TextIO

from scotch.pins.schemas  import Lift
from scotch.repo.checkout import Checkout


class Tree(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    A directory holding the repository, read through `checkout`, where every
    command runs from the root under `environment`.
    """

    checkout: Checkout
    """
    The records the tree's files load into, whose root is the tree's.
    """

    environment: dict[str, str]
    """
    The variables every command run in the tree starts with.
    """

    @property
    def logs(self) -> Path:
        """
        Locates the folder each attempt at a lift writes its log into.
        """
        return self.root / ".cache" / "lift"

    @property
    def root(self) -> Path:
        """
        Locates the directory holding the tree.
        """
        return self.checkout.root

    @property
    def untracked(self) -> tuple[str, ...]:
        """
        Lists each untracked file git does not ignore, relative to the root.
        """
        return tuple(
            filter(
                None,
                (
                    self.git("ls-files", "--exclude-standard", "--others", "-z")
                        .decode()
                        .split("\0")
                )
            )
        )

    def apply(self, patch: bytes) -> tuple[str, ...]:
        """
        Applies `patch` to the tree's working tree through `git apply`,
        which prints the files it changes as it applies them under
        `--numstat` followed by `--apply`.

        Returns:
            The path of each file the patch changes, relative to the root.

        Raises:
            subprocess.CalledProcessError: Where the patch no longer
                                           applies, since a file it changes
                                           has changed since.
        """
        changed = self.git(
            "apply",
            "--binary",
            "--numstat",
            "-z",
            "--apply",
            patch = patch
        ).decode()

        return tuple(entry.split("\t")[-1] for entry in changed.split("\0") if entry)

    def attempt(
        self,
        lifts   : Collection[Lift],
        log     : Path,
        *,
        checked : bool
    ) -> bytes | None:
        """
        Writes `lifts` into a scratch clone of the tree, then runs `mise
        ci` there where `checked` is set, writing every command and what it
        prints to the file at `log`.

        Returns:
            The diff the lift writes into the clone, or `None` where a
            command failed.
        """
        log.parent.mkdir(exist_ok=True, parents=True)

        with self.clone() as clone, log.open("w", encoding="utf-8") as handle:
            if clone.lift(handle, lifts) and (not checked or clone.check(handle)):
                return clone.git("diff", "--binary")

        return None

    def audit(self, *command: str | Path) -> str:
        """
        Runs the audit `command` names through `mise exec`, which exits 1
        where it reports any advisory.

        Returns:
            What the audit prints to its standard output.

        Raises:
            subprocess.CalledProcessError: Where the audit exits with a
                                           status other than 0 or 1.
        """
        audit = self.tool(*command, check=False)

        if audit.returncode > 1:
            audit.check_returncode()

        return audit.stdout

    def check(self, handle: TextIO) -> bool:
        """
        Runs `repo:ci`, every check a pull request runs, writing what it
        prints to `handle`.

        Returns:
            Whether every check passed.
        """
        return self.log(handle, "mise", "-C", self.root, "run", "repo:ci")

    @contextmanager
    def clone(self) -> Iterator[Self]:
        """
        Clones the tree into a scratch directory sharing its objects,
        carrying each change its working tree holds against `HEAD` and
        each untracked file git does not ignore, and stages them all, so
        `git diff` there reads only what is written after. The directory is
        removed once the block ends.

        Each command the clone runs trusts the clone's own mise config
        through `MISE_TRUSTED_CONFIG_PATHS`, since `mise lock`, unlike `mise
        run`, `mise exec`, and `mise install`, refuses a config it has not
        been told to trust.
        """
        with TemporaryDirectory(prefix="scotch-lift-") as scratch:
            root = (Path(scratch) / self.root.name).resolve()
            tree = self.model_copy(
                update = {
                    "checkout"    : Checkout(app=self.checkout.app, root=root),
                    "environment" : self.environment | {
                        "MISE_TRUSTED_CONFIG_PATHS": pathsep.join(
                            filter(
                                None,
                                (
                                    self.environment.get("MISE_TRUSTED_CONFIG_PATHS"),
                                    str(root)
                                )
                            )
                        )
                    }
                }
            )
            changes = self.git("diff", "--binary", "HEAD")
            self.git("clone", "--quiet", "--shared", self.root, tree.root)

            if changes:
                tree.git("apply", "--binary", patch=changes)

            for name in self.untracked:
                (tree.root / name).parent.mkdir(exist_ok=True, parents=True)
                copy2(self.root / name, tree.root / name)

            tree.git("add", "--all")

            yield tree

    def git(self, *arguments: str | Path, patch: bytes | None = None) -> bytes:
        """
        Runs git with `arguments` from the root, feeding it `patch` on its
        standard input where one is given.

        Returns:
            What git prints to its standard output.

        Raises:
            subprocess.CalledProcessError: Where git exits nonzero.
        """
        return run(
            ["git", *arguments],
            capture_output = True,
            check          = True,
            cwd            = self.root,
            env            = self.environment,
            input          = patch
        ).stdout

    def lift(self, handle: TextIO, lifts: Collection[Lift]) -> bool:
        """
        Writes each of `lifts` into the tree and relocks every lockfile
        through its own manager, writing each command and what it prints to
        `handle`, in these steps:

        1. Rewrites each version the lifts' edits name
        2. Locks and installs the tools `.mise/config.toml` then pins, so
           each command after runs on the lifted uv and Bun
        3. Relocks `uv.lock` through `uv lock`, upgrading each package a
           lift names
        4. Runs `lock:sync`, which relocks `uv.lock`, each task script's
           lockfile, and `docs/bun.lock` against the rewritten manifests
        5. Runs `docs:render`, which rewrites each file restating a pin,
           such as the README's Python badge, on an environment the wrapper
           builds on the lifted interpreter

        Returns:
            Whether every command passed, the steps stopping at the first
            that fails.
        """
        for lift in lifts:
            lift.write(self.root)

        upgrades = [
            argument
            for lift in lifts
            if lift.upgraded
            for argument in ("--upgrade-package", lift.name)
        ]
        steps = [
            ("lock",),
            ("install",),
            ("exec", "--", "uv", "lock", "--no-locked", *upgrades),
            ("run", "lock:sync"),
            ("run", "docs:render")
        ]
        return all(self.log(handle, "mise", "-C", self.root, *step) for step in steps)

    def log(self, handle: TextIO, *command: str | Path) -> bool:
        """
        Runs `command` from the root, writing the command and everything it
        prints to `handle`.

        Returns:
            Whether the command exited zero.
        """
        handle.write(f"$ {join(map(str, command))}\n")
        handle.flush()

        return run(
            command,
            check  = False,
            cwd    = self.root,
            env    = self.environment,
            stderr = STDOUT,
            stdout = handle
        ).returncode == 0

    def mise(self, *arguments: str | Path, check: bool = True) -> CompletedProcess[str]:
        """
        Runs mise with `arguments` as though it started in the root.
        """
        return self.read("mise", "-C", self.root, *arguments, check=check)

    def read(self, *command: str | Path, check: bool = True) -> CompletedProcess[str]:
        """
        Runs `command` from the root, capturing what it prints.

        Raises:
            subprocess.CalledProcessError: Where `check` is set and the
                                           command exits nonzero.
        """
        return run(
            command,
            capture_output = True,
            check          = check,
            cwd            = self.root,
            env            = self.environment,
            text           = True
        )

    def relative(self, path: Path) -> Path:
        """
        Cuts the root off `path`.
        """
        return path.relative_to(self.root)

    @classmethod
    def scrubbed(cls, checkout: Checkout, variables: Mapping[str, str]) -> Self:
        """
        Opens the tree `checkout` reads, whose commands start with
        `variables` minus what `uv run` and `mise run` set for the running
        command, so a command run through mise there takes that tree's
        environment alone. What leaves `variables` is:

        - `VIRTUAL_ENV`, `UV`, and `UV_RUN_RECURSION_DEPTH`, which `uv run`
          sets for the program it starts
        - Each variable the `[env]` block of the checkout's
          `.mise/config.toml` sets, and each one `mise run` gives a task
        - Each folder inside the checkout that `PATH` names, such as
          `.venv/bin` and `.mise/bin`
        """
        dropped = {
            "MISE_CONFIG_ROOT",
            "MISE_ORIGINAL_CWD",
            "MISE_PROJECT_ROOT",
            "UV",
            "UV_RUN_RECURSION_DEPTH",
            "VIRTUAL_ENV",
            *checkout.mise.variables
        }
        root = checkout.root.resolve()

        return cls(
            checkout    = checkout,
            environment = {
                name: value
                for name, value in variables.items()
                if name not in dropped and not name.startswith("MISE_TASK_")
            } | {
                "PATH": pathsep.join(
                    folder
                    for folder in variables.get("PATH", "").split(pathsep)
                    if not Path(folder).resolve().is_relative_to(root)
                )
            }
        )

    def tool(self, *command: str | Path, check: bool = True) -> CompletedProcess[str]:
        """
        Runs `command` through `mise exec`, on the tools the tree pins and
        under the variables its `[env]` block sets.
        """
        return self.mise("exec", "--", *command, check=check)
