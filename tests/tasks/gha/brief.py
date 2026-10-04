"""
Pins the summary `gha:brief` writes for each workflow from the `needs`
context the gate passes, the template it falls back to, and the status the
gate exits with for the results it reads.

Each case loads the script in the test process and runs from the worktree
root, so the summary renders from the templates a workflow run reads.
"""

from collections.abc  import Iterable
from json             import dumps
from pathlib          import Path
from pytest           import mark, param
from syrupy.assertion import SnapshotAssertion
from types            import ModuleType

pytestmark = mark.usefixtures("from_root")


def test_the_run_reads_the_variables_the_gate_sets(task: ModuleType):
    """
    Asserts that the run reads the pull request's head branch, falling back
    to the ref's name on any other event, the commit `COMMIT` names, falling
    back to the one the runner checked out, the workflow's file stem, and
    each job's result and outputs.
    """
    needs = {
        "check": {
            "result"  : "success",
            "outputs" : {"coverage": "https://example.test/1"}
        }
    }
    run = task.Run.from_environ(variables("ci", needs=needs))

    assert (run.branch, run.workflow) == ("4/ci-gate", "ci")
    assert run.commit.startswith("560c4d8")
    assert task.Run.from_environ(
        {**variables("ci", needs=needs), "COMMIT": ""}
    ).commit.startswith("0f1e2d3")
    assert run.needs["check"].outputs == {"coverage": "https://example.test/1"}
    assert task.Run.from_environ(
        variables("ci", head="", needs=needs)
    ).branch == "main"


def test_the_summary_is_appended_after_what_the_file_holds(
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that the summary is appended to the file the runner collects it
    from, after whatever the file already holds.
    """
    summary = tmp_path / "summary.md"
    summary.write_text("earlier\n")
    run = task.Run.from_environ(
        variables("warm", needs={"kit": {"result": "success", "outputs": {}}})
    )
    run.write(summary)

    assert summary.read_text() == "earlier\n" + run.render()


@mark.parametrize(
    ("results", "passed"),
    [
        param(["success", "skipped"], True, id="success-and-skipped"),
        param(["success", "failure"], False, id="failure"),
        param(["success", "cancelled"], False, id="cancelled")
    ]
)
def test_the_gate_passes_only_where_every_job_succeeded_or_was_skipped(
    task    : ModuleType,
    passed  : bool,
    results : Iterable[str]
):
    """
    Asserts that the run passes, and the gate exits zero, where every job
    succeeded or was skipped, and fails with status 1 where any job failed
    or was canceled.
    """
    needs = {f"job{index}": {
        "result"  : result,
        "outputs" : {}
    } for index, result in enumerate(
        results
    )}

    run = task.Run.from_environ(variables("warm", needs=needs))

    assert run.passed is passed
    assert run.status == int(not passed)


@mark.parametrize(
    ("workflow", "needs"),
    [
        param(
            "ci",
            {
                "check": {
                    "result"  : "failure",
                    "outputs" : {"coverage": "https://example.test/artifacts/1"}
                }
            },
            id = "ci-with-coverage"
        ),
        param(
            "ci",
            {"check": {"result": "cancelled", "outputs": {}}},
            id = "ci-without-coverage"
        ),
        *(
            param(
                "draft",
                {
                    "draft": {
                        "result"  : "success",
                        "outputs" : {
                            "state"   : state,
                            "url"     : "https://example.test/0.2.0",
                            "version" : "0.2.0"
                        }
                    }
                },
                id = f"draft-{state}"
            )
            for state in ("created", "kept", "published", "unchanged")
        ),
        param(
            "warm",
            {
                "kit"   : {"result": "success", "outputs": {}},
                "prune" : {"result": "success", "outputs": {}}
            },
            id = "warm"
        )
    ]
)
def test_the_summary_renders_from_the_workflows_template(
    task     : ModuleType,
    needs    : dict[str, dict[str, object]],
    snapshot : SnapshotAssertion,
    workflow : str
):
    """
    Asserts that each workflow's summary renders from the template named for
    its file, or from `base.md.j2` where none is, as the fixture file holds
    it, so a change to what a summary says is reviewed as a diff.
    """
    assert task.Run.from_environ(variables(workflow, needs=needs)).render() == snapshot


def variables(
    workflow : str,
    *,
    needs    : dict[str, dict[str, object]],
    head     : str = "4/ci-gate"
) -> dict[str, str]:
    """
    Builds the variables the runner and the gate's step set for a run of
    `workflow` whose gate waited on `needs`, on the pull request branch
    `head`, or on `main` where `head` is empty.
    """
    return {
        "COMMIT"              : "560c4d8009a5ba8e15cd0b3b5be1b7d3cc19ab1f",
        "GITHUB_HEAD_REF"     : head,
        "GITHUB_REF_NAME"     : "main",
        "GITHUB_SHA"          : "0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c",
        "GITHUB_WORKFLOW_REF" :
            f"Jybbs/scotch/.github/workflows/{workflow}.yml@refs/heads/main",
        "NEEDS"               : dumps(needs)
    }
