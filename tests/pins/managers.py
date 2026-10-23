"""
Pins the lifts each kind of pin in `scotch.pins.managers` reads out of the
sample checkout against the answers stand-ins for mise, uv, Bun, git, and
GitHub's REST endpoint give it, meaning which pins lag, the version each
lift moves to, the day it is dated to, the rewrites it carries, and the
advisories it clears.
"""

from common.sample import Sample
from datetime      import UTC, datetime
from json          import dumps, loads as from_json
from pathlib       import Path
from pytest        import mark, param
from pytest_subprocess.fake_popen   import FakePopen
from pytest_subprocess.fake_process import FakeProcess
from tomllib import loads

from scotch.pins.managers import ActionPins, BunPins, MisePins, UvPins
from scotch.pins.schemas  import Advisory, Edit, Lift, Spelling
from scotch.pins.trees    import Tree
from scotch.repo.checks   import PinCheck, ScriptCheck


def target(process: FakePopen) -> Path:
    """
    Reads the scratch project a stand-in `uv` command names after
    `--project`.
    """
    return Path(process.args[process.args.index("--project") + 1])


def test_a_pin_follows_uv_lock_only_from_a_script_and_only_where_it_resolves(
    answered : Sample,
    fp       : FakeProcess,
    tree     : Tree
):
    """
    Asserts that a build constraint resolves through the scratch project
    even where `uv.lock` resolves its package, that a task script's pin of
    a package `uv.lock` resolves nowhere resolves there too, and that a task
    script's pin of a package `uv.lock` resolves follows `uv.lock`.
    """
    answered.edit(
        "pyproject.toml",
        new = '["minijinja==2.24.0", "setuptools==84.0.0"]',
        old = '["setuptools==84.0.0"]'
    )
    answered.edit(
        ".mise/tasks/gha/brief",
        new = '["minijinja==2.24.0", "rich==13.0.0"]',
        old = '["minijinja==2.24.0"]'
    )
    tool = ["mise", "-C", tree.root, "exec", "--", "uv"]

    def upgrade(process: FakePopen):
        """
        Writes the lockfile `uv lock --upgrade` would, moving `minijinja`.
        """
        (target(process) / "uv.lock").write_text(
            '[[package]]\nname = "minijinja"\nversion = "3.0.3"\n'
        )

    def resolve(process: FakePopen):
        """
        Asserts that the scratch project depends on the build's pins and on
        the script's pin `uv.lock` resolves nowhere, and writes the lockfile
        resolving each to a release of its own.
        """
        assert loads((target(process) / "pyproject.toml").read_text())["project"][
            "dependencies"
        ] == ["hatchling", "minijinja", "rich", "setuptools"]

        (target(process) / "uv.lock").write_text(
            '[[package]]\nname = "hatchling"\nversion = "1.32.4"\n\n'
            '[[package]]\nname = "minijinja"\nversion = "3.1.0"\n\n'
            '[[package]]\nname = "rich"\nversion = "14.0.0"\n\n'
            '[[package]]\nname = "setuptools"\nversion = "84.0.0"\n'
        )

    fp.register(
        [
            *tool,
            "lock", "--no-locked", "--no-python-downloads", "--project",
            fp.any(max=1, min=1),
            "--upgrade"
        ],
        callback = upgrade
    )
    fp.register(
        [
            *tool,
            "lock", "--no-locked", "--no-python-downloads", "--project",
            fp.any(max=1, min=1)
        ],
        callback = resolve
    )
    fp.register(
        [*tool, "audit", fp.any()],
        occurrences = 4,
        stdout      = dumps({"vulnerabilities": []})
    )

    assert [
        (str(lift.path), lift.name, lift.newest) for lift in UvPins(tree=tree).lifts()
    ] == [
        ("uv.lock", "minijinja", "3.0.3"),
        ("pyproject.toml", "minijinja", "3.1.0"),
        (".mise/tasks/gha/brief", "minijinja", "3.0.3"),
        (".mise/tasks/gha/brief", "rich", "14.0.0")
    ]


