"""
Pins the path `gha:cut` takes for each version it reads and each release it
finds, the commands it sends GitHub on each path, and the outputs it writes
for the gate's summary.

Each case loads the script in the test process and answers each command it
runs through pytest-subprocess, so no case reaches git or GitHub.
"""

from collections.abc import Callable
from common.tasks    import mirror
from pathlib         import Path
from pytest          import CaptureFixture, Metafunc, mark, param, raises
from pytest_subprocess.fake_process import FakeProcess
from types import ModuleType


def pytest_generate_tests(metafunc: Metafunc):
    """
    Parametrizes every case taking `state` over the members of the script's
    `State`.
    """
    if "state" in metafunc.fixturenames:
        states = mirror(metafunc.config.rootpath, metafunc.definition.path).State
        metafunc.parametrize(
            "state",
            [param(state.value, id=state.value) for state in states]
        )


@mark.parametrize(
    ("previous", "dispatched", "draft", "path"),
    [
        param("0.2.0", False, None, "unchanged", id="unchanged"),
        param("0.2.0", False, True, "unchanged", id="unchanged-beside-a-draft"),
        param("0.1.0", False, None, "created", id="moved"),
        param("0.2.0", True, None, "created", id="dispatched"),
        param("0.1.0", False, True, "kept", id="draft"),
        param("0.1.0", False, False, "published", id="published")
    ]
)
def test_the_cut_takes_its_path_from_the_version_and_the_release(
    dispatched : bool,
    draft      : bool | None,
    path       : str,
    previous   : str,
    task       : ModuleType
):
    """
    Asserts that a version that did not move on a push takes the unchanged
    path whatever release exists, and that a moved version, or any version
    on a run started by hand, takes the created, kept, or published path for
    no release, a draft, or a published release.
    """
    cut   = task.Cut(current="0.2.0", dispatched=dispatched, previous=previous)
    found = None if draft is None else task.Release(
        draft = draft,
        url   = "https://example.test/0.2.0"
    )

    assert cut.state(found) == path


@mark.parametrize("event", ["push", "workflow_dispatch"])
def test_the_versions_come_from_head_and_the_commit_before_it(
    event    : str,
    fp       : FakeProcess,
    task     : ModuleType,
    versions : Callable[[str, str], None]
):
    """
    Asserts that the cut reads `[project].version` at `HEAD` and at
    `HEAD~1`, and reads a run started through `workflow_dispatch` as started
    by hand.
    """
    versions("0.2.0", "0.1.0")

    assert task.Cut.from_git(event) == task.Cut(
        current    = "0.2.0",
        dispatched = event == "workflow_dispatch",
        previous   = "0.1.0"
    )
    assert list(fp.calls) == [
        ["git", "show", "HEAD:pyproject.toml"],
        ["git", "show", "HEAD~1:pyproject.toml"]
    ]


@mark.parametrize(
    ("draft", "json"),
    [param(True, "true", id="draft"), param(False, "false", id="published")]
)
def test_a_release_gh_finds_reads_as_a_record(
    draft : bool,
    fp    : FakeProcess,
    json  : str,
    task  : ModuleType
):
    """
    Asserts that a release `gh release view` reports reads as whether it is
    a draft and its address.
    """
    fp.register(
        ["gh", "release", "view", "0.2.0", "--json", "isDraft,url"],
        stdout = f'{{"isDraft": {json}, "url": "https://example.test/0.2.0"}}'
    )

    assert task.Release.find("0.2.0") == task.Release(
        draft = draft,
        url   = "https://example.test/0.2.0"
    )


def test_a_draft_is_created_with_generated_notes_targeting_main(
    fp   : FakeProcess,
    task : ModuleType
):
    """
    Asserts that the draft is created with GitHub's generated notes, titled
    with the bare version and targeting `main`, at the address `gh` prints.
    """
    fp.register(
        ["gh", "release", "create", fp.any()],
        stdout = "https://example.test/untagged-1\n"
    )

    assert task.Release.create("0.2.0") == task.Release(
        draft = True,
        url   = "https://example.test/untagged-1"
    )
    assert list(fp.calls) == [
        [
            "gh", "release", "create", "0.2.0", "--draft",
            "--generate-notes", "--target", "main", "--title", "0.2.0"
        ]
    ]


