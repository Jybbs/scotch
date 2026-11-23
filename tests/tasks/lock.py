"""
Pins what the `lock` tasks do against stand-ins for the commands they run:

- The verdict `lock:check` reaches for each answer `uv lock --check`,
  `mise lock`, the locked install's dry run, and the site's frozen
  install's dry run give it, `.mise/mise.lock` keeping its bytes and its
  mode whatever the verdict
- The commands `lock:check`, `lock:audit`, and `lock:sync` run for each
  task script declaring its own dependencies, for the crate's
  `rust/Cargo.lock`, and for the site's `docs/bun.lock`
- The advisories `lock:audit` sets aside from `bun audit` while no
  release fixes them, and its failure once a release fixes one, its
  stand-in `gh` running the task's own `--jq` filter through `jq` over
  the advisories saved under `fixtures/advisories/`
- The tools `lock:audit` hands `mise audit`, and its verdict on each
  advisory the stand-in `mise` reports against them, with and without an
  `AUDIT_IGNORE` entry and a fixed release
- The `scotch` command `lock:lift` hands its arguments to

Each case runs a task through its own shebang inside a scratch checkout,
with stand-in `bun`, `cargo`, `cargo-deny`, `gh`, `mise`, `mktemp`,
`scotch`, and `uv` executables first on `PATH`, so every file the task
writes lands in a directory the case owns.
"""

from common.stand_ins import Scratch
from json             import dumps, loads
from pathlib          import Path
from pytest           import mark, param
from shlex            import quote

ADVISORIES = Path(__file__).parent / "fixtures" / "advisories"
ADVISORY   = "GHSA-fc5q-39xc-vjpf"
ALIAS      = "GHSA-2c4m-59x9-fr2g"
CARGO = "cargo metadata --format-version 1 --locked --manifest-path rust/Cargo.toml"
DENY  = "cargo-deny --locked --manifest-path rust/Cargo.toml check"
GH    = f'jq -r "$3" "{ADVISORIES}/${{4##*/}}.json"'
CVE   = "CVE-2026-124249"
TOOLS = {
    "http:microsoft-teams":
        [{"version": "1", "source": {"path": "/global/config.toml"}}],
    "python": [{"version": "3.15.2", "source": {"path": "%s/.mise/config.toml"}}]
}


def mise(
    *vulnerabilities : dict[str, object],
    audit            : str               = "",
    tools            : dict[str, object] = TOOLS
) -> str:
    """
    Writes the stand-in `mise`, which prints `tools` for `mise ls` with the
    worktree in place of each `%s`, and for `mise audit` runs the shell line
    `audit` holds, or else prints a report holding `vulnerabilities` beside
    an unchecked `rust`, exiting one where the report holds any, as `mise
    audit --json` does.
    """
    report = dumps(
        {
            "vulnerabilities" : vulnerabilities,
            "unchecked"       : [{"tool": "rust", "version": "1.100.0"}]
        }
    )

    audit = audit or f"echo {quote(report)}; exit {int(bool(vulnerabilities))}"

    return (
        f"case $1 in ls) echo {quote(dumps(tools))} "
        f'| sed "s|%s|$MISE_PROJECT_ROOT|g";; '
        f"audit) {audit};; esac"
    )


def vulnerability(*fixed: str, aliases: tuple[str, ...] = ()) -> dict[str, object]:
    """
    Writes the record `mise audit --json` gives `CVE` against Python 3.15.2,
    carrying `aliases` and fixed in each release `fixed` names.
    """
    return {
        "aliases" : aliases,
        "fixed"   : fixed,
        "id"      : CVE,
        "summary" : "`http.cookiejar` applies expired `Set-Cookie` to cookie store",
        "tool"    : "python",
        "version" : "3.15.2"
    }