@mark.parametrize(
    ("floor", "lifted"),
    [
        param("2026.9.18", True, id="lagging"),
        param("2026.10.17", False, id="newest")
    ]
)
def test_the_floor_lifts_to_the_newest_release_of_mise(
    floor  : str,
    fp     : FakeProcess,
    lifted : bool,
    sample : Sample,
    tree   : Tree
):
    """
    Asserts that the floor `min_version` sets lifts to the newest release
    mise lists for itself, passing over a prerelease, and stays where it
    stands at that release.
    """
    sample.edit(".mise/config.toml", new=f'min_version = "{floor}"\n[env]', old="[env]")
    fp.register(
        ["mise", "-C", tree.root, "outdated", "--bump", "--json", "--local"],
        stdout = "{}"
    )
    fp.register(
        ["mise", "-C", tree.root, "ls-remote", "--json", "github:jdx/mise"],
        stdout = dumps(
            [
                {"created_at": "2026-10-21T01:29:26Z", "version": "2026.10.17"},
                {"prerelease": True, "version": "2026.11.0"},
                {"version": "2026.9.18"}
            ]
        )
    )
    floor = Lift(
        current = "2026.9.18",
        edits   = (
            Edit(
                name     = "min_version",
                path     = Path(".mise/config.toml"),
                spelling = Spelling.ASSIGNMENT,
                version  = "2026.10.17"
            ),
        ),
        name     = "mise",
        newest   = "2026.10.17",
        path     = Path(".mise/config.toml"),
        released = datetime(2026, 10, 21, 1, 29, 26, tzinfo=UTC)
    )

    assert list(MisePins(tree=tree).lifts()) == ([floor] if lifted else [])


def test_a_site_lagging_nowhere_relocks_and_audits_nothing(
    fp     : FakeProcess,
    sample : Sample,
    tree   : Tree
):
    """
    Asserts that where `bun outdated` reports no package and the site holds
    no override and no step passes a Wrangler version, nothing lifts and no
    copy of the site is relocked or audited.
    """
    fp.register(
        [
            "mise", "-C", tree.root, "exec", "--", "bun", "outdated",
            f"--cwd={tree.root / 'docs'}"
        ],
        stdout = "| Package | Current | Update | Latest |\n"
    )

    assert list(BunPins(tree=tree).lifts()) == []
    assert len(fp.calls) == 1


def test_an_action_in_a_repository_folder_reads_that_repository(
    fp     : FakeProcess,
    sample : Sample,
    tree   : Tree
):
    """
    Asserts that an action a step names by a folder inside its repository
    lifts to the commit the latest release of that repository names, the
    rewrite finding the pin beside the action's full name.
    """
    (sample.root / ".github" / "workflows" / "scan.yml").write_text(
        "jobs:\n  scan:\n    runs-on: ubuntu-26.04\n    steps:\n"
        "      - name: Scan\n"
        f"        uses: github/codeql-action/init@{'1' * 40}\n"
        "name: Scan\non:\n  push:\n"
    )
    pinned = {
        "actions/checkout"     : ("v7.0.1", "3d3c42e5aac5ba805825da76410c181273ba90b1"),
        "github/codeql-action" : ("v4.1.0", "2" * 40),
        "jdx/mise-action"      : ("v5.0.1", "7a4e45a543138629540c9a1616d08632b893e492")
    }

    for repository, (tag, commit) in pinned.items():
        fp.register(
            ["gh", "api", f"repos/{repository}/releases/latest"],
            stdout = dumps({"published_at": "2026-10-01T00:00:00Z", "tag_name": tag})
        )
        fp.register(
            ["git", "ls-remote", "--tags", f"https://github.com/{repository}"],
            stdout = f"{commit}\trefs/tags/{tag}\n"
        )

    assert [
        (str(lift.path), lift.name, lift.current, lift.newest, lift.edits)
        for lift in ActionPins(tree=tree).lifts()
    ] == [
        (
            ".github/workflows/scan.yml", "github/codeql-action/init",
            "1" * 40,
            "v4.1.0",
            (
                Edit(
                    name     = "github/codeql-action/init",
                    path     = Path(".github/workflows/scan.yml"),
                    spelling = Spelling.REF,
                    version  = "2" * 40
                ),
            )
        )
    ]


