"""
Holds the fixtures the task tests share, each described where it is defined.
"""

from collections.abc  import Callable
from common.stand_ins import Scratch, StandIn
from os               import pathsep
from pathlib          import Path
from pytest           import Config, MonkeyPatch, fixture


@fixture
def stand_in(monkeypatch: MonkeyPatch, tmp_path: Path) -> Callable[[str], StandIn]:
    """
    Returns a writer that puts a stand-in for the program it is given into
    `tmp_path`, first on `PATH`, logging each argument the program receives.
    """
    def write(program: str) -> StandIn:
        """
        Writes the stand-in for `program`.
        """
        path = tmp_path / program
        path.write_text(
            f'#!/bin/sh\nprintf "%s\\n" "$@" > "{tmp_path / "arguments.log"}"\n'
        )
        path.chmod(0o755)
        monkeypatch.setenv("PATH", str(tmp_path), prepend=pathsep)

        return StandIn(program=program, root=tmp_path)

    return write


@fixture
def scratch(monkeypatch: MonkeyPatch, pytestconfig: Config, tmp_path: Path) -> Scratch:
    """
    Writes a checkout whose `.mise/mise.lock` holds `Scratch.text` at
    `Scratch.mode`, beside a stand-in `mktemp` that creates the snapshot
    inside `Scratch.scratch` at mode `0o600`, the mode `mktemp` itself
    creates a file at, and puts the stand-ins first on `PATH` and names the
    worktree in `MISE_PROJECT_ROOT`, as `mise run` sets it.
    """
    scratch = Scratch(project=pytestconfig.rootpath, root=tmp_path)
    scratch.lockfile.parent.mkdir(parents=True)
    scratch.lockfile.write_text(scratch.text)
    scratch.lockfile.chmod(scratch.mode)
    scratch.scratch.mkdir()
    scratch.stand_ins.mkdir()
    snapshot = scratch.scratch / "snapshot"
    mktemp   = scratch.stand_ins / "mktemp"
    mktemp.write_text(
        f'#!/bin/sh\n: > "{snapshot}"\nchmod 600 "{snapshot}"\necho "{snapshot}"\n'
    )
    mktemp.chmod(0o755)
    monkeypatch.setenv("MISE_PROJECT_ROOT", str(scratch.project))
    monkeypatch.setenv("PATH", str(scratch.stand_ins), prepend=pathsep)

    return scratch
