"""
Defines the fixtures the tests of `scotch.pins` share, each described where
it is defined.
"""

from common.sample import Sample
from pytest        import FixtureRequest, fixture
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
            ["run", "docs:render"],
            ["run", "repo:audit"]
        )
    ]

    for command in commands:
        fp.register(command, returncode=int(command[-1] == request.param))

    return commands
