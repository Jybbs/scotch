"""
Pins how `gha:order` decides whether a `♟️ Deploy` run publishes the commit
it builds, the commands it sends GitHub, and the outputs it writes for the
`⏳ Order` job.

Each case loads the script in the test process and answers each command it
runs through pytest-subprocess, so no case reaches GitHub.
"""

from pathlib import Path
from pytest  import mark, param, raises
from pytest_subprocess.fake_process import FakeProcess
from subprocess import CalledProcessError
from types      import ModuleType

HEAD = "9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c"


@mark.parametrize(
    ("commit", "resolved", "head"),
    [
        param(HEAD, HEAD, None, id="current"),
        param(HEAD[:7], HEAD, None, id="current-short"),
        param("a1b2c3d", "a1b2c3d4e5f60718293a4b5c6d7e8f9011223344", HEAD, id="older"),
        param(
            "b2c3d4e",
            "b2c3d4e5f60718293a4b5c6d7e8f901122334455",
            HEAD,
            id = "unmerged"
        )
    ]
)
def test_a_dispatch_on_main_publishes_only_the_commit_main_points_at(
    commit   : str,
    fp       : FakeProcess,
    head     : str | None,
    resolved : str,
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that a run dispatched on `main` publishes the commit it builds
    only where that commit, resolved to its full hash, is the one `main`
    points at, and that any other commit, older on `main` or on no branch
    `main` holds, skips the publish and names the commit `main` points at.
    """
    outputs = tmp_path / "outputs"
    outputs.write_text("earlier=1\n")

    for ref, answer in {"heads/main": HEAD, commit: resolved}.items():
        fp.register(
            [
                "gh", "api",
                f"repos/{{owner}}/{{repo}}/commits/{ref}",
                "--header", "Accept: application/vnd.github.sha"
            ],
            stdout = answer
        )

    task.Deploy(
        commit = commit,
        event  = task.Event.WORKFLOW_DISPATCH,
        ref    = "refs/heads/main"
    ).order(
        outputs
    )

    assert outputs.read_text() == (
        f"earlier=1\nhead={head or ''}\nskip={'true' if head else 'false'}\n"
    )


def test_a_dispatch_on_another_branch_builds_without_a_lookup(
    fp       : FakeProcess,
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that a run dispatched on a branch other than `main` reads no
    commit and skips nothing, so it builds and checks that branch's site,
    which the deploy job then leaves unpublished.
    """
    outputs = tmp_path / "outputs"

    task.Deploy(
        commit = "a1b2c3d",
        event  = task.Event.WORKFLOW_DISPATCH,
        ref    = "refs/heads/50/x"
    ).order(
        outputs
    )

    assert outputs.read_text() == "head=\nskip=false\n"
    assert list(fp.calls) == []


@mark.parametrize(
    ("count", "skip"),
    [param(1, "true", id="store-follows"), param(0, "false", id="no-store")]
)
def test_a_push_leaves_the_publish_to_its_store_run(
    count    : int,
    fp       : FakeProcess,
    skip     : str,
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that a push skips the publish exactly where `gh run list` counts
    a `♟️ Store` push run on the same commit, and never reads `main`.
    """
    outputs = tmp_path / "outputs"

    fp.register(["gh", "run", "list", fp.any()], stdout=f"{count}\n")
    (
        task.Deploy(commit=HEAD, event=task.Event.PUSH, ref="refs/heads/main")
            .order(outputs)
    )

    assert outputs.read_text() == f"head=\nskip={skip}\n"
    assert list(fp.calls) == [
        [
            "gh", "run", "list", "--commit", HEAD, "--event", "push",
            "--jq", "length", "--json", "databaseId", "--workflow", "store.yml"
        ]
    ]


@mark.parametrize(
    ("event", "command"),
    [
        param("push", ("run", "list"), id="store-runs"),
        param("workflow_dispatch", ("api",), id="main")
    ]
)
def test_a_failed_lookup_fails_the_job(
    command  : tuple[str, ...],
    event    : str,
    fp       : FakeProcess,
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that a `gh` lookup that fails, whether of the `♟️ Store` runs or
    of the commit `main` points at, raises rather than deciding the publish,
    and writes no output.
    """
    outputs = tmp_path / "outputs"

    fp.register(["gh", *command, fp.any()], returncode=1, stdout="0\n")

    with raises(CalledProcessError):
        (
            task.Deploy(commit=HEAD, event=task.Event(event), ref="refs/heads/main")
                .order(outputs)
        )

    assert not outputs.exists()


def test_a_ref_github_cannot_resolve_fails_the_job(
    fp       : FakeProcess,
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that a dispatch whose `ref` input names no commit GitHub finds
    raises once `main` is read, rather than reading as a commit behind it,
    and writes no output.
    """
    outputs = tmp_path / "outputs"

    fp.register(["gh", "api", fp.any()], stdout=HEAD)
    fp.register(["gh", "api", fp.any()], returncode=1)

    with raises(CalledProcessError):
        task.Deploy(
            commit = "deadbee",
            event  = task.Event.WORKFLOW_DISPATCH,
            ref    = "refs/heads/main"
        ).order(outputs)

    assert not outputs.exists()


def test_the_run_reads_the_variables_the_step_sets(task: ModuleType):
    """
    Asserts that the run reads the commit it builds, the event, and the ref
    from `COMMIT`, `EVENT`, and `REF`.
    """
    assert task.Deploy.from_environ(
        {
            "COMMIT" : HEAD,
            "EVENT"  : "push",
            "REF"    : "refs/heads/main"
        }
    ) == task.Deploy(commit=HEAD, event=task.Event.PUSH, ref="refs/heads/main")
