"""
Defines the fixtures the task tests share, each described where it is
defined.
"""

from collections.abc  import Callable
from common.stand_ins import Affected, Launcher, Scratch, StandIn
from pathlib          import Path
from pytest           import Config, MonkeyPatch, TempPathFactory, fixture


@fixture(scope="session")
def launcher(tmp_path_factory: TempPathFactory) -> Launcher:
    """
    Writes, once for the session, the `Launcher` every stand-in links to.
    """
    return Launcher.written(tmp_path_factory.mktemp("launcher"))


@fixture
def stand_in(
    launcher    : Launcher,
    monkeypatch : MonkeyPatch,
    tmp_path    : Path
) -> Callable[..., StandIn]:
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
        launcher.link(
            tmp_path,
            program,
            f'printf "%s\\n" "$@" > "{tmp_path / "arguments.log"}"\n{line}\n'
        )
        for name, value in launcher.environment(tmp_path).items():
            monkeypatch.setenv(name, value)

        return StandIn(program=program, root=tmp_path)

    return write


@fixture
def affected(launcher: Launcher, pytestconfig: Config, tmp_path: Path) -> Affected:
    """
    Lays out an `Affected` checkout in `tmp_path`, before any run of
    `py:affected` has recorded its files.
    """
    return Affected.laid(launcher, pytestconfig.rootpath, tmp_path)


@fixture(scope="session")
def fingerprint(
    launcher         : Launcher,
    pytestconfig     : Config,
    tmp_path_factory : TempPathFactory
) -> str:
    """
    Runs `py:affected` once in a checkout `Affected.laid` lays out and
    returns the files that full run records, which match what any checkout
    laid out the same way records, since each line names a file by its path
    inside the checkout.
    """
    affected = Affected.laid(
        launcher,
        pytestconfig.rootpath,
        tmp_path_factory.mktemp("full")
    )
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
def scratch(
    launcher     : Launcher,
    monkeypatch  : MonkeyPatch,
    pytestconfig : Config,
    tmp_path     : Path
) -> Scratch:
    """
    Writes a checkout whose `.mise/mise.lock` holds `Scratch.text` at
    `Scratch.mode`, beside a stand-in `mktemp` that creates the snapshot
    inside `Scratch.scratch` at mode `0o600`, the mode `mktemp` itself
    creates a file at. It then puts the stand-ins first on `PATH` and names
    the worktree in `MISE_PROJECT_ROOT`, as `mise run` sets it.
    """
    scratch = Scratch(launcher=launcher, project=pytestconfig.rootpath, root=tmp_path)
    scratch.lockfile.parent.mkdir(parents=True)
    scratch.lockfile.write_text(scratch.text)
    scratch.lockfile.chmod(scratch.mode)
    scratch.scratch.mkdir()
    scratch.stand_ins.mkdir()
    snapshot = scratch.scratch / "snapshot"
    launcher.link(
        scratch.stand_ins,
        "mktemp",
        f': > "{snapshot}"\nchmod 600 "{snapshot}"\necho "{snapshot}"\n'
    )
    monkeypatch.setenv("MISE_PROJECT_ROOT", str(scratch.project))
    for name, value in launcher.environment(scratch.stand_ins).items():
        monkeypatch.setenv(name, value)

    return scratch