def test_a_moved_version_a_draft_carries_keeps_the_draft(
    fp   : FakeProcess,
    task : ModuleType
):
    """
    Asserts that the cut of a moved version a draft already carries reports
    that draft and creates none.
    """
    fp.register(
        ["gh", "release", "view", "0.2.0", "--json", "isDraft,url"],
        stdout = '{"isDraft": true, "url": "https://example.test/0.2.0"}'
    )

    assert task.Cut(
        current    = "0.2.0",
        dispatched = False,
        previous   = "0.1.0"
    ).outcome() == task.Outcome(
        release = task.Release(draft=True, url="https://example.test/0.2.0"),
        state   = "kept",
        version = "0.2.0"
    )
    assert len(fp.calls) == 1


def test_a_read_failing_for_another_reason_stops_the_cut(
    fp   : FakeProcess,
    task : ModuleType
):
    """
    Asserts that `gh release view` failing for any reason but an absent
    release ends the run on its message, since a second create would leave
    two drafts for one version.
    """
    fp.register(
        ["gh", "release", "view", "0.2.0", "--json", "isDraft,url"],
        returncode = 1,
        stderr     = "HTTP 502: Bad Gateway\n"
    )

    with raises(SystemExit, match="HTTP 502"):
        task.Release.find("0.2.0")


def test_a_version_no_release_carries_gets_a_draft(fp: FakeProcess, task: ModuleType):
    """
    Asserts that the cut of a moved version no release carries looks the
    release up, then creates the draft and reports it.
    """
    fp.register(
        ["gh", "release", "view", "0.2.0", "--json", "isDraft,url"],
        returncode = 1,
        stderr     = "release not found\n"
    )
    fp.register(
        ["gh", "release", "create", fp.any()],
        stdout = "https://example.test/untagged-1\n"
    )

    assert task.Cut(
        current    = "0.2.0",
        dispatched = False,
        previous   = "0.1.0"
    ).outcome() == task.Outcome(
        release = task.Release(draft=True, url="https://example.test/untagged-1"),
        state   = "created",
        version = "0.2.0"
    )


def test_a_version_that_did_not_move_asks_github_nothing(
    fp   : FakeProcess,
    task : ModuleType
):
    """
    Asserts that the cut of a version that did not move reads no release and
    creates none.
    """
    outcome = task.Cut(current="0.2.0", dispatched=False, previous="0.2.0").outcome()

    assert (outcome.state, outcome.release) == ("unchanged", None)
    assert list(fp.calls) == []


def test_an_absent_release_reads_as_none(fp: FakeProcess, task: ModuleType):
    """
    Asserts that the version no release carries, which `gh` reports as not
    found, reads as `None`.
    """
    fp.register(
        ["gh", "release", "view", "0.2.0", "--json", "isDraft,url"],
        returncode = 1,
        stderr     = "release not found\n"
    )

    assert task.Release.find("0.2.0") is None


def test_the_outputs_name_the_path_the_address_and_the_version(
    capsys   : CaptureFixture[str],
    state    : str,
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that each outcome appends its `state`, `url`, and `version`
    outputs after whatever the file already holds, with an empty `url` where
    no release was reached, and prints a warning annotation only where a
    published release already carries the version.
    """
    outputs = tmp_path / "outputs"
    outputs.write_text("earlier=1\n")
    url     = "" if state == "unchanged" else "https://example.test/0.2.0"
    release = task.Release(draft=True, url=url) if url else None
    outcome = task.Outcome(release=release, state=task.State(state), version="0.2.0")
    outcome.write(outputs)

    assert outputs.read_text() == "\n".join(
        ["earlier=1", f"state={state}", f"url={url}", "version=0.2.0", ""]
    )
    assert capsys.readouterr().out == (
        f"::warning::The published release {url} already carries 0.2.0\n"
        if state == "published" else ""
    )
