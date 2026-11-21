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
    Builds a registrar answering `gh cache list` with the entries it is
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
def objects(fp: FakeProcess) -> Callable[..., None]:
    """
    Builds a registrar answering `aws s3api list-objects-v2` with the
    objects it is given, each a key and the instant R2 last wrote it, as the
    command's `--query` prints them, and `null` where it is given none.
    """
    def register(*entries: tuple[str, str]):
        """
        Registers the listing of `entries`.
        """
        fp.register(
            ["aws", "s3api", "list-objects-v2", fp.any()],
            stdout = dumps(
                [{"key": key, "modified": modified} for key, modified in entries]
                or None
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
def created(fp: FakeProcess):
    """
    Answers `gh release create` with the address of the new draft.
    """
    fp.register(
        ["gh", "release", "create", fp.any()],
        stdout = "https://example.test/untagged-1\n"
    )


@fixture
def refreshed(fp: FakeProcess) -> list[str]:
    """
    Answers the `generate-notes` call with fresh notes and `gh release edit`
    with the draft's new address.

    Returns:
        The notes `gh release edit` reads from its standard input.
    """
    notes = []
    fp.register(
        ["gh", "api", "repos/{owner}/{repo}/releases/generate-notes", fp.any()],
        stdout = "Fresh notes\n"
    )
    fp.register(
        ["gh", "release", "edit", "0.2.0", "--notes-file", "-"],
        stdin_callable = notes.append,
        stdout         = "https://example.test/untagged-2\n"
    )
    return notes


@fixture
def viewed(fp: FakeProcess) -> Callable[..., None]:
    """
    Builds a registrar answering `gh release view` for `0.2.0` with a
    release, or failing on the `stderr` it is given.
    """
    def register(
        *,
        draft  : bool = True,
        stderr : str  = "",
        target : str  = "main",
        url    : str  = ""
    ):
        """
        Registers the release whose draft flag is `draft`, targeting
        `target` at `url`, or a failure printing `stderr` where one is
        given.
        """
        fp.register(
            ["gh", "release", "view", "0.2.0", "--json", "isDraft,targetCommitish,url"],
            returncode = 1 if stderr else 0,
            stderr     = stderr,
            stdout     = dumps(
                {"isDraft": draft, "targetCommitish": target, "url": url}
            )
        )

    return register


@fixture
def from_root(monkeypatch: MonkeyPatch, pytestconfig: Config):
    """
    Runs the test from the worktree root, the directory a gate runs its
    task from.
    """
    monkeypatch.chdir(pytestconfig.rootpath)
