"""
Pins the verdict `lock:check` reaches for each answer `uv lock --check`,
`mise lock`, and the locked install's dry run give it, and that
`.mise/mise.lock` keeps its bytes and its mode whatever the verdict, beside
the commands `lock:check`, `lock:audit`, and `lock:sync` run for each task
script that declares its own dependencies.

Each case runs a task through its own shebang inside a scratch checkout,
with stand-in `mise`, `mktemp`, and `uv` executables first on `PATH`, so
every file the task writes lands in a directory the case owns.
"""

from common.stand_ins import Scratch
from pytest           import mark, param
from stat             import S_IMODE


def test_a_lockfile_matching_its_manifest_passes(scratch: Scratch):
    """
    Asserts that the check exits zero where `uv lock --check` passes and
    `mise lock` leaves `.mise/mise.lock` as it stood, running both and
    leaving no snapshot behind.
    """
    assert scratch.run().returncode == 0
    assert scratch.calls == [
        "uv lock --check", "mise lock", "mise install --dry-run --force --locked"
    ]
    assert scratch.lockfile.read_text() == scratch.text
    assert list(scratch.scratch.iterdir()) == []


@mark.parametrize(
    "mise",
    [
        param("echo drifted > .mise/mise.lock", id="rewritten"),
        param("echo partial > .mise/mise.lock; exit 1", id="written-then-failed")
    ]
)
def test_a_lockfile_mise_lock_changes_fails_and_is_restored(
    mise    : str,
    scratch : Scratch
):
    """
    Asserts that the check exits one where `mise lock` changes
    `.mise/mise.lock`, whether `mise lock` exits zero or not, and puts the
    lockfile's bytes and its mode back.
    """
    assert scratch.run(mise=mise).returncode == 1
    assert scratch.lockfile.read_text() == scratch.text
    assert S_IMODE(scratch.lockfile.stat().st_mode) == 0o644
    assert list(scratch.scratch.iterdir()) == []


@mark.parametrize(
    ("script", "mise", "uv", "calls", "stderr"),
    [
        param(False, "exit 0", "exit 1", ["uv lock --check"], "", id="uv-lock-lagging"),
        param(
            True,
            "exit 0",
            '[ "$3" = --script ] && exit 1 || exit 0',
            ["uv lock --check", "uv lock --check --script .mise/tasks/gha/brief.py"],
            "",
            id = "script-lock-lagging"
        ),
        param(
            False,
            "echo 'mise WARN  failed to resolve python for windows-x64' >&2",
            "exit 0",
            ["uv lock --check", "mise lock"],
            "failed to resolve python for windows-x64",
            id = "tool-unresolved"
        ),
        param(
            False,
            '[ "$1" = install ] && exit 1 || exit 0',
            "exit 0",
            ["uv lock --check", "mise lock", "mise install --dry-run --force --locked"],
            "",
            id = "tool-missing-from-the-locked-install"
        )
    ]
)
def test_a_lockfile_drifting_from_its_source_fails_and_stays_as_it_stood(
    calls   : list[str],
    mise    : str,
    scratch : Scratch,
    script  : bool,
    stderr  : str,
    uv      : str
):
    """
    Asserts that the check exits one, stopping after the call that found
    the drift and leaving `.mise/mise.lock` as it stood, where `uv.lock`
    or a task script's lockfile would change, `mise lock` reports a tool it
    failed to resolve while exiting zero, or the locked install's dry run
    finds no entry for a tool on this platform, with the report reaching
    standard error.
    """
    if script:
        scratch.add_script()

    result = scratch.run(mise=mise, uv=uv)

    assert result.returncode == 1
    assert scratch.calls == calls
    assert stderr in result.stderr
    assert scratch.lockfile.read_text() == scratch.text


def test_audit_reads_the_project_and_each_script(scratch: Scratch):
    """
    Asserts that `lock:audit` runs `uv audit` over the project's lockfile
    and then over each task script declaring its own dependencies, each
    under the preview flag `uv audit` takes.
    """
    scratch.add_script()

    assert scratch.run("audit").returncode == 0
    assert scratch.calls == [
        "uv audit --preview-features audit-command",
        f"uv audit --preview-features audit-command --script {scratch.script}"
    ]


@mark.parametrize("status", [param(1, id="advisory"), param(2, id="unreachable")])
def test_audit_fails_on_an_advisory_or_an_unreachable_service(
    scratch : Scratch,
    status  : int
):
    """
    Asserts that `lock:audit` exits with the status `uv audit` returns for
    an advisory and for an advisory service it cannot reach, auditing no
    script after the project fails.
    """
    scratch.add_script()

    assert scratch.run("audit", uv=f"exit {status}").returncode == status
    assert scratch.calls == ["uv audit --preview-features audit-command"]


def test_sync_relocks_the_tools_the_project_and_each_script(scratch: Scratch):
    """
    Asserts that `lock:sync` re-resolves `.mise/mise.lock`, then `uv.lock`,
    then each task script's lockfile, lifting `UV_LOCKED` for each `uv
    lock`.
    """
    scratch.add_script()

    assert scratch.run("sync").returncode == 0
    assert scratch.calls == [
        "mise lock", "uv lock --no-locked",
        f"uv lock --no-locked --script {scratch.script}"
    ]