def test_a_lockfile_matching_its_manifest_passes(scratch: Scratch):
    """
    Asserts that the check exits zero where `uv lock --check` and
    the crate's locked `cargo metadata` pass, `mise lock` leaves
    `.mise/mise.lock` as it stood, and both dry runs pass, running all five
    in turn and leaving the lockfile's bytes and mode as they stood and no
    snapshot behind.
    """
    assert scratch.run().returncode == 0
    assert scratch.calls == [
        "uv lock --check", CARGO,
        "mise lock", "mise install --dry-run --force --locked",
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
    ("script", "bun", "cargo", "mise", "uv", "calls", "stderr"),
    [
        param(
            False,
            "exit 0",
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
            "exit 0",
            '[ "$3" = --script ] && exit 1 || exit 0',
            [
                "uv lock --check",
                "uv lock --check --script .mise/tasks/gha/scoresheet.py"
            ],
            "",
            id = "script-lock-lagging"
        ),
        param(
            False,
            "exit 0",
            "exit 1",
            "exit 0",
            "exit 0",
            ["uv lock --check", CARGO],
            "",
            id = "crate-lock-lagging"
        ),
        param(
            False,
            "exit 0",
            "exit 0",
            "echo 'mise WARN  failed to resolve python for windows-x64' >&2",
            "exit 0",
            ["uv lock --check", CARGO, "mise lock"],
            "failed to resolve python for windows-x64",
            id = "tool-unresolved"
        ),
        param(
            False,
            "exit 0",
            "exit 0",
            '[ "$1" = install ] && exit 1 || exit 0',
            "exit 0",
            [
                "uv lock --check", CARGO,
                "mise lock", "mise install --dry-run --force --locked"
            ],
            "",
            id = "tool-missing-from-the-locked-install"
        ),
        param(
            False,
            "exit 1",
            "exit 0",
            "exit 0",
            "exit 0",
            [
                "uv lock --check", CARGO,
                "mise lock", "mise install --dry-run --force --locked",
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
    cargo   : str,
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

    - `uv.lock`, a task script's lockfile, or `rust/Cargo.lock` would
      change
    - `mise lock` reports a tool it failed to resolve while exiting zero,
      the report reaching standard error
    - The locked install's dry run finds no entry for a tool on this
      platform
    - The site's frozen install's dry run finds `docs/bun.lock` would change
    """
    if script:
        scratch.add_script()

    result = scratch.run(
        bun   = bun,
        cargo = cargo,
        mise  = mise,
        uv    = uv
    )

    assert result.returncode == 1
    assert scratch.calls == calls
    assert stderr in result.stderr
    assert scratch.residue == scratch.pristine


def test_audit_fails_on_a_crate_breaking_a_rule_of_its_config(scratch: Scratch):
    """
    Asserts that `lock:audit` exits with the status `cargo-deny` returns for
    a crate breaking a rule of `rust/.cargo/deny.toml`, auditing the site's
    lockfile no further.
    """
    assert scratch.run("audit", deny="exit 1").returncode == 1
    assert scratch.calls[-1] == DENY


def test_audit_fails_on_an_advisory_for_the_site(scratch: Scratch):
    """
    Asserts that `lock:audit` exits with the status `bun audit` returns for
    an advisory against a package the site's lockfile resolves, once the
    Python lockfiles have passed.
    """
    assert scratch.run("audit", bun="exit 1").returncode == 1
    assert scratch.calls[-1] == "bun audit --cwd docs"


@mark.parametrize(
    ("ignore", "bun"),
    [
        param("", "bun audit --cwd docs", id="empty"),
        param(ADVISORY, f"bun audit --cwd docs --ignore={ADVISORY}", id="unpatched"),
        param(
            f"{ADVISORY} GHSA-7w2g-9mf9-324m",
            f"bun audit --cwd docs --ignore={ADVISORY} --ignore=GHSA-7w2g-9mf9-324m",
            id = "two-unpatched"
        )
    ]
)
def test_audit_sets_aside_each_advisory_no_release_fixes(
    bun     : str,
    ignore  : str,
    scratch : Scratch
):
    """
    Asserts that `lock:audit` passes `--ignore` to `bun audit` for each
    id `AUDIT_IGNORE` lists whose saved advisory names no patched version,
    printing the advisory's summary after reading each advisory once in the
    order the list gives, and runs the plain `bun audit` without calling
    `gh` where the list is empty.
    """
    result = scratch.run("audit", gh=GH, ignore=ignore)

    assert result.returncode == 0
    assert scratch.calls[-1] == bun
    assert result.stderr.splitlines() == [
        f"Setting {advisory} aside while no release fixes it: "
        + loads((ADVISORIES / f"{advisory}.json").read_text())["summary"]
        for advisory in ignore.split()
    ]
    assert [call.split()[-1] for call in scratch.calls if "/advisories/" in call] == [
        f"/advisories/{advisory}" for advisory in ignore.split()
    ]


@mark.parametrize(
    ("ignore", "gh", "stderr"),
    [
        param(
            "GHSA-r9jc-w898-3fv6",
            GH,
            "GHSA-r9jc-w898-3fv6 is fixed in nuxt 4.6.4, so delete it",
            id = "patched"
        ),
        param(
            "GHSA-4528-x5fx-h6hg",
            GH,
            "GHSA-4528-x5fx-h6hg is fixed in joi 17.13.9, joi 18.3.1, so delete it",
            id = "partly-patched"
        ),
        param(
            ADVISORY,
            "echo 'HTTP 404: Not Found' >&2; exit 1",
            "HTTP 404",
            id = "unreadable"
        ),
        param(
            ADVISORY,
            "echo 'error connecting to api.github.com' >&2; exit 1",
            "error connecting to api.github.com",
            id = "unreachable"
        )
    ]
)
def test_audit_fails_once_a_release_fixes_an_advisory_or_it_cannot_be_read(
    gh      : str,
    ignore  : str,
    scratch : Scratch,
    stderr  : str
):
    """
    Asserts that `lock:audit` exits one without running `bun audit` where a
    saved advisory `AUDIT_IGNORE` lists names a patched version for any of
    its packages, naming the entry to delete and each release to lift to,
    and where `gh` cannot read the advisory.
    """
    result = scratch.run("audit", gh=gh, ignore=ignore)

    assert result.returncode == 1
    assert not any(call.startswith("bun ") for call in scratch.calls)
    assert stderr in result.stderr


def test_audit_names_every_tool_advisory_before_failing(scratch: Scratch):
    """
    Asserts that `lock:audit` names each tool advisory `AUDIT_IGNORE` leaves
    out, in the order `mise audit` reports them and across every tool it
    audits, rather than stopping at the first.
    """
    second, third = (vulnerability() | {"id": f"CVE-2026-12425{n}"} for n in (0, 1))
    python, node  = (
        quote(dumps({"vulnerabilities": found}))
        for found in ([vulnerability(), second], [third])
    )
    result = scratch.run(
        "audit",
        mise = mise(
            audit =
                f"case $3 in python@*) echo {python};; *) echo {node};; esac; exit 1",
            tools = TOOLS | {
                "node": [
                    {"version": "24.0.0", "source": {"path": "%s/.mise/config.toml"}}
                ]
            }
        )
    )

    assert result.returncode == 1
    assert [line.split()[0] for line in result.stderr.splitlines()] == [
        CVE, "CVE-2026-124250", "CVE-2026-124251"
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


@mark.parametrize(
    ("ignore", "advisory"),
    [
        param(CVE, vulnerability(), id="listed"),
        param(ALIAS, vulnerability(aliases=(ALIAS,)), id="listed-alias")
    ]
)
def test_audit_sets_aside_each_tool_advisory_no_release_fixes(
    advisory : dict[str, object],
    ignore   : str,
    scratch  : Scratch
):
    """
    Asserts that `lock:audit` passes where `AUDIT_IGNORE` lists a tool
    advisory's id or one of its aliases and `mise audit` reports no fixed
    release, printing the advisory's summary, reading no GitHub advisory for
    it, even under a `GHSA-` alias, and passing `bun audit` no `--ignore`
    for it.
    """
    result = scratch.run("audit", gh=GH, ignore=ignore, mise=mise(advisory))

    assert result.returncode == 0
    assert scratch.calls[-1] == "bun audit --cwd docs"
    assert not any(call.startswith("gh ") for call in scratch.calls)
    assert result.stderr == (
        f"Setting {ignore} aside while no release fixes it: {advisory['summary']}\n"
    )


@mark.parametrize(
    ("ignore", "advisory", "stderr"),
    [
        param(
            "",
            vulnerability(),
            f"{CVE} affects python 3.15.2 and no release fixes it, so add it",
            id = "unlisted"
        ),
        param(
            "",
            vulnerability("3.15.3", "3.14.11"),
            f"{CVE} affects python 3.15.2 and is fixed in python 3.15.3 or 3.14.11",
            id = "unlisted-fixed"
        ),
        param(
            CVE,
            vulnerability("3.15.3"),
            f"{CVE} is fixed in python 3.15.3, so delete it from AUDIT_IGNORE",
            id = "listed-fixed"
        ),
        param(
            ALIAS,
            vulnerability("3.15.3", aliases=(ALIAS,)),
            f"{CVE} is fixed in python 3.15.3, so delete it from AUDIT_IGNORE",
            id = "listed-alias-fixed"
        )
    ]
)
def test_audit_fails_on_a_tool_advisory_unlisted_or_fixed(
    advisory : dict[str, object],
    ignore   : str,
    scratch  : Scratch,
    stderr   : str
):
    """
    Asserts that `lock:audit` exits one without running `bun audit` on a
    tool advisory `AUDIT_IGNORE` leaves out, naming the tool, its version,
    and any fixed release, and on one it lists once `mise audit` reports a
    fixed release, naming the advisory and the release to lift the tool to.
    """
    result = scratch.run("audit", gh=GH, ignore=ignore, mise=mise(advisory))

    assert result.returncode == 1
    assert not any(call.startswith(("bun ", "gh ")) for call in scratch.calls)
    assert stderr in result.stderr


def test_audit_reads_the_project_each_script_and_the_site(scratch: Scratch):
    """
    Asserts that `lock:audit` runs `uv audit` over the project's lockfile
    and then over each task script declaring its own dependencies, each
    under the preview flag `uv audit` takes, then `cargo-deny` over the
    crate, then `mise audit` over the one tool `.mise/config.toml` pins
    beside a tool a global config adds, and then `bun audit` over the site's
    lockfile.
    """
    scratch.add_script()

    assert scratch.run("audit", mise=mise()).returncode == 0
    assert scratch.calls == [
        "uv audit --preview-features audit-command",
        f"uv audit --preview-features audit-command --script {scratch.script}",
        DENY, "mise ls --current --json --no-global",
        "mise audit --json python@3.15.2", "bun audit --cwd docs"
    ]


def test_audit_skips_a_non_github_entry_no_pinned_tool_carries(scratch: Scratch):
    """
    Asserts that `lock:audit` passes where `AUDIT_IGNORE` lists a `CVE-`
    entry against no tool advisory, naming the entry to delete, reading no
    GitHub advisory for it, and passing `bun audit` no `--ignore` for it,
    while still reading the `GHSA-` entry beside it.
    """
    result = scratch.run("audit", gh=GH, ignore=f"{CVE} {ADVISORY}", mise=mise())

    assert result.returncode == 0
    assert scratch.calls[-1] == f"bun audit --cwd docs --ignore={ADVISORY}"
    assert [call.split()[-1] for call in scratch.calls if "/advisories/" in call] == [
        f"/advisories/{ADVISORY}"
    ]
    assert f"No tool .mise/config.toml pins carries {CVE}" in result.stderr


LISTED      = f"echo {quote(dumps({'vulnerabilities': [vulnerability()]}))}; exit 1"
UNREACHABLE = "echo 'mise ERROR error sending request to api.osv.dev' >&2; exit 1"
UNRESOLVED  = (
    f"echo {quote(dumps({'unchecked': [], 'vulnerabilities': []}))}; "
    "echo 'mise ERROR not checked, the version did not resolve' >&2; exit 1"
)


@mark.parametrize(
    ("tools", "audit", "audited", "stderr"),
    [
        param(
            {},
            UNREACHABLE,
            False,
            "so lock:audit checked none",
            id = "no-pinned-tool"
        ),
        param(TOOLS, UNREACHABLE, True, "error sending request", id="unreachable"),
        param(
            TOOLS | {
                "node":
                    [{"version": "24.0.0", "source": {"path": "%s/.mise/config.toml"}}]
            },
            f"case $3 in python@*) {LISTED};; *) {UNRESOLVED};; esac",
            True,
            "did not resolve",
            id = "one-unresolved"
        )
    ]
)
def test_audit_fails_where_no_tool_is_checked_or_osv_cannot_be_read(
    audit   : str,
    audited : bool,
    scratch : Scratch,
    stderr  : str,
    tools   : dict[str, object]
):
    """
    Asserts that `lock:audit` fails without running `bun audit` where no
    tool `mise ls` lists comes from `.mise/config.toml`, calling no `mise
    audit`, and where `mise audit` exits nonzero with no advisory to report
    for any one tool, even beside a tool whose advisory `AUDIT_IGNORE`
    lists.
    """
    result = scratch.run("audit", ignore=CVE, mise=mise(audit=audit, tools=tools))

    assert result.returncode != 0
    assert not any(call.startswith("bun ") for call in scratch.calls)
    assert stderr in result.stderr
    assert ("mise audit --json python@3.15.2" in scratch.calls) == audited


def test_lift_hands_its_arguments_to_the_lift_command(scratch: Scratch):
    """
    Asserts that `lock:lift` runs `scotch lift pins` with every argument it
    is given and exits with the status the command returns.
    """
    result = scratch.run("lift", "--try", "--hold", "polars", scotch="exit 2")

    assert result.returncode == 2
    assert scratch.calls == ["scotch lift pins --try --hold polars"]


def test_sync_relocks_the_tools_the_project_each_script_and_the_site(scratch: Scratch):
    """
    Asserts that `lock:sync` re-resolves `.mise/mise.lock`, then `uv.lock`,
    then each task script's lockfile, lifting `UV_LOCKED` for each `uv
    lock`, then the crate's entries in `rust/Cargo.lock`, and then relocks
    `docs/bun.lock` without installing.
    """
    scratch.add_script()

    assert scratch.run("sync").returncode == 0
    assert scratch.calls == [
        "mise lock", "uv lock --no-locked",
        f"uv lock --no-locked --script {scratch.script}",
        "cargo update --manifest-path rust/Cargo.toml --workspace",
        "bun install --cwd docs --lockfile-only"
    ]
