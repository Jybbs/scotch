"""
Pins the flags `repo:lint` hands zizmor for each environment it runs in,
meaning the offline audit where no GitHub token is set and the online one
with its cache under `.cache/zizmor` where one is, each printed as plain
diagnostics or as annotations under GitHub Actions.

Each case runs the task through its own shebang from the worktree root with
a stand-in `zizmor` first on `PATH` that logs each argument it receives.
"""

from collections.abc  import Callable
from common.stand_ins import StandIn
from pytest           import Config, MonkeyPatch, mark, param


@mark.parametrize(
    ("token", "reach"),
    [
        param(None, ["--offline"], id="offline"),
        param(
            "GH_TOKEN",
            ["--cache-dir", ".cache/zizmor"],
            id = "online-through-gh-token"
        ),
        param(
            "GITHUB_TOKEN",
            ["--cache-dir", ".cache/zizmor"],
            id = "online-through-github-token"
        )
    ]
)
@mark.parametrize(
    ("actions", "output"),
    [param(False, "plain", id="plain"), param(True, "github", id="github")]
)
def test_the_lint_audits_online_only_under_a_token(
    actions      : bool,
    monkeypatch  : MonkeyPatch,
    output       : str,
    pytestconfig : Config,
    reach        : list[str],
    stand_in     : Callable[[str], StandIn],
    token        : str | None
):
    """
    Asserts that `repo:lint` runs zizmor offline where neither `GH_TOKEN`
    nor `GITHUB_TOKEN` is set, and online with its HTTP cache under
    `.cache/zizmor` where either is, printing plain diagnostics outside
    GitHub Actions and annotations under it.
    """
    zizmor = stand_in("zizmor")

    for name in ("GH_TOKEN", "GITHUB_ACTIONS", "GITHUB_TOKEN"):
        monkeypatch.delenv(name, raising=False)

    if token:
        monkeypatch.setenv(token, "secret")

    if actions:
        monkeypatch.setenv("GITHUB_ACTIONS", "true")

    result = zizmor.start(
        [pytestconfig.rootpath / ".mise" / "tasks" / "repo" / "lint"],
        pytestconfig.rootpath
    )

    expected = (
        [
            "--format", output,
            *reach,
            "."
        ] if token is None else [*reach, "--format", output, "."]
    )

    assert result.returncode == 0
    assert zizmor.arguments == expected
