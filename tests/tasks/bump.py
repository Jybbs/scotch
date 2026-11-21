"""
Pins the `uv version` call `repo:bump` makes for each part of the version
it moves, which writes the next version into `pyproject.toml` and relocks
`uv.lock` with `UV_LOCKED` lifted.

Each case runs the task through its own shebang from the worktree root with
a stand-in `uv` first on `PATH` that logs each argument it receives.
"""

from collections.abc  import Callable
from common.stand_ins import StandIn
from pytest           import Config, mark


@mark.parametrize("part", ["major", "minor", "patch"])
def test_the_bump_moves_the_part_it_names_and_relocks(
    part         : str,
    pytestconfig : Config,
    stand_in     : Callable[..., StandIn]
):
    """
    Asserts that `repo:bump` hands `uv version` the part it was given
    through `--bump`, beside `--no-locked` so the write to `uv.lock` lands,
    and exits as `uv` does.
    """
    uv     = stand_in("uv")
    result = uv.start(
        [pytestconfig.rootpath / ".mise" / "tasks" / "repo" / "bump", part],
        pytestconfig.rootpath
    )

    assert result.returncode == 0
    assert uv.arguments == ["version", "--bump", part, "--no-locked"]


def test_a_failing_bump_fails_the_task(
    pytestconfig : Config,
    stand_in     : Callable[..., StandIn]
):
    """
    Asserts that `repo:bump` exits nonzero where `uv version` does, so a
    bump `uv` refuses never reads as done.
    """
    assert stand_in("uv", "exit 2").start(
        [pytestconfig.rootpath / ".mise" / "tasks" / "repo" / "bump", "patch"],
        pytestconfig.rootpath
    ).returncode == 2