@mark.parametrize(
    ("warm", "expected"),
    [
        param(
            "3d3c42e5aac5ba805825da76410c181273ba90b1",
            [(".github/actions/provision/action.yml", "jdx/mise-action", "v5.0.1")],
            id = "pinned-to-a-tag"
        ),
        param(
            "e" * 40,
            [
                (".github/workflows/warm.yml", "actions/checkout", "e" * 40),
                (".github/actions/provision/action.yml", "jdx/mise-action", "v5.0.1")
            ],
            id = "pinned-to-no-tag"
        )
    ]
)
def test_the_actions_lift_to_the_commit_of_their_latest_release(
    expected : list[tuple[str, str, str]],
    fp       : FakeProcess,
    sample   : Sample,
    tree     : Tree,
    warm     : str
):
    """
    Asserts that each file pinning an action to a commit other than the one
    its latest release's tag names lifts to that commit, read through the
    peeled entry of an annotated tag, named for the most specific tag naming
    the pinned commit or for the commit where no tag names it, and that a
    file pinned to the latest release's commit stays out.
    """
    checkout = "3d3c42e5aac5ba805825da76410c181273ba90b1"
    newest   = "c" * 40
    sample.edit(
        ".github/workflows/warm.yml",
        new = f"checkout@{warm}",
        old = f"checkout@{checkout}"
    )
    fp.register(
        ["gh", "api", "repos/actions/checkout/releases/latest"],
        stdout = dumps({"published_at": "2026-07-20T15:10:05Z", "tag_name": "v7.0.1"})
    )
    fp.register(
        ["git", "ls-remote", "--tags", "https://github.com/actions/checkout"],
        stdout = f"{checkout}\trefs/tags/v7\n{checkout}\trefs/tags/v7.0.1\n"
    )
    fp.register(
        ["gh", "api", "repos/jdx/mise-action/releases/latest"],
        stdout = dumps({"published_at": "2026-10-21T10:00:00Z", "tag_name": "v5.2.2"})
    )
    fp.register(
        ["git", "ls-remote", "--tags", "https://github.com/jdx/mise-action"],
        stdout = (
            "7a4e45a543138629540c9a1616d08632b893e492\trefs/tags/v5.0.1\n"
            f"{'d' * 40}\trefs/tags/v5.2.2\n"
            f"{newest}\trefs/tags/v5.2.2^{{}}\n"
        )
    )
    lifts = list(ActionPins(tree=tree).lifts())
    mise  = next(lift for lift in lifts if lift.name == "jdx/mise-action")

    assert [(str(lift.path), lift.name, lift.current) for lift in lifts] == expected
    assert mise.edits == (
        Edit(
            name     = "jdx/mise-action",
            path     = Path(".github/actions/provision/action.yml"),
            spelling = Spelling.REF,
            version  = newest
        ),
    )
    assert (mise.newest, mise.released) == (
        "v5.2.2",
        datetime(2026, 10, 21, 10, tzinfo=UTC)
    )


def test_the_npm_packages_lift_through_bun_with_the_advisories_they_clear(
    fp     : FakeProcess,
    sample : Sample,
    tree   : Tree
):
    """
    Asserts that each package of the site's manifest `bun outdated` reports
    lifts to its latest release and each override to the release `bun info`
    tags latest, dated by `bun info`, that a Wrangler version a step passes
    lifts the same way, and that each of the site's lifts carries the
    advisory `bun audit` reports against the site's lockfile and not against
    a copy relocked on the newest releases.
    """
    sample.edit(
        "docs/package.json",
        new = '"overrides": {"fflate": "0.7.5"},\n    "private"',
        old = '"private"'
    )
    (sample.root / "docs" / "bun.lock").write_text("{}")
    (sample.root / "docs" / "bunfig.toml").write_text("")
    (sample.root / ".github" / "workflows" / "deploy.yml").write_text(
        "jobs:\n  deploy:\n    runs-on: ubuntu-26.04\n    steps:\n"
        "      - name: Deploy\n"
        f"        uses: cloudflare/wrangler-action@{'a' * 40}\n"
        "        with:\n          wranglerVersion: 4.149.0\n"
        "name: Deploy\non:\n  push:\n"
    )
    tool = ["mise", "-C", tree.root, "exec", "--", "bun"]

    def relock(process: FakePopen):
        """
        Asserts that the copy of the site's manifest carries each lift of
        the site before it is relocked.
        """
        copied = from_json(
            (Path(process.args[-2].removeprefix("--cwd=")) / "package.json").read_text()
        )

        assert copied["devDependencies"]["vitest"] == "5.1.0"
        assert copied["overrides"] == {"fflate": "0.8.3"}

    fp.register(
        [*tool, "outdated", f"--cwd={tree.root / 'docs'}"],
        stdout = (
            "| Package                   | Current | Update | Latest |\n"
            "|---------------------------|---------|--------|--------|\n"
            "| @vitest/coverage-v8 (dev) | 5.0.5   | 5.0.5  | 5.1.0  |\n"
            "|---------------------------|---------|--------|--------|\n"
            "| vitest (dev)              | 5.0.5   | 5.0.5  | 5.1.0  |\n"
        )
    )

    for name, version in {"fflate": "0.8.3", "wrangler": "4.152.0"}.items():
        fp.register(
            [*tool, "info", f"--cwd={tree.root / 'docs'}", name, "version", "--json"],
            stdout = dumps(version)
        )

    for name, version in {
        "@vitest/coverage-v8" : "5.1.0",
        "fflate"              : "0.8.3",
        "vitest"              : "5.1.0",
        "wrangler"            : "4.152.0"
    }.items():
        fp.register(
            [*tool, "info", f"--cwd={tree.root / 'docs'}", name, "time", "--json"],
            stdout = dumps(
                {"created": "2020-01-01T00:00:00Z", version: "2026-10-20T00:00:00Z"}
            )
        )

    fp.register(
        [*tool, "install", fp.any(max=1, min=1), "--lockfile-only"],
        callback = relock
    )
    fp.register(
        [*tool, "audit", f"--cwd={tree.root / 'docs'}", "--json"],
        returncode = 1,
        stdout = dumps({"fflate": [{"url": "https://github.com/advisories/GHSA-f"}]})
    )
    fp.register([*tool, "audit", fp.any(max=1, min=1), "--json"], stdout="{}")
    lifts = list(BunPins(tree=tree).lifts())

    assert [
        (str(lift.path), lift.name, lift.current, lift.newest, lift.advisories)
        for lift in lifts
    ] == [
        ("docs/package.json", "@vitest/coverage-v8", "5.0.5", "5.1.0", ()),
        ("docs/package.json", "vitest", "5.0.5", "5.1.0", ()),
        (
            "docs/package.json", "fflate", "0.7.5", "0.8.3",
            (
                Advisory(
                    id      = "GHSA-f",
                    link    = "https://github.com/advisories/GHSA-f",
                    package = "fflate"
                ),
            )
        ),
        (".github/workflows/deploy.yml", "wrangler", "4.149.0", "4.152.0", ())
    ]
    assert {lift.released for lift in lifts} == {datetime(2026, 10, 20, tzinfo=UTC)}

    for lift in lifts:
        lift.write(tree.root)

    assert sample.checkout.site.packages == {
        "@types/node"         : "26.6.5",
        "@vitest/coverage-v8" : "5.1.0",
        "vitest"              : "5.1.0"
    }
    assert "wranglerVersion: 4.152.0" in (
        tree.root / ".github" / "workflows" / "deploy.yml"
    ).read_text()


