"""
Pins the output format `repo:audit` hands `scotch audit repo`, plain text
outside GitHub Actions and annotations under it.

Each case runs the task through its own shebang from the worktree root with
a stand-in `scotch` first on `PATH` that logs each argument it receives.
"""

from collections.abc  import Callable
from common.stand_ins import StandIn
from pytest           import Config, MonkeyPatch, mark, param


@mark.parametrize(
    ("actions", "output"),
    [
        param(None, "text", id="text-outside-actions"),
        param("true", "github", id="github-under-actions")
    ]
)
def test_the_audit_prints_annotations_only_under_actions(
    actions      : str | None,
    monkeypatch  : MonkeyPatch,
    output       : str,
    pytestconfig : Config,
    stand_in     : Callable[[str], StandIn]
):
    """
    Asserts that `repo:audit` runs `scotch audit repo` with the text output
    format where `GITHUB_ACTIONS` is unset and the GitHub one where the
    runner sets it.
    """
    scotch = stand_in("scotch")
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)

    if actions:
        monkeypatch.setenv("GITHUB_ACTIONS", actions)

    result = scotch.start(
        [pytestconfig.rootpath / ".mise" / "tasks" / "repo" / "audit"],
        pytestconfig.rootpath
    )

    assert result.returncode == 0
    assert scotch.arguments == ["audit", "repo", "--output-format", output]
