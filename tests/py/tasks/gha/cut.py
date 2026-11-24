"""
Pins the path `gha:cut` takes for each release it finds carrying the
version, the commands it sends GitHub on each path, and the outputs it
writes for the gate's summary.

Each case loads the script in the test process and answers each command it
runs through pytest-subprocess, so no case reaches GitHub.
"""

from collections.abc import Callable
from common.tasks    import mirror
from contextlib      import nullcontext
from pathlib         import Path
from pytest          import CaptureFixture, Metafunc, param, raises
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
    refreshed : list[str],
    task      : ModuleType
):
    """
    Asserts that a refresh asks GitHub for the notes of the version at the
    draft's own target, sends them as the draft's notes and nothing else,
    and reads the address `gh release edit` prints.
    """
    draft = task.Release(draft=True, target="4f1c2e9", url="https://example.test/old")

    assert draft.refresh("0.2.0") == task.Release(
        draft  = True,
        target = "4f1c2e9",
        url    = "https://example.test/untagged-2"
    )
    assert list(fp.calls) == [
        [
            "gh", "api", "repos/{owner}/{repo}/releases/generate-notes",
            "--raw-field", "tag_name=0.2.0", "--raw-field",
            "target_commitish=4f1c2e9", "--jq", ".body"
        ],
        ["gh", "release", "edit", "0.2.0", "--notes-file", "-"]
    ]
    assert refreshed == ["Fresh notes"]


def test_a_published_release_fails_the_run_naming_the_bump(
    capsys   : CaptureFixture[str],
    fp       : FakeProcess,
    task     : ModuleType,
    tmp_path : Path,
    viewed   : Callable[..., None]
):
    """
    Asserts that a version a published release carries ends the run nonzero
    after writing its outputs, printing an error annotation naming the
    version and `mise bump` with its parts, and sends GitHub nothing past
    the read.
    """
    viewed(draft=False, url="https://example.test/0.2.0")
    outputs = tmp_path / "outputs"

    with raises(SystemExit) as exited:
        task.Outcome.cut("0.2.0").write(outputs)

    assert exited.value.code == 1
    assert "state=published\n" in outputs.read_text()
    assert capsys.readouterr().out == (
        "::error::The published release https://example.test/0.2.0 already "
        "carries 0.2.0, so run `mise bump` with `patch`, `minor`, or `major` "
        "to move `[project].version` to the next version\n"
    )
    assert len(fp.calls) == 1


def test_a_read_failing_for_another_reason_stops_the_cut(
    task   : ModuleType,
    viewed : Callable[..., None]
):
    """
    Asserts that `gh release view` failing for any reason but an absent
    release ends the run on its message, since a second create would leave
    two drafts for one version.
    """
    viewed(stderr="HTTP 502: Bad Gateway\n")

    with raises(SystemExit, match="HTTP 502"):
        task.Release.find("0.2.0")


def test_a_version_a_draft_carries_refreshes_its_notes(
    fp        : FakeProcess,
    refreshed : list[str],
    task      : ModuleType,
    viewed    : Callable[..., None]
):
    """
    Asserts that the cut of a version a draft carries refreshes that draft
    and creates none.
    """
    viewed(draft=True, target="4f1c2e9", url="https://example.test/old")

    assert task.Outcome.cut("0.2.0") == task.Outcome(
        release = task.Release(
            draft  = True,
            target = "4f1c2e9",
            url    = "https://example.test/untagged-2"
        ),
        state   = "refreshed",
        version = "0.2.0"
    )
    assert len(fp.calls) == 3


def test_a_version_no_release_carries_gets_a_draft(
    created : None,
    task    : ModuleType,
    viewed  : Callable[..., None]
):
    """
    Asserts that the cut of a version no release carries, which `gh` reports
    as not found, creates the draft and reports it.
    """
    viewed(stderr="release not found\n")

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


def test_the_version_comes_from_the_manifest(task: ModuleType, tmp_path: Path):
    """
    Asserts that the cut reads `[project].version` out of the manifest it
    is given.
    """
    manifest = tmp_path / "pyproject.toml"
    manifest.write_text('[project]\nname = "scotch"\nversion = "4.7.1"\n')

    assert task.version(manifest) == "4.7.1"
