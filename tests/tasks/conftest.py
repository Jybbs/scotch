"""
Defines the fixtures the task tests share, each described where it is
defined.
"""

from collections.abc  import Callable
from common.stand_ins import Affected, Scratch, StandIn
from os               import pathsep
from pathlib          import Path
from pytest           import Config, MonkeyPatch, TempPathFactory, fixture


@fixture
def stand_in(monkeypatch: MonkeyPatch, tmp_path: Path) -> Callable[..., StandIn]:
    """
    Builds a writer that puts a stand-in for the program it is given into
    `tmp_path`, first on `PATH`, logging each argument the program receives
    and then running the shell line it is given.
    """
    def write(program: str, line: str = "exit 0") -> StandIn:
        """
        Writes the stand-in for `program`, which runs `line` once it has
        logged its arguments.
        """
        path = tmp_path / program
        path.write_text(
            f'#!/bin/sh\nprintf "%s\\n" "$@" > "{tmp_path / "arguments.log"}"\n{line}\n'
        )
        path.chmod(0o755)
        monkeypatch.setenv("PATH", str(tmp_path), prepend=pathsep)

        return StandIn(program=program, root=tmp_path)

    return write


@fixture
def affected(pytestconfig: Config, tmp_path: Path) -> Affected:
    """
    Lays out an `Affected` checkout in `tmp_path`, before any run of
    `py:affected` has recorded its files.
    """
    return Affected.laid(pytestconfig.rootpath, tmp_path)


@fixture(scope="session")
def fingerprint(pytestconfig: Config, tmp_path_factory: TempPathFactory) -> str:
    """
    Runs `py:affected` once in a checkout `Affected.laid` lays out and
    returns the files that full run records, which match what any checkout
    laid out the same way records, since each line names a file by its path
    inside the checkout.
    """
    affected = Affected.laid(pytestconfig.rootpath, tmp_path_factory.mktemp("full"))
    affected.run()

    return affected.recorded.read_text()


@fixture
def recorded(affected: Affected, fingerprint: str) -> Affected:
    """
    Gives the `affected` checkout the files a full run of `py:affected`
    records, as it stands after one.
    """
    affected.recorded.parent.mkdir(parents=True)
    affected.recorded.write_text(fingerprint)

    return affected


@fixture
def scratch(monkeypatch: MonkeyPatch, pytestconfig: Config, tmp_path: Path) -> Scratch:
    """
    Writes a checkout whose `.mise/mise.lock` holds `Scratch.text` at
    `Scratch.mode`, beside a stand-in `mktemp` that creates the snapshot
    inside `Scratch.scratch` at mode `0o600`, the mode `mktemp` itself
    creates a file at. It then puts the stand-ins first on `PATH` and names
    the worktree in `MISE_PROJECT_ROOT`, as `mise run` sets it.
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
