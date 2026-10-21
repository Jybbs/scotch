"""
Pins what `gha:total` writes for the published site, meaning the total the
package's suite covered as a whole number in `coverage.json` inside the
folder it is given, read through `coverage report` from the data the suite
wrote.

Each case runs the task through its own shebang from the worktree root with
a stand-in `coverage` first on `PATH` that logs each argument it receives
and prints a total.
"""

from collections.abc  import Callable
from common.stand_ins import StandIn
from pathlib          import Path
from pytest           import Config


def test_the_task_writes_the_total_coverage_reports_as_a_whole_number(
    pytestconfig : Config,
    stand_in     : Callable[..., StandIn],
    tmp_path     : Path
):
    """
    Asserts that the task runs `coverage report` for the total alone at no
    decimal places and writes what it prints into `coverage.json` in the
    folder given, creating the folder, as the bare number the README's badge
    reads.
    """
    coverage = stand_in("coverage", "echo 97")
    out      = tmp_path / "out"

    result = coverage.start(
        [pytestconfig.rootpath / ".mise" / "tasks" / "gha" / "total", out],
        pytestconfig.rootpath
    )

    assert result.returncode == 0
    assert coverage.arguments == ["report", "--format=total", "--precision=0"]
    assert (out / "coverage.json").read_text() == "97\n"
