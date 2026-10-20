"""
Pins what the `lock` tasks do against stand-ins for the commands they run:

- The verdict `lock:check` reaches for each answer `uv lock --check`,
  `mise lock`, the locked install's dry run, and the site's frozen
  install's dry run give it, `.mise/mise.lock` keeping its bytes and its
  mode whatever the verdict
- The commands `lock:check`, `lock:audit`, and `lock:sync` run for each
  task script declaring its own dependencies and for the site's
  `docs/bun.lock`

Each case runs a task through its own shebang inside a scratch checkout,
with stand-in `bun`, `mise`, `mktemp`, and `uv` executables first on `PATH`,
so every file the task writes lands in a directory the case owns.
"""

from common.stand_ins import Scratch
from pytest           import mark, param


def test_a_lockfile_matching_its_manifest_passes(scratch: Scratch):
    """
    Asserts that the check exits zero where `uv lock --check` passes, `mise
    lock` leaves `.mise/mise.lock` as it stood, and both dry runs pass,
    running all four in turn and leaving the lockfile's bytes and mode as
    they stood and no snapshot behind.
    """
    assert scratch.run().returncode == 0
    assert scratch.calls == [
        "uv lock --check", "mise lock",
        "mise install --dry-run --force --locked",
        "bun install --cwd docs --dry-run --frozen-lockfile --no-summary"
    ]
    assert scratch.residue == scratch.pristine


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
    lockfile's bytes and its mode back, leaving no snapshot behind.
    """
    assert scratch.run(mise=mise).returncode == 1
    assert scratch.residue == scratch.pristine


@mark.parametrize(
    ("script", "bun", "mise", "uv", "calls", "stderr"),
    [
        param(
            False,
            "exit 0",
            "exit 0",
            "exit 1",
            ["uv lock --check"],
            "",
            id = "uv-lock-lagging"
        ),
        param(
            True,
            "exit 0",
            "exit 0",
            '[ "$3" = --script ] && exit 1 || exit 0',
            ["uv lock --check", "uv lock --check --script .mise/tasks/gha/brief.py"],
            "",
            id = "script-lock-lagging"
        ),
        param(
            False,
            "exit 0",
            "echo 'mise WARN  failed to resolve python for windows-x64' >&2",
            "exit 0",
            ["uv lock --check", "mise lock"],
            "failed to resolve python for windows-x64",
            id = "tool-unresolved"
        ),
        param(
            False,
            "exit 0",
            '[ "$1" = install ] && exit 1 || exit 0',
            "exit 0",
            ["uv lock --check", "mise lock", "mise install --dry-run --force --locked"],
            "",
            id = "tool-missing-from-the-locked-install"
        ),
        param(
            False,
            "exit 1",
            "exit 0",
            "exit 0",
            [
                "uv lock --check", "mise lock",
                "mise install --dry-run --force --locked",
                "bun install --cwd docs --dry-run --frozen-lockfile --no-summary"
            ],
            "",
            id = "site-lock-lagging"
        )
    ]
)
def test_a_lockfile_drifting_from_its_source_fails_and_stays_as_it_stood(
    bun     : str,
    calls   : list[str],
    mise    : str,
    scratch : Scratch,
    script  : bool,
    stderr  : str,
    uv      : str
):
    """
    Asserts that the check exits one, stopping after the call that found the
    drift and leaving `.mise/mise.lock`'s bytes and mode as they stood and
    no snapshot behind, wherever:

    - `uv.lock` or a task script's lockfile would change
    - `mise lock` reports a tool it failed to resolve while exiting zero,
      the report reaching standard error
    - The locked install's dry run finds no entry for a tool on this
      platform
    - The site's frozen install's dry run finds `docs/bun.lock` would change
    """
    if script:
        scratch.add_script()

    result = scratch.run(bun=bun, mise=mise, uv=uv)

    assert result.returncode == 1
    assert scratch.calls == calls
    assert stderr in result.stderr
    assert scratch.residue == scratch.pristine


def test_audit_fails_on_an_advisory_for_the_site(scratch: Scratch):
    """
    Asserts that `lock:audit` exits with the status `bun audit` returns for
    an advisory against a package the site's lockfile resolves, once the
    Python lockfiles have passed.
    """
    assert scratch.run("audit", bun="exit 1").returncode == 1
    assert scratch.calls[-1] == "bun audit --cwd docs"


def test_audit_reads_the_project_each_script_and_the_site(scratch: Scratch):
    """
    Asserts that `lock:audit` runs `uv audit` over the project's lockfile
    and then over each task script declaring its own dependencies, each
    under the preview flag `uv audit` takes, and then `bun audit` over the
    site's lockfile.
    """
    scratch.add_script()

    assert scratch.run("audit").returncode == 0
    assert scratch.calls == [
        "uv audit --preview-features audit-command",
        f"uv audit --preview-features audit-command --script {scratch.script}",
        "bun audit --cwd docs"
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


def test_sync_relocks_the_tools_the_project_each_script_and_the_site(scratch: Scratch):
    """
    Asserts that `lock:sync` re-resolves `.mise/mise.lock`, then `uv.lock`,
    then each task script's lockfile, lifting `UV_LOCKED` for each `uv
    lock`, and then relocks `docs/bun.lock` without installing.
    """
    scratch.add_script()

    assert scratch.run("sync").returncode == 0
    assert scratch.calls == [
        "mise lock", "uv lock --no-locked",
        f"uv lock --no-locked --script {scratch.script}",
        "bun install --cwd docs --lockfile-only"
    ]
