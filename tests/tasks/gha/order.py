"""
Pins how `gha:order` decides which commit a `♟️ Deploy` run builds and
whether it builds one, the commands it sends GitHub, and the outputs it
writes for the `⏳ Order` job.

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
    ("commit", "resolved"),
    [param(HEAD, HEAD, id="current"), param(HEAD[:7], HEAD, id="current-short")]
)
def test_a_dispatch_on_main_for_its_head_builds_that_commit(
    commit   : str,
    fp       : FakeProcess,
    resolved : str,
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that a run dispatched on `main` for the commit `main` points at,
    whether named by its full hash or a short one, builds the commit it was
    dispatched for and reads no `♟️ Store` runs.
    """
    outputs = tmp_path / "outputs"
    outputs.write_text("earlier=1\n")

    register({"heads/main": HEAD, commit: resolved}, fp)
    task.Deploy(
        commit = commit,
        event  = task.Event.WORKFLOW_DISPATCH,
        ref    = "refs/heads/main"
    ).order(
        outputs
    )

    assert outputs.read_text() == f"earlier=1\ncommit={commit}\nskip=false\n"
    assert [call[1] for call in fp.calls] == ["api", "api"]


@mark.parametrize(
    ("commit", "resolved"),
    [
        param("a1b2c3d", "a1b2c3d4e5f60718293a4b5c6d7e8f9011223344", id="older"),
        param("b2c3d4e", "b2c3d4e5f60718293a4b5c6d7e8f901122334455", id="unmerged")
    ]
)
@mark.parametrize(
    ("count", "skip"),
    [param(0, "false", id="no-store"), param(1, "true", id="store-follows")]
)
def test_a_dispatch_on_main_for_another_commit_builds_the_head_of_main(
    commit   : str,
    count    : int,
    fp       : FakeProcess,
    resolved : str,
    skip     : str,
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that a run dispatched on `main` for any commit other than the
    one `main` points at, older on `main` or on no branch `main` holds,
    builds the commit `main` points at in its place, and skips the build
    exactly where `gh run list` counts a `♟️ Store` push run on that commit,
    which starts a deploy of its own.
    """
    outputs = tmp_path / "outputs"

    register({"heads/main": HEAD, commit: resolved}, fp)
    fp.register(["gh", "run", "list", fp.any()], stdout=f"{count}\n")
    task.Deploy(
        commit = commit,
        event  = task.Event.WORKFLOW_DISPATCH,
        ref    = "refs/heads/main"
    ).order(
        outputs
    )

    assert outputs.read_text() == f"commit={HEAD}\nskip={skip}\n"
    assert list(fp.calls)[-1] == [
        "gh", "run", "list", "--commit", HEAD, "--event", "push",
        "--jq", "length", "--json", "databaseId", "--workflow", "store.yml"
    ]


def register(answers: dict[str, str], fp: FakeProcess):
    """
    Answers the commits API's lookup of each ref in `answers` with the full
    hash it maps to.
    """
    for ref, answer in answers.items():
        fp.register(
            [
                "gh", "api",
                f"repos/{{owner}}/{{repo}}/commits/{ref}",
                "--header", "Accept: application/vnd.github.sha"
            ],
            stdout = answer
        )


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
    Asserts that a push builds its own commit and skips the build exactly
    where `gh run list` counts a `♟️ Store` push run on that commit, and
    never reads `main`.
    """
    outputs = tmp_path / "outputs"

    fp.register(["gh", "run", "list", fp.any()], stdout=f"{count}\n")
    (
        task.Deploy(commit=HEAD, event=task.Event.PUSH, ref="refs/heads/main")
            .order(outputs)
    )

    assert outputs.read_text() == f"commit={HEAD}\nskip={skip}\n"
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

    assert outputs.read_text() == "commit=a1b2c3d\nskip=false\n"
    assert list(fp.calls) == []


def test_a_failed_store_lookup_on_a_dispatch_fails_the_job(
    fp       : FakeProcess,
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that a run dispatched on `main` for an older commit raises where
    the lookup of the `♟️ Store` runs on the commit `main` points at fails,
    rather than building that commit, and writes no output.
    """
    outputs = tmp_path / "outputs"

    register({"a1b2c3d": "a1b2c3d" + "0" * 33, "heads/main": HEAD}, fp)
    fp.register(["gh", "run", "list", fp.any()], returncode=1, stdout="0\n")

    with raises(CalledProcessError):
        task.Deploy(
            commit = "a1b2c3d",
            event  = task.Event.WORKFLOW_DISPATCH,
            ref    = "refs/heads/main"
        ).order(outputs)

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
