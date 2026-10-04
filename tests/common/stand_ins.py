"""
Holds the records the task tests build around stand-in executables, meaning
`Wrapper` and the `StandIn` for `uv` that `tests/tasks/bin.py` runs each
wrapper against, and the `Scratch` checkout `tests/tasks/lock.py` runs each
`lock` task in.
"""

from pathlib    import Path
from pydantic   import BaseModel
from subprocess import CompletedProcess, run


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
    A stand-in `uv` that writes each argument it receives to a log, one per
    line, and exits zero.
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
        return run(
            [wrapper.path, *arguments],
            capture_output = True,
            check          = False,
            cwd            = wrapper.tests,
            text           = True
        )