def test_the_python_packages_lift_through_uv_with_the_advisories_they_clear(
    answered : Sample,
    fp       : FakeProcess,
    tree     : Tree
):
    """
    Asserts that each package `uv lock --upgrade` moves lifts by upgrading
    it, that a task script's pin of a package `uv.lock` resolves follows
    `uv.lock`, that the build requirement lifts to the release a scratch
    project depending on it resolves, and that each lift carries the
    advisory the current audit reports and the newest audits do not.
    """
    tool = ["mise", "-C", tree.root, "exec", "--", "uv"]

    def upgrade(process: FakePopen):
        """
        Writes the lockfile `uv lock --upgrade` would, moving `minijinja`.
        """
        (target(process) / "uv.lock").write_text(
            '[[package]]\nname = "minijinja"\nversion = "3.0.3"\n'
            'sdist = { upload-time = "2026-10-23T08:00:00Z" }\n\n'
            '[[package]]\nname = "sample"\nsource = { editable = "." }\n'
        )

    def resolve(process: FakePopen):
        """
        Asserts that the scratch project depends on each exact pin no
        lockfile resolves, and writes the lockfile resolving them.
        """
        manifest = loads((target(process) / "pyproject.toml").read_text())

        assert manifest["project"]["dependencies"] == ["hatchling", "setuptools"]
        assert manifest["project"]["requires-python"] == ">=3.14"

        (target(process) / "uv.lock").write_text(
            '[[package]]\nname = "hatchling"\nversion = "1.33.0"\n\n'
            '[[package]]\nname = "setuptools"\nversion = "84.0.0"\n'
        )

    def audited(*packages: str) -> str:
        """
        Writes the report `uv audit` prints, flagging each of `packages`.
        """
        return dumps(
            {
                "vulnerabilities": [
                    {"id": f"GHSA-{package}", "dependency": {"name": package}}
                    for package in packages
                ]
            }
        )

    audit = [
        *tool,
        "audit", "--frozen", "--output-format",
        "json", "--preview-features", "audit-command,json-output"
    ]
    fp.register(
        [
            *tool,
            "lock", "--no-locked", "--no-python-downloads", "--project",
            fp.any(max=1, min=1),
            "--upgrade"
        ],
        callback = upgrade
    )
    fp.register(
        [
            *tool,
            "lock", "--no-locked", "--no-python-downloads", "--project",
            fp.any(max=1, min=1)
        ],
        callback = resolve
    )
    fp.register(
        [*audit, "--project", tree.root],
        returncode = 1,
        stdout     = audited("minijinja")
    )
    fp.register([*audit, "--script", fp.any(max=1, min=1)], stdout=audited())
    fp.register(
        [*audit, "--project", fp.any(max=1, min=1)],
        occurrences = 2,
        stdout      = audited()
    )
    cleared = (
        Advisory(
            id      = "GHSA-minijinja",
            link    = "https://osv.dev/vulnerability/GHSA-minijinja",
            package = "minijinja"
        ),
    )

    assert list(UvPins(tree=tree).lifts()) == [
        Lift(
            advisories = cleared,
            current    = "2.24.0",
            name       = "minijinja",
            newest     = "3.0.3",
            path       = Path("uv.lock"),
            released   = datetime(2026, 10, 23, 8, tzinfo=UTC),
            upgraded   = True
        ),
        Lift(
            current = "1.32.4",
            edits   = (
                Edit(
                    name     = "hatchling",
                    path     = Path("pyproject.toml"),
                    spelling = Spelling.REQUIREMENT,
                    version  = "1.33.0"
                ),
            ),
            name   = "hatchling",
            newest = "1.33.0",
            path   = Path("pyproject.toml")
        ),
        Lift(
            advisories = cleared,
            current    = "2.24.0",
            edits      = (
                Edit(
                    name     = "minijinja",
                    path     = Path(".mise/tasks/gha/brief"),
                    spelling = Spelling.REQUIREMENT,
                    version  = "3.0.3"
                ),
            ),
            name     = "minijinja",
            newest   = "3.0.3",
            path     = Path(".mise/tasks/gha/brief"),
            released = datetime(2026, 10, 23, 8, tzinfo=UTC)
        )
    ]


