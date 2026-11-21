"""
Pins the path `gha:cut` takes for each release it finds carrying the
version, the commands it sends GitHub on each path, and the outputs it
writes for the gate's summary.

Each case loads the script in the test process and answers each command it
runs through pytest-subprocess, so no case reaches GitHub.
"""

from common.tasks import mirror
from contextlib   import nullcontext
from pathlib      import Path
from pytest       import CaptureFixture, Metafunc, fixture, param, raises
from pytest_subprocess.fake_process import FakeProcess
from types import ModuleType

VIEW = ["gh", "release", "view", "0.2.0", "--json", "isDraft,targetCommitish,url"]


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


@fixture
def created(fp: FakeProcess):
    """
    Answers `gh release create` with the address of the new draft.
    """
    fp.register(
        ["gh", "release", "create", fp.any()],
        stdout = "https://example.test/untagged-1\n"
    )


@fixture
def refreshed(fp: FakeProcess):
    """
    Answers the `generate-notes` call with fresh notes and `gh release edit`
    with the draft's new address.
    """
    fp.register(
        ["gh", "api", "repos/{owner}/{repo}/releases/generate-notes", fp.any()],
        stdout = "Fresh notes\n"
    )
    fp.register(
        ["gh", "release", "edit", "0.2.0", "--notes-file", "-"],
        stdout = "https://example.test/untagged-2\n"
    )


def test_a_draft_is_created_with_generated_notes_targeting_main(
    created : None,
    fp      : FakeProcess,
    task    : ModuleType
):
    """
    Asserts that the draft is created with GitHub's generated notes, titled
    with the bare version and targeting `main`, at the address `gh` prints.
    """
    assert task.Release.create("0.2.0") == task.Release(
        draft  = True,
        target = "main",
        url    = "https://example.test/untagged-1"
    )
    assert list(fp.calls) == [
        [
            "gh", "release", "create", "0.2.0", "--draft",
            "--generate-notes", "--target", "main", "--title", "0.2.0"
        ]
    ]


def test_a_draft_refreshed_takes_the_notes_github_generates_now(
    fp        : FakeProcess,
    refreshed : None,
    task      : ModuleType
):
    """
    Asserts that a refresh asks GitHub for the notes of the version at the
    draft's own target, sends them as the draft's notes and nothing else,
    and reads the address `gh release edit` prints.
    """
    draft = task.Release(draft=True, target="main", url="https://example.test/old")

    assert draft.refresh("0.2.0") == task.Release(
        draft  = True,
        target = "main",
        url    = "https://example.test/untagged-2"
    )
    assert list(fp.calls) == [
        [
            "gh", "api", "repos/{owner}/{repo}/releases/generate-notes",
            "--field", "tag_name=0.2.0", "--field",
            "target_commitish=main", "--jq", ".body"
        ],
        ["gh", "release", "edit", "0.2.0", "--notes-file", "-"]
    ]


def test_a_published_release_fails_the_run_naming_the_bump(
    capsys   : CaptureFixture[str],
    fp       : FakeProcess,
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that a version a published release carries ends the run nonzero
    after writing its outputs, printing an error annotation naming the
    version and `mise bump`, and sends GitHub nothing past the read.
    """
    fp.register(
        VIEW,
        stdout = (
            '{"isDraft": false, "targetCommitish": "main", '
            '"url": "https://example.test/0.2.0"}'
        )
    )
    outputs = tmp_path / "outputs"

    with raises(SystemExit) as exited:
        task.Outcome.cut("0.2.0").write(outputs)

    assert exited.value.code == 1
    assert "state=published\n" in outputs.read_text()
    assert capsys.readouterr().out == (
        "::error::The published release https://example.test/0.2.0 already "
        "carries 0.2.0, so `mise bump` moves `[project].version` to the next "
        "version\n"
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
    fp.register(VIEW, returncode=1, stderr="HTTP 502: Bad Gateway\n")

    with raises(SystemExit, match="HTTP 502"):
        task.Release.find("0.2.0")


def test_a_release_gh_finds_reads_as_a_record(fp: FakeProcess, task: ModuleType):
    """
    Asserts that a release `gh release view` reports reads as whether it is
    a draft, the target of its tag, and its address.
    """
    fp.register(
        VIEW,
        stdout = (
            '{"isDraft": true, "targetCommitish": "main", '
            '"url": "https://example.test/0.2.0"}'
        )
    )

    assert task.Release.find("0.2.0") == task.Release(
        draft  = True,
        target = "main",
        url    = "https://example.test/0.2.0"
    )


def test_a_version_a_draft_carries_refreshes_its_notes(
    fp        : FakeProcess,
    refreshed : None,
    task      : ModuleType
):
    """
    Asserts that the cut of a version a draft carries refreshes that draft
    and creates none.
    """
    fp.register(
        VIEW,
        stdout = (
            '{"isDraft": true, "targetCommitish": "main", '
            '"url": "https://example.test/old"}'
        )
    )

    assert task.Outcome.cut("0.2.0") == task.Outcome(
        release = task.Release(
            draft  = True,
            target = "main",
            url    = "https://example.test/untagged-2"
        ),
        state   = "refreshed",
        version = "0.2.0"
    )
    assert len(fp.calls) == 3


def test_a_version_no_release_carries_gets_a_draft(
    created : None,
    fp      : FakeProcess,
    task    : ModuleType
):
    """
    Asserts that the cut of a version no release carries, which `gh` reports
    as not found, creates the draft and reports it.
    """
    fp.register(VIEW, returncode=1, stderr="release not found\n")

    assert task.Outcome.cut("0.2.0") == task.Outcome(
        release = task.Release(
            draft  = True,
            target = "main",
            url    = "https://example.test/untagged-1"
        ),
        state   = "created",
        version = "0.2.0"
    )


def test_the_outputs_name_the_path_the_address_and_the_version(
    state    : str,
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that each outcome appends its `state`, `url`, and `version`
    outputs after whatever the file already holds, whether or not the run
    then fails.
    """
    outputs = tmp_path / "outputs"
    outputs.write_text("earlier=1\n")
    release = task.Release(draft=True, target="main", url="https://example.test/0.2.0")
    outcome = task.Outcome(release=release, state=task.State(state), version="0.2.0")

    with raises(SystemExit) if state == "published" else nullcontext():
        outcome.write(outputs)

    assert outputs.read_text() == "\n".join(
        [
            "earlier=1",
            f"state={state}",
            "url=https://example.test/0.2.0", "version=0.2.0", ""
        ]
    )
