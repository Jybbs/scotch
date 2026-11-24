"""
Defines the fixtures the tests of `scotch.pins` share, each described where
it is defined.
"""

from collections.abc import Callable
from common.sample   import Sample
from json            import dumps
from pytest          import FixtureRequest, fixture
from pytest_subprocess.fake_popen   import FakePopen
from pytest_subprocess.fake_process import FakeProcess

from scotch.pins.trees import Tree


@fixture
def tree(sample: Sample) -> Tree:
    """
    Opens the tree over the sample checkout, every command run there
    starting with `PATH` alone.
    """
    return Tree(checkout=sample.checkout, environment={"PATH": "/usr/bin:/bin"})


@fixture
def locks(fp: FakeProcess, tree: Tree) -> Callable[..., None]:
    """
    Answers each `uv lock` a lift of the Python packages runs in a scratch
    project through the function it returns, the one upgrading `uv.lock`
    with `upgrade` and the one resolving the pins no lockfile holds with
    `resolve`.
    """
    lock = [
        "mise", "-C", tree.root, "exec", "--",
        "uv", "lock", "--no-locked", "--no-python-downloads", "--project",
        fp.any(max=1, min=1)
    ]

    def answer(
        resolve : Callable[[FakePopen], None],
        upgrade : Callable[[FakePopen], None]
    ):
        """
        Registers both commands.
        """
        fp.register([*lock, "--upgrade"], callback=upgrade)
        fp.register(lock, callback=resolve)

    return answer


@fixture
def outdated(fp: FakeProcess, tree: Tree) -> Callable[..., None]:
    """
    Answers `mise outdated` through the function it returns with each tool a
    case names beside the version requested and the latest, requested by the
    checkout's own config unless `elsewhere` names the tool.
    """
    def answer(elsewhere: tuple[str, ...] = (), **tools: tuple[str, str]):
        """
        Registers the listing of `tools`.
        """
        fp.register(
            ["mise", "-C", tree.root, "outdated", "--bump", "--json", "--local"],
            stdout = dumps(
                {
                    name: {
                        "latest"    : latest,
                        "requested" : requested,
                        "source"    : {
                            "path": "/elsewhere/mise.toml"
                            if name in elsewhere
                            else str(tree.root / ".mise" / "config.toml")
                        }
                    }
                    for name, (requested, latest) in tools.items()
                }
            )
        )

    return answer


@fixture
def releases(fp: FakeProcess, tree: Tree) -> Callable[..., None]:
    """
    Answers `mise ls-remote` through the function it returns with the
    releases of one tool.
    """
    def answer(tool: str, *listed: dict[str, object]):
        """
        Registers the releases of `tool`.
        """
        fp.register(
            ["mise", "-C", tree.root, "ls-remote", "--json", tool],
            stdout = dumps(listed)
        )

    return answer


@fixture
def relocks(fp: FakeProcess, request: FixtureRequest, tree: Tree) -> list[list[str]]:
    """
    Registers each command a lift of `uv` runs in the tree, upgrading
    `minijinja` as well where the case's `upgraded` parameter is set, the
    command whose last word the fixture's own parameter names exiting 1, and
    returns them in the order the lift runs them.
    """
    commands = [
        ["mise", "-C", str(tree.root), *step]
        for step in (
            ["lock"],
            ["install"],
            [
                "exec", "--", "uv", "lock", "--no-locked",
                *(
                    ["--upgrade-package", "minijinja"]
                    if request.getfixturevalue("upgraded")
                    else []
                )
            ],
            ["run", "lock:sync"],
            ["exec", "--", "bun", "update", "--cwd=docs", "--lockfile-only"],
            ["run", "docs:render"],
            ["run", "repo:audit"]
        )
    ]

    for command in commands:
        fp.register(command, returncode=int(command[-1] == request.param))

    return commands
