"""
Holds the fixtures the task tests share, each described where it is defined.
"""

from common.stand_ins import Scratch, StandIn
from os               import pathsep
from pathlib          import Path
from pytest           import Config, MonkeyPatch, fixture


@fixture
def stand_in(monkeypatch: MonkeyPatch, tmp_path: Path) -> StandIn:
    """
    Writes the stand-in `uv` into `tmp_path` and puts it first on `PATH`.
    """
    uv = tmp_path / "uv"
    uv.write_text(f'#!/bin/sh\nprintf "%s\\n" "$@" > "{tmp_path / "arguments.log"}"\n')
    uv.chmod(0o755)
    monkeypatch.setenv("PATH", str(tmp_path), prepend=pathsep)

    return StandIn(root=tmp_path)


@fixture
def scratch(monkeypatch: MonkeyPatch, pytestconfig: Config, tmp_path: Path) -> Scratch:
    """
    Writes a checkout whose `.mise/mise.lock` holds `Scratch.text` at mode
    `0o644`, beside a stand-in `mktemp` that creates the snapshot inside
    `Scratch.scratch` at mode `0o600`, the mode `mktemp` itself creates a
    file at, and puts the stand-ins first on `PATH` and names the worktree
    in `MISE_PROJECT_ROOT`, as `mise run` sets it.
    """
    scratch = Scratch(project=pytestconfig.rootpath, root=tmp_path)
    scratch.lockfile.parent.mkdir(parents=True)
    scratch.lockfile.write_text(scratch.text)
    scratch.lockfile.chmod(0o644)
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