def test_the_tools_lagging_their_newest_release_lift_with_every_restatement(
    answered : Sample,
    fp       : FakeProcess,
    tree     : Tree
):
    """
    Asserts that each tool `mise outdated` reports against the checkout's
    config lifts to its newest release, dated by `mise ls-remote`, carrying
    the rewrites of the Python minor and the uv version the manifest and
    the task scripts restate, so the audit's pin and script checks pass once
    they are written, that a tool nothing restates carries its own rewrite
    alone, and that a tool another config requests stays out.
    """
    config = tree.root / ".mise" / "config.toml"
    fp.register(
        ["mise", "-C", tree.root, "outdated", "--bump", "--json", "--local"],
        stdout = dumps(
            {
                "node": {
                    "latest"    : "26.12.1",
                    "requested" : "26.11.1",
                    "source"    : {"path": str(config)}
                },

                "pnpm": {
                    "latest"    : "11.0.0",
                    "requested" : "10.0.0",
                    "source"    : {"path": "/elsewhere/mise.toml"}
                },

                "python": {
                    "latest"    : "3.15.1",
                    "requested" : "3.14.6",
                    "source"    : {"path": str(config)}
                },

                "uv": {
                    "latest"    : "0.13.5",
                    "requested" : "0.12.13",
                    "source"    : {"path": str(config)}
                }
            }
        )
    )
    fp.register(
        ["mise", "-C", tree.root, "ls-remote", "--json", "python"],
        stdout = dumps(
            [
                {"created_at": "2026-10-07T00:00:00Z", "version": "3.15.0"},
                {"created_at": "2026-10-21T00:00:00Z", "version": "3.15.1"}
            ]
        )
    )
    fp.register(
        ["mise", "-C", tree.root, "ls-remote", "--json", "node"],
        stdout = dumps([{"version": "26.12.1"}])
    )
    fp.register(
        ["mise", "-C", tree.root, "ls-remote", "--json", "uv"],
        stdout = dumps([{"version": "0.13.5"}])
    )
    lifts = list(MisePins(tree=tree).lifts())

    assert [
        (lift.name, lift.current, lift.newest, lift.released) for lift in lifts
    ] == [
        ("node", "26.11.1", "26.12.1", None),
        ("python", "3.14.6", "3.15.1", datetime(2026, 10, 21, tzinfo=UTC)),
        ("uv", "0.12.13", "0.13.5", None)
    ]
    assert lifts[0].edits == (
        Edit(
            name     = "node",
            path     = Path(".mise/config.toml"),
            spelling = Spelling.ASSIGNMENT,
            version  = "26.12.1"
        ),
    )

    for lift in lifts:
        lift.write(tree.root)

    answered.answer(fp)
    checkout = answered.checkout

    assert (checkout.mise.python, checkout.mise.uv) == ("3.15.1", "0.13.5")
    assert [
        *PinCheck(checkout=checkout).scan(),
        *ScriptCheck(checkout=checkout).scan()
    ] == []
