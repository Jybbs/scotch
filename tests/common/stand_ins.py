"""
Holds the records the task tests build around stand-in executables, meaning
`Wrapper` and the `StandIn` for `uv` that `tests/tasks/bin.py` runs each
wrapper against, and the `Scratch` checkout `tests/tasks/lock.py` runs each
`lock` task in.
"""

from collections.abc import Sequence
from pathlib         import Path
from pydantic        import BaseModel
from stat            import S_IMODE
from subprocess      import CompletedProcess, run


class Scratch(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    A scratch checkout holding `.mise/mise.lock`, beside the stand-ins the
    `lock` tasks run against and the directory the snapshot of `lock:check`
    lands in.
    """

    project: Path
    """
    The worktree root, whose `.mise/tasks/lock/` holds the tasks and whose
    `.mise/lib/` holds the functions they source.
    """

    root: Path
    """
    The directory holding the checkout, the stand-ins, and the scratch
    directory.
    """

    mode: int = 0o644
    """
    The permission bits the checkout's `.mise/mise.lock` starts with.
    """

    text: str = '[[tools.python]]\nversion = "3.14.6"\n'
    """
    The text the checkout's `.mise/mise.lock` starts with.
    """

    @property
    def calls(self) -> list[str]:
        """
        Reads the call each stand-in logged, in the order the task made
        them.
        """
        return (self.root / "calls.log").read_text().splitlines()

    @property
    def lockfile(self) -> Path:
        """
        Locates `.mise/mise.lock` inside the checkout.
        """
        return self.root / "checkout" / ".mise" / "mise.lock"

    @property
    def pristine(self) -> tuple[str, int, tuple[str, ...]]:
        """
        Pairs the lockfile's starting text and permission bits with an empty
        scratch directory, the residue every `lock:check` run leaves.
        """
        return self.text, self.mode, ()

    @property
    def residue(self) -> tuple[str, int, tuple[str, ...]]:
        """
        Reads the text and the permission bits of the checkout's
        `.mise/mise.lock` beside the name of each file the scratch directory
        still holds, which a run leaves at `pristine` wherever it keeps the
        lockfile whole and cleans its snapshot away.
        """
        return (
            self.lockfile.read_text(),
            S_IMODE(self.lockfile.stat().st_mode),
            tuple(path.name for path in self.scratch.iterdir())
        )

    @property
    def scratch(self) -> Path:
        """
        Locates the directory the stand-in `mktemp` creates the snapshot in.
        """
        return self.root / "tmp"

    @property
    def script(self) -> Path:
        """
        Names the task script `add_script` writes, relative to the checkout,
        as the tasks pass it to `uv`.
        """
        return Path(".mise") / "tasks" / "gha" / "brief.py"

    @property
    def stand_ins(self) -> Path:
        """
        Locates the directory holding the stand-in executables, which the
        task finds first on `PATH`.
        """
        return self.root / "bin"

    def add_script(self):
        """
        Writes a task script into the checkout whose inline metadata
        declares its own dependencies.
        """
        file = self.lockfile.parents[1] / self.script
        file.parent.mkdir(parents=True)
        file.write_text('# /// script\n# dependencies = ["minijinja"]\n# ///\n')

    def run(
        self,
        task : str = "check",
        *,
        mise : str = "exit 0",
        uv   : str = "exit 0"
    ) -> CompletedProcess[str]:
        """
        Runs the `lock` task `task` names from the checkout, against
        stand-in `mise` and `uv` executables that each log their call and
        then run the shell line `mise` or `uv` holds.
        """
        for name, line in {"mise": mise, "uv": uv}.items():
            stand_in = self.stand_ins / name
            stand_in.write_text(
                f'#!/bin/sh\necho "{name} $*" >> "{self.root / "calls.log"}"\n{line}\n'
            )
            stand_in.chmod(0o755)

        return run(
            [self.project / ".mise" / "tasks" / "lock" / task],
            capture_output = True,
            check          = False,
            cwd            = self.lockfile.parents[1],
            text           = True
        )


class Wrapper(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One wrapper, beside the paths it hands `uv run`.
    """

    path: Path
    """
    The wrapper's file.
    """

    @property
    def program(self) -> Path:
        """
        Locates the program of the wrapper's name in the project's `.venv`.
        """
        return self.project / ".venv" / "bin" / self.path.name

    @property
    def project(self) -> Path:
        """
        Resolves the project holding the wrapper, two folders above the one
        it sits in.
        """
        return self.path.parents[2].resolve()

    @property
    def tests(self) -> Path:
        """
        Locates the project's `tests` folder, a subfolder each case calls
        the wrapper from.
        """
        return self.project / "tests"


class StandIn(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    A stand-in for the program `program` names that writes each argument it
    receives to a log, one per line, and exits zero.
    """

    program: str
    """
    The name of the program the stand-in answers for, such as `uv`.
    """

    root: Path
    """
    The directory holding the stand-in and its log.
    """

    @property
    def arguments(self) -> list[str]:
        """
        Reads the arguments the stand-in received, in the order it received
        them.
        """
        return (self.root / "arguments.log").read_text().splitlines()

    def run(self, wrapper: Wrapper, *arguments: str) -> CompletedProcess[str]:
        """
        Runs `wrapper` with `arguments` from the project's `tests` folder.
        """
        return self.start([wrapper.path, *arguments], wrapper.tests)

    def start(self, command: Sequence[str | Path], cwd: Path) -> CompletedProcess[str]:
        """
        Starts `command` from `cwd`, where the stand-in answers for
        `program` wherever the command reaches it by name.
        """
        return run(command, capture_output=True, check=False, cwd=cwd, text=True)
