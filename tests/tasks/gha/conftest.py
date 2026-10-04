"""
Holds the fixtures the tests of the `gha` task scripts share, each described
where it is defined.
"""

from collections.abc import Callable
from common.tasks    import mirror
from json            import dumps
from pytest          import Config, FixtureRequest, MonkeyPatch, fixture
from pytest_subprocess.fake_process import FakeProcess
from types import ModuleType


@fixture
def listing(fp: FakeProcess) -> Callable[..., None]:
    """
    Returns a registrar answering `gh cache list` with the entries it is
    given, each an id, a key, a ref, and the instant it was saved, as the
    command's `--jq` filter prints them.
    """
    def register(*entries: tuple[int, str, str, str]):
        """
        Registers the listing of `entries`.
        """
        fp.register(
            ["gh", "cache", "list", fp.any()],
            stdout = dumps(
                [
                    {
                        "created" : created,
                        "id"      : number,
                        "key"     : key,
                        "ref"     : ref
                    }
                    for number, key, ref, created in entries
                ]
            )
        )

    return register


@fixture
def task(request: FixtureRequest) -> ModuleType:
    """
    Imports the task script the requesting test module mirrors.
    """
    return mirror(request.config.rootpath, request.path)


@fixture
def versions(fp: FakeProcess) -> Callable[[str, str], None]:
    """
    Returns a registrar answering `git show` for `pyproject.toml`
    at `HEAD` and at `HEAD~1` with the two versions it is given as
    `[project].version`.
    """
    def register(current: str, previous: str):
        """
        Registers `current` at `HEAD` and `previous` at `HEAD~1`.
        """
        for ref, version in {"HEAD": current, "HEAD~1": previous}.items():
            fp.register(
                ["git", "show", f"{ref}:pyproject.toml"],
                stdout = f'[project]\nname = "scotch"\nversion = "{version}"\n'
            )

    return register


@fixture
def from_root(monkeypatch: MonkeyPatch, pytestconfig: Config):
    """
    Runs the test from the worktree root, the directory a gate runs its
    task from.
    """
    monkeypatch.chdir(pytestconfig.rootpath)
