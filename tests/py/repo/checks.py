"""
Pins the findings each check in `scotch.repo.checks` reports, and no other,
once a file in the sample checkout departs from the rule the check holds.
"""

from collections.abc import Iterable
from common.sample   import Sample
from json            import dumps
from pathlib         import Path
from pytest          import MonkeyPatch, mark, param
from pytest_subprocess.fake_process import FakeProcess

from scotch.citations.pages   import Mismatch
from scotch.citations.schemas import References
from scotch.docs.inventory    import Outputs
from scotch.docs.outputs      import Footnotes, Region
from scotch.repo.checkout     import Checkout
from scotch.repo.checks  import (
    ActionPinCheck,
    AliasCheck,
    AnchorCheck,
    Check,
    CommandCheck,
    ContributingCheck,
    DraftCheck,
    ExactPinCheck,
    FilterCheck,
    GateCheck,
    InputCheck,
    KitCheck,
    LabelCheck,
    LicenseCheck,
    NodeTypesCheck,
    PinCheck,
    RenderCheck,
    RowCheck,
    RulesetCheck,
    RunnerCheck,
    ScriptCheck,
    SettingsCheck,
    SitePinCheck,
    StopCheck,
    SummaryCheck,
    SuppressionCheck,
    TaskCheck,
    VitestCheck,
    WarmCheck,
    WrapperCheck
)
from scotch.repo.schemas      import Level


def scan(check: type[Check], sample: Sample) -> list[tuple[Path, int | None, str]]:
    """
    Runs `check` against a fresh checkout of `sample`, reading each finding
    as its path relative to the sample, its line, and its message.
    """
    return [
        (finding.path.relative_to(sample.root), finding.line, finding.message)
        for finding in check(checkout=sample.checkout).scan()
    ]


@mark.parametrize(
    ("check", "edits", "findings"),
    [
        param(
            ActionPinCheck,
            [(
                ".github/workflows/warm.yml", "actions/checkout@3d3c",
                "actions/checkout@0000"
            )],
            [
                (
                    ".github/workflows/warm.yml",
                    None,
                    "`actions/checkout` is pinned to "
                    "`000042e5aac5ba805825da76410c181273ba90b1` here and to "
                    "`3d3c42e5aac5ba805825da76410c181273ba90b1` elsewhere"
                )
            ],
            id = "action-pinned-twice"
        ),
        param(
            AnchorCheck,
            [(
                ".github/actions/provision/action.yml", "  tools:\n",
                "  tools: &tools\n"
            )],
            [
                (
                    ".github/actions/provision/action.yml",
                    9,
                    "The manifest carries a YAML anchor or alias, which GitHub's "
                    "action-manifest parser rejects"
                )
            ],
            id = "anchor"
        ),
        param(
            CommandCheck,
            [(".mise/tasks/site/install", " --frozen-lockfile", "")],
            [(
                ".mise/tasks/site/install",
                2,
                "`bun install` carries neither `--frozen-lockfile` nor "
                "`--lockfile-only`"
            )],
            id = "unfrozen-install"
        ),
        param(
            CommandCheck,
            [(".mise/tasks/site/install", "bun install --frozen-lockfile", "bun i")],
            [(
                ".mise/tasks/site/install",
                2,
                "`bun install` carries neither `--frozen-lockfile` nor "
                "`--lockfile-only`"
            )],
            id = "unfrozen-alias"
        ),
        param(
            CommandCheck,
            [(".mise/tasks/site/install", "--frozen-lockfile", "--lockfile-only")],
            [],
            id = "lockfile-only-install"
        ),
        param(
            CommandCheck,
            [(".mise/tasks/site/install", "bun install --frozen-lockfile", "bun init")],
            [],
            id = "another-command-opening-on-i"
        ),
        param(
            CommandCheck,
            [(
                ".mise/tasks/site/install", "bun install --frozen-lockfile",
                "bunx vitest"
            )],
            [(
                ".mise/tasks/site/install",
                2,
                "`bunx` and `bun x` can run a copy of a tool from outside "
                "`docs/node_modules`"
            )],
            id = "bunx"
        ),
        param(
            CommandCheck,
            [(
                ".mise/tasks/site/install", "bun install --frozen-lockfile",
                "bun x vitest"
            )],
            [(
                ".mise/tasks/site/install",
                2,
                "`bunx` and `bun x` can run a copy of a tool from outside "
                "`docs/node_modules`"
            )],
            id = "bun-x"
        ),
        param(
            CommandCheck,
            [(".mise/tasks/py/test", "--exact --locked", "--locked --exact")],
            [(
                ".mise/tasks/py/test", 2,
                "`uv run` does not open its arguments on `--exact --locked`"
            )],
            id = "unlocked-task"
        ),
        param(
            CommandCheck,
            [(".mise/bin/prose", "--exact --locked", "--locked --exact")],
            [(
                ".mise/bin/prose", 3,
                "`uv run` does not open its arguments on `--exact --locked`"
            )],
            id = "unlocked-wrapper"
        ),
        param(
            CommandCheck,
            [(
                ".mise/tasks/py/test", "--exact --locked pytest",
                "--exact --locked-dry pytest"
            )],
            [(
                ".mise/tasks/py/test", 2,
                "`uv run` does not open its arguments on `--exact --locked`"
            )],
            id = "unlocked-suffix"
        ),
        param(
            ExactPinCheck,
            [("pyproject.toml", "hatchling==1.32.4", "hatchling>=1.32")],
            [("pyproject.toml", None, "`hatchling>=1.32` is not an exact `==` pin")],
            id = "loose-build-pin"
        ),
        param(
            FilterCheck,
            [(".github/workflows/ci.yml", "'!docs/pages/**'", "'!src/**'")],
            [
                (
                    f"src/scotch/{path}",
                    None,
                    "No workflow ending on a gate fires on a pull request "
                    "changing the file"
                )
                for path in ("cli/run.py", "docs/stops.toml")
            ],
            id = "tracked-file-firing-nothing"
        ),
        param(
            FilterCheck,
            [(".github/workflows/site.yml", "      - rust/**\n", "")],
            [
                (
                    ".github/workflows/site.yml", None,
                    f"The `pull_request` filter leaves out `rust/{path}`, "
                    "which every gated workflow builds from"
                )
                for path in ("Cargo.toml", "src/boards.rs")
            ],
            id = "crate-firing-one-workflow"
        ),
        param(
            FilterCheck,
            [(".github/workflows/site.yml", "      - .mise/mise.lock\n", "")],
            [(
                ".github/workflows/site.yml",
                None,
                "The `pull_request` filter leaves out `.mise/mise.lock`, "
                "which every gated workflow builds from"
            )],
            id = "untracked-pin-firing-one-workflow"
        ),
        *[
            param(
                FilterCheck,
                [(".github/workflows/site.yml", f"      - {path}\n", "")],
                [(
                    ".github/workflows/site.yml", None,
                    f"The `pull_request` filter leaves out `{path}`, "
                    "which every gated workflow builds from"
                )],
                id = f"{kind}-firing-one-workflow"
            )
            for kind, path in (
                ("action", ".github/actions/provision/action.yml"),
                ("config", ".mise/config.toml")
            )
        ],
        param(
            GateCheck,
            [(
                ".github/workflows/warm.yml", "mise run gha:scoresheet",
                "mise run py:test"
            )],
            [(
                ".github/workflows/warm.yml", None,
                "The workflow ends on no gate job running `gha:scoresheet`"
            )],
            id = "no-gate"
        ),
        param(
            GateCheck,
            [(".github/workflows/warm.yml", "    name: 🖋️ Scoresheet\n", "")],
            [(
                ".github/workflows/warm.yml", None, "The gate `scoresheet` sets no name"
            )],
            id = "unnamed-gate"
        ),
        param(
            GateCheck,
            [(".github/workflows/warm.yml", "name: 🖋️ Scoresheet", "name: Scoresheet")],
            [
                (
                    ".github/workflows/warm.yml",
                    None,
                    "The gate `scoresheet` is named `Scoresheet` where the other "
                    "gates are named `🖋️ Scoresheet`"
                )
            ],
            id = "renamed-gate"
        ),
        param(
            GateCheck,
            [(
                ".github/workflows/warm.yml", "if: ${{ always() }}",
                "if: ${{ !cancelled() }}"
            )],
            [(
                ".github/workflows/warm.yml", None,
                "The gate `scoresheet` does not run under `always()`"
            )],
            id = "conditional-gate"
        ),
        param(
            GateCheck,
            [(".github/workflows/warm.yml", "      - kit\n", "      - nothing\n")],
            [(
                ".github/workflows/warm.yml", None,
                "The gate `scoresheet` does not wait for `kit`"
            )],
            id = "ungated-job"
        ),
        param(
            GateCheck,
            [(
                ".github/workflows/ci.yml", "${{ always() && !github",
                "${{ !cancelled() && !github"
            )],
            [(
                ".github/workflows/ci.yml", None,
                "The gate `scoresheet` does not run under `always()`"
            )],
            id = "guarded-gate-off-always"
        ),
        param(
            DraftCheck,
            [(".github/workflows/ci.yml", "      - ready_for_review\n", "")],
            [(
                ".github/workflows/ci.yml",
                None,
                "The `pull_request` trigger leaves out the `ready_for_review` "
                "activity type"
            )],
            id = "ready-for-review-left-out"
        ),
        param(
            DraftCheck,
            [(
                ".github/workflows/ci.yml",
                "    types:\n" + "".join(
                    f"      - {kind}\n" for kind in sorted(DraftCheck.types)
                ),
                ""
            )],
            [
                (
                    ".github/workflows/ci.yml", None,
                    f"The `pull_request` trigger leaves out the `{kind}` activity type"
                )
                for kind in sorted(DraftCheck.types)
            ],
            id = "default-types"
        ),
        param(
            DraftCheck,
            [(
                ".github/workflows/site.yml",
                "  press:\n    if: ${{ !github.event.pull_request.draft }}\n",
                "  press:\n"
            )],
            [(
                ".github/workflows/site.yml",
                None,
                "The job `press` does not skip a draft under "
                "`!github.event.pull_request.draft`"
            )],
            id = "unguarded-row"
        ),
        param(
            DraftCheck,
            [(
                ".github/workflows/site.yml",
                "  press:\n    if: ${{ !github.event.pull_request.draft }}\n",
                (
                    "  press:\n    if: ${{ always() && "
                    "!github.event.pull_request.draft }}\n"
                )
            )],
            [(
                ".github/workflows/site.yml",
                None,
                "The job `press` does not skip a draft under "
                "`!github.event.pull_request.draft`"
            )],
            id = "row-guard-joined-to-always"
        ),
        param(
            DraftCheck,
            [(
                ".github/workflows/ci.yml",
                "  check:\n    if: ${{ !github.event.pull_request.draft }}\n",
                "  check:\n"
            )],
            [(
                ".github/workflows/ci.yml",
                None,
                "The job `check` does not skip a draft under "
                "`!github.event.pull_request.draft`"
            )],
            id = "unguarded-first-row"
        ),
        param(
            DraftCheck,
            [(
                ".github/workflows/ci.yml",
                "if: ${{ always() && !github.event.pull_request.draft }}",
                "if: always()"
            )],
            [(
                ".github/workflows/ci.yml",
                None,
                "The job `scoresheet` does not skip a draft under "
                "`always() && !github.event.pull_request.draft`"
            )],
            id = "gate-on-always-alone"
        ),
        param(
            DraftCheck,
            [(
                ".github/workflows/ci.yml", "      - synchronize\n",
                "      - synchronize\n      - labeled\n"
            )],
            [],
            id = "extra-type-kept"
        ),
        param(
            DraftCheck,
            [(
                ".github/workflows/ci.yml",
                "if: ${{ always() && !github.event.pull_request.draft }}",
                "if: always() && !github.event.pull_request.draft"
            )],
            [],
            id = "unwrapped-gate-guard-kept"
        ),
        param(
            ContributingCheck,
            [(
                ".github/CONTRIBUTING.md",
                "| `CI / Coverage` | `mise run py:coverage` | A test fails |\n",
                ""
            )],
            [(
                ".github/CONTRIBUTING.md",
                None,
                "The checks table leaves out `CI / Coverage`, "
                "which a pull-request workflow runs"
            )],
            id = "checks-table-row-missing"
        ),
        param(
            ContributingCheck,
            [(
                ".github/CONTRIBUTING.md", "`CI / Lockfiles` | `mise lockfile`",
                "`CI / Lockfiles` | `mise run lock:check`"
            )],
            [(
                ".github/CONTRIBUTING.md",
                None,
                "The checks table runs `CI / Lockfiles` through `mise run lock:check` "
                "where its row runs `mise lockfile`"
            )],
            id = "checks-table-command"
        ),
        param(
            ContributingCheck,
            [(
                ".github/CONTRIBUTING.md",
                "| `CI / Coverage` |",
                "| `CI / Links` | `mise links` | A link leads nowhere |\n"
                "| `CI / Coverage` |"
            )],
            [(
                ".github/CONTRIBUTING.md",
                None,
                "The checks table names `CI / Links`, "
                "which no pull-request workflow runs"
            )],
            id = "checks-table-row-extra"
        ),
        param(
            ContributingCheck,
            [(".github/workflows/ci.yml", "task: py:coverage", "task: py:unlisted")],
            [(
                ".github/CONTRIBUTING.md",
                None,
                "The checks table runs `CI / Coverage` through `mise run py:coverage` "
                "where its row runs `mise run py:unlisted`"
            )],
            id = "checks-table-unlisted-task"
        ),
        param(
            ContributingCheck,
            [(
                ".github/workflows/warm.yml",
                "          tools: ${{ matrix.tools }}\n",
                "          tools: ${{ matrix.tools }}\n"
                "      - name: Run the task\n        run: mise run lock:check\n"
            )],
            [],
            id = "checks-table-row-outside-pull-requests"
        ),
        param(
            InputCheck,
            [
                (
                    ".github/workflows/ci.yml", "tools: python uv\n      - name: Write",
                    "tools: python uv\n          verbose: 'true'\n      - name: Write"
                )
            ],
            [(
                ".github/workflows/ci.yml", None,
                "`$/.github/actions/provision` declares no input `verbose`"
            )],
            id = "undeclared-input"
        ),
        param(
            KitCheck,
            [
                (
                    ".github/workflows/ci.yml", "tools: python uv\n      - name: Write",
                    "tools: python uv zizmor\n      - name: Write"
                )
            ],
            [
                (
                    ".github/workflows/ci.yml",
                    None,
                    "No step saves the tool cache `python uv zizmor`, which this "
                    "workflow restores"
                )
            ],
            id = "subset-unsaved"
        ),
        param(
            KitCheck,
            [(".github/workflows/warm.yml", "- python uv", "- zizmor")],
            [
                (
                    ".github/workflows/warm.yml",
                    None,
                    "No other step restores the tool cache `zizmor`, which this "
                    "workflow saves"
                )
            ],
            id = "subset-saved-alone"
        ),
        param(
            KitCheck,
            [
                (
                    ".github/workflows/ci.yml", "shared-key: scotch-python",
                    "shared-key: scotch-crate"
                )
            ],
            [
                (
                    ".github/workflows/ci.yml",
                    None,
                    "No step saves the Cargo cache `scotch-crate`, which this "
                    "workflow restores"
                ),
                (
                    ".github/workflows/warm.yml",
                    None,
                    "No other step restores the Cargo cache `scotch-python`, which "
                    "this workflow saves"
                )
            ],
            id = "cargo-key-unsaved"
        ),
        param(
            LabelCheck,
            [(".github/labels.toml", '"e6e6ff"', '"c62d42"')],
            [
                (
                    ".github/labels.toml", None,
                    "More than one label carries the color `c62d42`"
                ),
                (
                    ".github/labels.toml",
                    None,
                    "`🐞 bug` and `🗜️ build` sit 0.000 apart in OKLab, under the 0.15 "
                    "that keeps two pills apart"
                )
            ],
            id = "shared-label-color"
        ),
        param(
            LabelCheck,
            [(
                ".github/labels.toml",
                '[[labels]]\ncolor       = "e6e6ff"',
                '[[labels]]\ncolor       = "2d2566"\ndescription = "Again"\n'
                'name        = "🐞 bug"\n\n[[labels]]\ncolor       = "e6e6ff"'
            )],
            [(
                ".github/labels.toml", None,
                "More than one label carries the name `🐞 bug`"
            )],
            id = "shared-label-name"
        ),
        param(
            LabelCheck,
            [(".github/labels.toml", '"e6e6ff"', '"7e2d42"')],
            [(
                ".github/labels.toml",
                None,
                "`🐞 bug` and `🗜️ build` sit 0.149 apart in OKLab, under the 0.15 "
                "that keeps two pills apart"
            )],
            id = "label-colors-under-the-floor"
        ),
        param(
            LabelCheck,
            [(".github/labels.toml", '"e6e6ff"', '"7d2d42"')],
            [],
            id = "label-colors-over-the-floor"
        ),
        param(
            LabelCheck,
            [(".github/labels.toml", '"c62d42"', '"C62D42"')],
            [(
                ".github/labels.toml", None,
                "`labels.0.color`: String should match pattern '^[0-9a-f]{6}$'"
            )],
            id = "label-out-of-shape"
        ),
        param(
            LabelCheck,
            [(".github/release.yml", "  categories:", "  categories: [")],
            [(
                ".github/release.yml",
                None,
                "Value error, while parsing a flow node\nexpected the node content, but"
                " found '-'\n  in \"<unicode string>\", line 3, column 5:\n"
                '        - labels: ["🐞 bug"]\n        ^'
            )],
            id = "unparsable-changelog"
        ),
        param(
            LabelCheck,
            [(
                ".github/release.yml",
                '    - labels: ["🗜️ build"]\n      title: 🗜️ Build\n',
                ""
            )],
            [(
                ".github/release.yml", None,
                "`🗜️ build` sits in no release-notes category"
            )],
            id = "label-in-no-category"
        ),
        param(
            LabelCheck,
            [(".github/release.yml", '["🐞 bug"]', '["🐞 bug", "🗜️ build"]')],
            [(
                ".github/release.yml", None,
                "`🗜️ build` sits in more than one release-notes category"
            )],
            id = "label-in-two-categories"
        ),
        param(
            LabelCheck,
            [(".github/release.yml", '["🐞 bug"]', '["🐞 bug", "🦉 engine"]')],
            [(
                ".github/release.yml", None,
                "A category names `🦉 engine`, which the registry lacks"
            )],
            id = "category-naming-no-label"
        ),
        param(
            LabelCheck,
            [(".github/ISSUE_TEMPLATE/bug.md", '["🐞 bug"]', '["bug"]')],
            [(
                ".github/ISSUE_TEMPLATE/bug.md", None,
                "The template names `bug`, which the registry lacks"
            )],
            id = "template-naming-no-label"
        ),
        param(
            LabelCheck,
            [(".github/ISSUE_TEMPLATE/bug.md", '["🐞 bug"]', "5")],
            [(
                ".github/ISSUE_TEMPLATE/bug.md", None,
                "`labels`: Input should be a valid tuple"
            )],
            id = "template-out-of-shape"
        ),
        param(
            LicenseCheck,
            [("LICENSE.md", "Identifier: MIT", "Identifier: Apache-2.0")],
            [(
                "LICENSE.md",
                None,
                "The license file declares `Apache-2.0` while the manifest "
                "declares `MIT`"
            )],
            id = "license-identifier"
        ),
        param(
            LicenseCheck,
            [("LICENSE.md", "James Parkington", "Ada Lovelace")],
            [
                (
                    "LICENSE.md",
                    None,
                    "The copyright names Ada Lovelace while the manifest's authors are "
                    "James Parkington"
                )
            ],
            id = "license-holders"
        ),
        param(
            LicenseCheck,
            [("LICENSE.md", "Copyright (c) 2023 James Parkington\n", "")],
            [
                (
                    "LICENSE.md",
                    None,
                    "The copyright names no holder while the manifest's authors are "
                    "James Parkington"
                )
            ],
            id = "license-without-holder"
        ),
        param(
            NodeTypesCheck,
            [("docs/package.json", '"26.6.5"', '"25.6.5"')],
            [(
                "docs/package.json",
                None,
                "`@types/node` is `25.6.5`, whose major differs from the `node` "
                "`26.11.1` `.mise/config.toml` pins"
            )],
            id = "node-types-major"
        ),
        param(
            NodeTypesCheck,
            [
                ("docs/package.json", '"26.6.5"', '"25.6.5"'),
                (".mise/config.toml", 'node   = "26.11.1"\n', "")
            ],
            [],
            id = "node-unpinned"
        ),
        param(
            NodeTypesCheck,
            [("docs/package.json", '        "@types/node"         : "26.6.5",\n', "")],
            [],
            id = "node-types-unpinned"
        ),
        param(
            PinCheck,
            [(
                "pyproject.toml", 'requires-python = ">=3.14"',
                'requires-python = ">=3.13"'
            )],
            [(
                "pyproject.toml", None,
                "`requires-python` is `>=3.13` where `.mise/config.toml` sets `>=3.14`"
            )],
            id = "requires-python"
        ),
        param(
            PinCheck,
            [("pyproject.toml", 'target-version = "3.14"', 'target-version = "3.13"')],
            [
                (
                    "pyproject.toml",
                    None,
                    "`[tool.prose].target-version` is `3.13` where `.mise/config.toml` "
                    "sets `3.14`"
                )
            ],
            id = "target-version"
        ),
        param(
            PinCheck,
            [("pyproject.toml", '"==0.12.13"', '">=0.12"')],
            [
                (
                    "pyproject.toml",
                    None,
                    "`[tool.uv].required-version` is `>=0.12` where "
                    "`.mise/config.toml` sets `==0.12.13`"
                )
            ],
            id = "required-version"
        ),
        param(
            PinCheck,
            [
                (
                    ".mise/config.toml", 'uv     = "0.12.13"',
                    'uv     = "0.12.13"\n"github:wasm-bindgen/wasm-bindgen" = "0.2.130"'
                ),
                (
                    "rust/Cargo.toml", 'shakmaty = "0.30.2"',
                    'wasm-bindgen = { optional = true, version = "=0.2.129" }'
                )
            ],
            [
                (
                    "rust/Cargo.toml",
                    None,
                    "`wasm-bindgen` is `=0.2.129` where `.mise/config.toml` sets "
                    "`=0.2.130`"
                )
            ],
            id = "wasm-bindgen"
        ),
        param(
            PinCheck,
            [(
                ".mise/config.toml", 'uv     = "0.12.13"',
                'uv     = "0.12.13"\n"github:wasm-bindgen/wasm-bindgen" = "0.2.130"'
            )],
            [
                (
                    "rust/Cargo.toml", None,
                    "`wasm-bindgen` is `None` where `.mise/config.toml` sets `=0.2.130`"
                )
            ],
            id = "wasm-bindgen-unrequired"
        ),
        param(
            RowCheck,
            [(".github/workflows/ci.yml", "task: py:coverage", "task: py:test")],
            [
                (
                    ".github/workflows/ci.yml", None,
                    "The row running `py:test` is no dependency of `repo:ci`"
                ),
                (
                    ".mise/tasks/repo/ci", None,
                    "`repo:ci` depends on `py:coverage`, which no pull-request row runs"
                )
            ],
            id = "rows-and-ci-apart"
        ),
        param(
            RowCheck,
            [
                (
                    ".github/workflows/warm.yml",
                    "      - name: Install the tools and save",
                    "      - name: Test\n        run: mise run py:test\n"
                    "      - name: Install the tools and save"
                )
            ],
            [],
            id = "row-outside-pull-requests"
        ),
        param(
            RowCheck,
            [
                (
                    ".github/workflows/ci.yml",
                    "        run: mise run ${{ matrix.task }}\n",
                    "        run: mise run ${{ matrix.task }}\n"
                    "      - name: Write the total\n"
                    "        run: mise run gha:total -- out\n"
                )
            ],
            [],
            id = "workflow-step-in-a-row"
        ),
        param(
            RulesetCheck,
            [(
                ".github/rulesets/main.json", '"context": "🖋️ Scoresheet"',
                '"context": "Scoresheet"'
            )],
            [(
                ".github/rulesets/main.json",
                None,
                "The ruleset requires `Scoresheet`, "
                "which no pull-request workflow's gate reports"
            )],
            id = "required-check-with-no-gate"
        ),
        param(
            RulesetCheck,
            [
                (".github/workflows/ci.yml", "  pull_request:\n", "  push:\n"),
                (".github/workflows/site.yml", "  pull_request:\n", "  push:\n")
            ],
            [(
                ".github/rulesets/main.json",
                None,
                "The ruleset requires `🖋️ Scoresheet`, "
                "which no pull-request workflow's gate reports"
            )],
            id = "required-check-outside-pull-requests"
        ),
        param(
            RulesetCheck,
            [(
                ".github/rulesets/tags.json", '"release tag protection"',
                '"main branch protection"'
            )],
            [
                (
                    ".github/rulesets/main.json", None,
                    "Another ruleset carries the name `main branch protection` too"
                ),
                (
                    ".github/rulesets/tags.json", None,
                    "Another ruleset carries the name `main branch protection` too"
                )
            ],
            id = "shared-ruleset-name"
        ),
        param(
            RulesetCheck,
            [(".github/rulesets/tags.json", '"enforcement"', '"enforce"')],
            [
                (".github/rulesets/tags.json", None, "`enforcement`: Field required"),
                (
                    ".github/rulesets/tags.json", None,
                    "`enforce`: Extra inputs are not permitted"
                )
            ],
            id = "ruleset-out-of-shape"
        ),
        param(
            RulesetCheck,
            [(
                ".github/rulesets/tags.json", '"release tag protection",',
                '"release tag protection"'
            )],
            [(
                ".github/rulesets/tags.json", None,
                "Value error, Expecting ',' delimiter: line 3 column 3 (char 39)"
            )],
            id = "unparsable-ruleset"
        ),
        param(
            SettingsCheck,
            [(".github/settings.toml", "has_wiki ", "has_wikis")],
            [
                (
                    ".github/settings.toml", None,
                    "`repository.has_wiki`: Field required"
                ),
                (
                    ".github/settings.toml", None,
                    "`repository.has_wikis`: Extra inputs are not permitted"
                )
            ],
            id = "settings-out-of-shape"
        ),
        param(
            RunnerCheck,
            [
                (
                    ".github/workflows/warm.yml",
                    "runs-on: ubuntu-26.04\n    steps:\n      - name: Check",
                    "runs-on: ubuntu-24.04\n    steps:\n      - name: Check"
                )
            ],
            [
                (
                    ".github/workflows/warm.yml",
                    None,
                    "`kit` runs on `ubuntu-24.04` where the other jobs run on "
                    "`ubuntu-26.04`"
                )
            ],
            id = "runner-image"
        ),
        param(
            ScriptCheck,
            [(".mise/tasks/gha/scoresheet", '">=3.14"', '">=3.13"')],
            [
                (
                    ".mise/tasks/gha/scoresheet", None,
                    "`requires-python` is `>=3.13` where the manifest declares `>=3.14`"
                )
            ],
            id = "script-python"
        ),
        param(
            ScriptCheck,
            [(".mise/tasks/gha/scoresheet", "minijinja==2.24.0", "minijinja==2.23.0")],
            [
                (
                    ".mise/tasks/gha/scoresheet",
                    None,
                    "`minijinja` is pinned to `2.23.0` where `uv.lock` resolves "
                    "`2.24.0`"
                )
            ],
            id = "script-pin"
        ),
        param(
            ScriptCheck,
            [(
                ".mise/tasks/gha/scoresheet", '"minijinja==2.24.0"',
                '"minijinja==2.24.0", "rich==14.0.0"'
            )],
            [],
            id = "script-pin-outside-the-lock"
        ),
        param(
            SitePinCheck,
            [(
                "docs/package.json", '"vitest"              : "5.0.5"',
                '"vitest"              : "^5.0.5"'
            )],
            [(
                "docs/package.json", None,
                "`vitest` is `^5.0.5`, which is not one exact version"
            )],
            id = "loose-site-pin"
        ),
        param(
            SitePinCheck,
            [(
                "docs/package.json",
                '    "private"         : true,\n',
                '    "private"         : true,\n'
                '    "overrides"       : {"fflate": "~0.7.5"},\n'
            )],
            [(
                "docs/package.json", None,
                "`fflate` is `~0.7.5`, which is not one exact version"
            )],
            id = "loose-site-override"
        ),
        param(
            SitePinCheck,
            [(
                "docs/package.json",
                '    "private"         : true,\n',
                '    "private"         : true,\n'
                '    "dependencies"    : {"vue": "^3.5.44"},\n'
            )],
            [(
                "docs/package.json", None,
                "`vue` is `^3.5.44`, which is not one exact version"
            )],
            id = "loose-site-dependency"
        ),
        param(
            SitePinCheck,
            [(
                "docs/package.json",
                '    "private"         : true,\n',
                '    "private"         : true,\n'
                '    "optionalDependencies" : {"fsevents": ">=2.3.3"},\n'
            )],
            [(
                "docs/package.json", None,
                "`fsevents` is `>=2.3.3`, which is not one exact version"
            )],
            id = "loose-site-optional-dependency"
        ),
        param(
            SitePinCheck,
            [(
                "docs/package.json",
                '    "private"         : true,\n',
                '    "private"         : true,\n'
                '    "peerDependencies" : {"vue": "3.x"},\n'
            )],
            [(
                "docs/package.json", None,
                "`vue` is `3.x`, which is not one exact version"
            )],
            id = "loose-site-peer-dependency"
        ),
        param(
            SitePinCheck,
            [(
                "docs/package.json",
                '    "private"         : true,\n',
                '    "private"         : true,\n'
                '    "resolutions"     : {"picomatch": "^4.0.8"},\n'
            )],
            [(
                "docs/package.json", None,
                "`picomatch` is `^4.0.8`, which is not one exact version"
            )],
            id = "loose-site-resolution"
        ),
        param(
            SitePinCheck,
            [(
                ".github/workflows/warm.yml",
                "      - name: Install the tools and save their cache\n",
                "        with:\n          wranglerVersion: ^4.149.0\n"
                "      - name: Install the tools and save their cache\n"
            )],
            [(
                ".github/workflows/warm.yml", None,
                "`wranglerVersion` is `^4.149.0`, which is not one exact version"
            )],
            id = "loose-wrangler-version"
        ),
        param(
            SitePinCheck,
            [(
                ".github/workflows/warm.yml",
                "      - name: Install the tools and save their cache\n",
                "        with:\n          wranglerVersion: 4.149.0\n"
                "      - name: Install the tools and save their cache\n"
            )],
            [],
            id = "exact-wrangler-version"
        ),
        param(
            StopCheck,
            [("src/scotch/docs/stops.toml", "Cannot read <pgn>", "Cannot open <pgn>")],
            [
                (
                    "src/scotch/cli/run.py",
                    17,
                    "`Cannot read {}` is raised here and missing from"
                    " `src/scotch/docs/stops.toml`"
                ),
                (
                    "src/scotch/docs/stops.toml", None,
                    "`Cannot open <pgn>` is held by no file `modules` names"
                )
            ],
            id = "message-reworded"
        ),
        param(
            StopCheck,
            [("src/scotch/cli/run.py", "names no move: {word!r}", "no move: {word!r}")],
            [
                (
                    "src/scotch/cli/run.py",
                    12,
                    "`no move: '{}'` is raised here and missing from"
                    " `src/scotch/docs/stops.toml`"
                ),
                (
                    "src/scotch/docs/stops.toml", None,
                    "`names no move: '<word>'` is held by no file `modules` names"
                )
            ],
            id = "generated-line-reworded"
        ),
        param(
            StopCheck,
            [("src/scotch/docs/stops.toml", "external = true\n", "")],
            [(
                "src/scotch/docs/stops.toml",
                None,
                '`Invalid value "<pgn>" for PGN. "<pgn>" does not exist.` is held'
                " by no file `modules` names"
            )],
            id = "library-message-declared-internal"
        ),
        param(
            StopCheck,
            [("rust/src/boards.rs", "names no position", "holds no position")],
            [(
                "src/scotch/docs/stops.toml", None,
                "`names no position: <fen>` is held by no file `modules` names"
            )],
            id = "crate-message-reworded"
        ),
        param(
            StopCheck,
            [(
                "src/scotch/cli/run.py", 'f"Found problems in {pgn}:"',
                'f"Found {pgn}:"'
            )],
            [
                (
                    "src/scotch/cli/run.py",
                    15,
                    "`Found {}:` is raised here and missing from"
                    " `src/scotch/docs/stops.toml`"
                ),
                (
                    "src/scotch/docs/stops.toml", None,
                    "`Found problems in <pgn>:` is held by no file `modules` names"
                )
            ],
            id = "joined-line-reworded"
        ),
        param(
            SummaryCheck,
            [
                (
                    ".mise/tasks/py/coverage", "pytest --cov",
                    'pytest --cov >> "$GITHUB_STEP_SUMMARY"'
                ),
                (
                    ".github/actions/provision/action.yml",
                    "  steps:\n",
                    "  steps:\n    - name: Note\n"
                    '      run: echo >> "$GITHUB_STEP_SUMMARY"\n      shell: bash\n'
                )
            ],
            [
                (
                    ".github/workflows/ci.yml", None,
                    "`check` writes the step summary, which only the gate writes"
                ),
                (
                    ".github/actions/provision/action.yml", None,
                    "A step of the composite action writes the step summary"
                )
            ],
            id = "summary-writers"
        ),
        param(
            SummaryCheck,
            [
                (
                    ".mise/tasks/py/test", "--locked pytest",
                    '--locked pytest >> "$GITHUB_STEP_SUMMARY"'
                ),
                (
                    ".github/workflows/warm.yml",
                    "      - name: Install the tools and save",
                    "      - name: Test\n        run: .mise/tasks/py/test\n"
                    "      - name: Install the tools and save"
                )
            ],
            [(
                ".github/workflows/warm.yml", None,
                "`kit` writes the step summary, which only the gate writes"
            )],
            id = "summary-writer-run-by-path"
        ),
        param(
            SummaryCheck,
            [
                (
                    ".github/actions/provision/action.yml",
                    "  steps:\n",
                    "  steps:\n    - name: Scoresheet\n"
                    "      run: mise run gha:scoresheet\n      shell: bash\n"
                )
            ],
            [
                (
                    ".github/actions/provision/action.yml", None,
                    "A step of the composite action writes the step summary"
                )
            ],
            id = "summary-writer-in-the-composite"
        ),
        param(
            SuppressionCheck,
            [(
                "src/scotch/cli/run.py",
                "def opened(error: OSError):",
                "def opened(error: OSError):  "
                "# prose: ignore[unsorted-positionals, step-narration]"
            )],
            [
                (
                    "src/scotch/cli/run.py",
                    20,
                    "The comment carries `# prose: ignore[unsorted-positionals, "
                    "step-narration]`, a suppression directive of Prose, in place "
                    "of a `[tool.prose.rules.unsorted-positionals]` table in "
                    "`pyproject.toml`, or the URL of an issue at "
                    "`https://github.com/Jybbs/prose/issues` beside it"
                ),
                (
                    "src/scotch/cli/run.py",
                    20,
                    "The comment carries `# prose: ignore[unsorted-positionals, "
                    "step-narration]`, a suppression directive of Prose, in place "
                    "of a `[tool.prose.rules.step-narration]` table in "
                    "`pyproject.toml`, or the URL of an issue at "
                    "`https://github.com/Jybbs/prose/issues` beside it"
                )
            ],
            id = "directive-naming-rules"
        ),
        param(
            SuppressionCheck,
            [(
                "src/scotch/cli/run.py", 'raise SystemExit(f"Cannot read {pgn}")',
                'raise SystemExit(f"Cannot read {pgn}")  # prose: skip'
            )],
            [(
                "src/scotch/cli/run.py",
                17,
                "The comment carries `# prose: skip`, a suppression directive of "
                "Prose, in place of a `[tool.prose.rules.<rule>]` table in "
                "`pyproject.toml`, or the URL of an issue at "
                "`https://github.com/Jybbs/prose/issues` beside it"
            )],
            id = "bare-directive"
        ),
        param(
            SuppressionCheck,
            [(
                "src/scotch/cli/run.py", 'raise SystemExit(f"Cannot read {pgn}")',
                'raise SystemExit(f"Cannot read {pgn}")  # prose: skip[reflow-calls]'
            )],
            [(
                "src/scotch/cli/run.py",
                17,
                "The comment carries `# prose: skip[reflow-calls]`, a suppression "
                "directive of Prose, in place of a "
                "`[tool.prose.rules.reflow-calls]` table in `pyproject.toml`, or "
                "the URL of an issue at `https://github.com/Jybbs/prose/issues` "
                "beside it"
            )],
            id = "skip-naming-a-rule"
        ),
        param(
            SuppressionCheck,
            [(
                "src/scotch/cli/run.py", "\ndef game(",
                "\n#prose:keep\n# noqa # fmt: skip # yapf: enable\ndef game("
            )],
            [
                (
                    "src/scotch/cli/run.py",
                    6,
                    "The comment carries `#prose:keep`, a suppression directive of "
                    "Prose, in place of a `[tool.prose.rules.<rule>]` table in "
                    "`pyproject.toml`, or the URL of an issue at "
                    "`https://github.com/Jybbs/prose/issues` beside it"
                ),
                (
                    "src/scotch/cli/run.py",
                    7,
                    "The comment carries `# fmt: skip`, a suppression directive of "
                    "Prose, in place of a `[tool.prose.rules.<rule>]` table in "
                    "`pyproject.toml`"
                ),
                (
                    "src/scotch/cli/run.py",
                    7,
                    "The comment carries `# yapf: enable`, a suppression directive of "
                    "Prose, in place of a `[tool.prose.rules.<rule>]` table in "
                    "`pyproject.toml`"
                )
            ],
            id = "directives-sharing-a-comment"
        ),
        param(
            SuppressionCheck,
            [
                (
                    "src/scotch/cli/run.py", '"Cannot read {pgn}"',
                    '"Cannot read {pgn} # prose: skip"'
                ),
                (
                    "src/scotch/cli/run.py", "Holds the messages",
                    "Holds the `# fmt: off` messages"
                )
            ],
            [],
            id = "directive-in-a-string"
        ),
        param(
            SuppressionCheck,
            [(
                "src/scotch/cli/run.py", "\ndef game(",
                "\n# prose: offset # fmt: skipped\ndef game("
            )],
            [],
            id = "word-opening-on-a-directive"
        ),
        param(
            SuppressionCheck,
            [(".mise/tasks/gha/scoresheet", "# ///\n", "# ///\n# fmt: off\n")],
            [],
            id = "directive-outside-a-python-file"
        ),
        param(
            VitestCheck,
            [(
                "docs/package.json", '"@vitest/coverage-v8" : "5.0.5"',
                '"@vitest/coverage-v8" : "5.0.4"'
            )],
            [(
                "docs/package.json", None,
                "`@vitest/coverage-v8` is `5.0.4` where `vitest` is `5.0.5`"
            )],
            id = "coverage-provider"
        ),
        param(
            VitestCheck,
            [("docs/package.json", '        "@vitest/coverage-v8" : "5.0.5",\n', "")],
            [],
            id = "coverage-provider-unpinned"
        ),
        param(
            VitestCheck,
            [("docs/package.json", ',\n        "vitest"              : "5.0.5"', "")],
            [],
            id = "vitest-unpinned"
        ),
        param(
            WarmCheck,
            [(".github/workflows/warm.yml", "      - .mise/mise.lock\n", "")],
            [
                (
                    ".github/workflows/warm.yml",
                    None,
                    "The `push` filter leaves out `.mise/mise.lock`, which the cache "
                    "key depends on"
                )
            ],
            id = "push-filter"
        ),
        param(
            WarmCheck,
            [
                (
                    ".github/workflows/warm.yml",
                    "      - .mise/config.toml\n      - .mise/mise.lock\n",
                    "      - .mise/**\n"
                )
            ],
            [],
            id = "push-filter-glob"
        ),
        param(
            WarmCheck,
            [(".github/workflows/warm.yml", "      - rust/Cargo.lock\n", "")],
            [
                (
                    ".github/workflows/warm.yml",
                    None,
                    "The `push` filter leaves out `rust/Cargo.lock`, which the cache "
                    "key depends on"
                )
            ],
            id = "push-filter-crate"
        ),
        param(
            WarmCheck,
            [
                (
                    ".github/workflows/warm.yml",
                    "          shared-key: scotch-python\n",
                    ""
                ),
                (
                    ".github/workflows/warm.yml",
                    "      - rust/Cargo.lock\n      - rust/Cargo.toml\n",
                    ""
                )
            ],
            [],
            id = "push-filter-tools-alone"
        ),
        param(
            WrapperCheck,
            [(".mise/bin/pytest", "--exact --locked", "--locked --exact")],
            [(".mise/bin/pytest", None, "The wrapper's bytes differ from `prose`'s")],
            id = "wrapper-bytes"
        ),
        param(
            WrapperCheck,
            [(
                ".mise/bin/pytest",
                "exec uv run --exact --locked",
                "uv sync --inexact --locked --no-install-project "
                '--project "$root" || exit\n'
                "exec uv run --no-sync"
            )],
            [],
            id = "wrapper-inexact-sync"
        )
    ]
)
def test_a_departure_draws_the_checks_findings(
    answered : Sample,
    check    : type[Check],
    edits    : Iterable[tuple[str, str, str]],
    findings : Iterable[tuple[str, int | None, str]]
):
    """
    Asserts that the edits draw exactly the findings listed from the check,
    each at the file and the line it concerns, and none where the edits keep
    the rule.
    """
    for path, old, new in edits:
        answered.edit(path, new=new, old=old)

    assert scan(check, answered) == [(
        Path(path),
        line, message
    ) for path, line, message in findings]


@mark.parametrize(
    "path",
    [
        param(".mise/tasks/gha/order.py", id="task-script"),
        param("rust/build.py", id="outside-the-formatted-trees"),
        param("tests/py/repo/checks.py", id="test")
    ]
)
def test_a_directive_in_any_tracked_python_file_fails(
    fp     : FakeProcess,
    path   : str,
    sample : Sample
):
    """
    Asserts that a directive in a tracked Python file draws a finding at its
    line, whether or not `mise check` formats the file.
    """
    (file := sample.root / path).parent.mkdir(exist_ok=True, parents=True)
    file.write_text("# fmt: off\n")
    sample.answer(fp)

    assert [line for _, line, _ in scan(SuppressionCheck, sample)] == [1]


@mark.parametrize(
    "directive",
    [
        "# prose: off", "# prose: skip", "# prose: ignore",
        "# prose: keep", "# fmt: off", "# fmt: on",
        "# fmt: skip", "# yapf: disable", "# yapf: enable"
    ]
)
def test_each_listed_directive_fails(
    directive : str,
    fp        : FakeProcess,
    sample    : Sample
):
    """
    Asserts that each directive the Prose reference lists draws one finding
    naming it at its line.
    """
    (sample.root / "src" / "scotch" / "listed.py").write_text(f"\n{directive}\n")
    sample.answer(fp)

    assert [
        (line, message.split("`")[1])
        for _, line, message in scan(SuppressionCheck, sample)
    ] == [(2, directive)]


def test_a_literal_string_alias_is_a_finding_at_its_line(
    fp     : FakeProcess,
    sample : Sample
):
    """
    Asserts that a colliding alias written as a TOML literal string draws a
    finding at the line declaring it.
    """
    sample.edit(
        ".mise/tasks/py/test",
        new = "#MISE alias = 'audit'\nuv run",
        old = "uv run"
    )
    sample.answer(fp, aliases={"py:test": ("audit",)})

    assert scan(AliasCheck, sample) == [(
        Path(".mise/tasks/py/test"),
        2, "`mise audit` runs mise's own `audit` command rather than `py:test`"
    )]


def test_a_name_quoted_before_the_alias_leaves_the_finding_at_the_alias(
    fp     : FakeProcess,
    sample : Sample
):
    """
    Asserts that a colliding alias whose name a `description` quotes on an
    earlier line draws its finding at the line declaring the alias.
    """
    sample.edit(
        ".mise/tasks/py/test",
        new = '#MISE description = \'Wraps "audit"\'\n#MISE alias = "audit"\nuv run',
        old = "uv run"
    )
    sample.answer(fp, aliases={"py:test": ("audit",)})

    assert scan(AliasCheck, sample) == [(
        Path(".mise/tasks/py/test"),
        3, "`mise audit` runs mise's own `audit` command rather than `py:test`"
    )]


def test_a_trailing_comma_in_a_rule_list_names_no_empty_table(
    fp     : FakeProcess,
    sample : Sample
):
    """
    Asserts that a bracketed rule list ending on a comma draws one finding
    for each rule it names and none for the empty entry after the comma.
    """
    (sample.root / "src" / "scotch" / "listed.py").write_text(
        "# prose: ignore[step-narration, ]\n"
    )
    sample.answer(fp)

    assert [message for _, _, message in scan(SuppressionCheck, sample)] == [
        "The comment carries `# prose: ignore[step-narration, ]`, a suppression "
        "directive of Prose, in place of a `[tool.prose.rules.step-narration]` "
        "table in `pyproject.toml`, or the URL of an issue at "
        "`https://github.com/Jybbs/prose/issues` beside it"
    ]


@mark.parametrize(
    ("path", "text", "marker", "place"),
    [
        param(
            "rust/src/boards.rs",
            "#[allow(dead_code)]",
            "#[allow(",
            "a lint level in the `[lints]` table of `rust/Cargo.toml`",
            id = "allow"
        ),
        param(
            "rust/src/boards.rs",
            "#![allow(clippy::pedantic)]",
            "#![allow(",
            "a lint level in the `[lints]` table of `rust/Cargo.toml`",
            id = "inner-allow"
        ),
        param(
            "rust/src/boards.rs",
            "#[expect(unused)]",
            "#[expect(",
            "a lint level in the `[lints]` table of `rust/Cargo.toml`",
            id = "expect"
        ),
        param(
            "rust/src/boards.rs",
            "#![expect(unused)]",
            "#![expect(",
            "a lint level in the `[lints]` table of `rust/Cargo.toml`",
            id = "inner-expect"
        ),
        param(
            "docs/.vitepress/lib/listed.ts",
            "/* eslint-disable */",
            "eslint-disable",
            "a rule level in `docs/.vitepress/config/.oxlintrc.json`",
            id = "eslint-disable"
        ),
        param(
            "docs/.vitepress/lib/listed.ts",
            "const n = 1 // eslint-disable-line",
            "eslint-disable-line",
            "a rule level in `docs/.vitepress/config/.oxlintrc.json`",
            id = "eslint-disable-line"
        ),
        param(
            "docs/.vitepress/lib/listed.ts",
            "// eslint-disable-next-line no-console",
            "eslint-disable-next-line",
            "a rule level in `docs/.vitepress/config/.oxlintrc.json`",
            id = "eslint-disable-next-line"
        ),
        param(
            "docs/.vitepress/lib/listed.ts",
            "/* oxlint-disable */",
            "oxlint-disable",
            "a rule level in `docs/.vitepress/config/.oxlintrc.json`",
            id = "oxlint-disable"
        ),
        param(
            "docs/.vitepress/lib/listed.ts",
            "// oxlint-disable-next-line no-console",
            "oxlint-disable-next-line",
            "a rule level in `docs/.vitepress/config/.oxlintrc.json`",
            id = "oxlint-disable-next-line"
        ),
        param(
            "docs/.vitepress/theme/Listed.vue",
            "<!-- eslint-disable-next-line vue/no-v-html -->",
            "eslint-disable-next-line",
            "a rule level in `docs/.vitepress/config/.oxlintrc.json`",
            id = "vue-template-comment"
        ),
        param(
            "docs/.vitepress/lib/listed.ts",
            "// @ts-ignore",
            "@ts-ignore",
            "a compiler option in `docs/.vitepress/tsconfig.json`",
            id = "ts-ignore"
        ),
        param(
            "docs/.vitepress/lib/listed.ts",
            "// @ts-expect-error",
            "@ts-expect-error",
            "a compiler option in `docs/.vitepress/tsconfig.json`",
            id = "ts-expect-error"
        ),
        param(
            "docs/.vitepress/lib/listed.ts",
            "// @ts-nocheck",
            "@ts-nocheck",
            "a compiler option in `docs/.vitepress/tsconfig.json`",
            id = "ts-nocheck"
        )
    ]
)
def test_each_listed_marker_fails(
    fp     : FakeProcess,
    marker : str,
    path   : str,
    place  : str,
    sample : Sample,
    text   : str
):
    """
    Asserts that each Rust attribute and site comment the check lists draws
    one finding at its line naming the marker and the configuration that
    turns the check off in its place.
    """
    (file := sample.root / path).parent.mkdir(exist_ok=True, parents=True)
    file.write_text(f"\n{text}\n")
    sample.answer(fp)

    assert scan(SuppressionCheck, sample) == [(
        Path(path),
        2,
        f"The line carries `{marker}`, which silences a check in place of {place}"
    )]


def test_a_wrapper_that_is_a_symlink_fails(sample: Sample):
    """
    Asserts that a wrapper that is a symlink draws a finding naming it as
    one.
    """
    wrapper = sample.root / ".mise" / "bin" / "pytest"
    wrapper.unlink()
    wrapper.symlink_to("prose")

    assert scan(WrapperCheck, sample) == [
        (Path(".mise/bin/pytest"), None, "The wrapper is a symlink rather than a copy")
    ]


@mark.parametrize(
    ("path", "text"),
    [
        param("rust/src/boards.rs", "#[warn(missing_docs)]", id="warn"),
        param("rust/src/boards.rs", "#![deny(unsafe_code)]", id="deny"),
        param("docs/.vitepress/lib/listed.ts", "// @ts-check", id="ts-check"),
        param("docs/.vitepress/lib/listed.ts", "/* eslint-enable */", id="enable"),
        param(
            "docs/.vitepress/lib/listed.css",
            "/* eslint-disable */",
            id = "unlisted-suffix"
        ),
        param(
            "docs/pages/listed.md",
            "`#[allow(dead_code)]` and `// @ts-ignore`",
            id = "markdown"
        ),
        param(
            "src/scotch/listed.py",
            'marker = "#[allow(dead_code)] // @ts-ignore"',
            id = "python-string"
        ),
        param(
            "src/scotch/listed.py",
            "x = 1  # prose: skip https://github.com/Jybbs/prose/issues/12",
            id = "prose-issue-in-its-comment"
        ),
        param(
            "src/scotch/listed.py",
            "# https://github.com/Jybbs/prose/issues/12\nx = 1  # prose: keep",
            id = "prose-issue-on-the-line-above"
        ),
        param(
            "src/scotch/listed.py",
            "# prose: ignore[step-narration] https://github.com/Jybbs/prose/issues/7",
            id = "prose-issue-beside-a-rule-list"
        )
    ]
)
def test_a_marker_the_check_leaves_alone_passes(
    fp     : FakeProcess,
    path   : str,
    sample : Sample,
    text   : str
):
    """
    Asserts that a lint attribute other than `allow` and `expect`, a site
    comment that silences nothing, a marker in a file of a suffix the
    check does not read for it, and a Prose directive whose comment, or
    the comment on the line above, carries the URL of an issue on Prose's
    tracker draw no finding.
    """
    (file := sample.root / path).parent.mkdir(exist_ok=True, parents=True)
    file.write_text(f"\n{text}\n")
    sample.answer(fp)

    assert scan(SuppressionCheck, sample) == []


@mark.parametrize(
    ("listed", "lines"),
    [param(False, [], id="untracked"), param(True, [1], id="tracked")]
)
def test_a_marker_counts_only_in_a_file_git_tracks(
    fp     : FakeProcess,
    lines  : list[int],
    listed : bool,
    sample : Sample
):
    """
    Asserts that a marker in a file `git ls-files` leaves out,
    as with the `wasm-bindgen` module `rs:wasm` writes under
    `docs/.vitepress/lib/games/crate/`, draws no finding, while the same
    file once listed draws one at its line. `answer` registers the listing
    as the copy stands, so a file written after it stays out of the listing.
    """
    file = sample.root / "docs/.vitepress/lib/games/crate/scotch.d.ts"

    if not listed:
        sample.answer(fp)
    file.parent.mkdir(exist_ok=True, parents=True)
    file.write_text("/* eslint-disable */\n")
    if listed:
        sample.answer(fp)

    assert [found for _, found, _ in scan(SuppressionCheck, sample)] == lines


@mark.parametrize(
    ("source", "line"),
    [
        param(
            "# https://github.com/Jybbs/prose/issues/12\n\nx = 1  # prose: skip\n",
            3,
            id = "two-lines-above"
        ),
        param(
            "x = 1  # prose: skip\n# https://github.com/Jybbs/prose/issues/12\n",
            1,
            id = "on-the-line-below"
        ),
        param(
            "x = 1  # prose: skip https://github.com/Jybbs/prose/issues\n",
            1,
            id = "tracker-with-no-issue"
        ),
        param(
            "x = 1  # prose: skip https://github.com/Jybbs/scotch/issues/12\n",
            1,
            id = "another-tracker"
        ),
        param(
            'url = "https://github.com/Jybbs/prose/issues/12"\nx = 1  # prose: skip\n',
            2,
            id = "in-a-string-above"
        ),
        param(
            "x = 1  # fmt: skip https://github.com/Jybbs/prose/issues/12\n",
            1,
            id = "formatter-directive"
        ),
        param(
            "x = 1  # yapf: disable https://github.com/Jybbs/prose/issues/12\n",
            1,
            id = "yapf-directive"
        ),
        param(
            "x = 1  # prose: skip https://github.com/Jybbs/prose/issues/12abc\n",
            1,
            id = "issue-number-running-on"
        ),
        param(
            "x = 1  # prose: skip https://githubXcom/Jybbs/prose/issues/12\n",
            1,
            id = "tracker-dot-as-any-character"
        )
    ]
)
def test_a_directive_with_no_filed_prose_issue_beside_it_fails(
    fp     : FakeProcess,
    line   : int,
    sample : Sample,
    source : str
):
    """
    Asserts that a Prose directive with no URL of an issue on Prose's
    tracker in its comment or the comment on the line above, and a formatter
    directive beside any URL, draw a finding at the directive's line.
    """
    (sample.root / "src" / "scotch" / "listed.py").write_text(source)
    sample.answer(fp)

    assert [found for _, found, _ in scan(SuppressionCheck, sample)] == [line]


@mark.parametrize(
    "alias",
    [
        param("audit", id = "command"),
        param("cfg", id = "command-alias"),
        param("aliases", id = "second-alias"),
        param("current", id = "hidden-command"),
        param("help", id = "help-command"),
        param("backend-list", id = "wrapped-help-alias")
    ]
)
def test_a_task_alias_a_mise_command_takes_fails(
    alias  : str,
    fp     : FakeProcess,
    sample : Sample
):
    """
    Asserts that a task alias a command or a command alias of mise also
    takes, hidden or not, and whether the usage spec or `mise --help` names
    it, draws a finding at the line of the task file declaring it.
    """
    sample.edit(
        ".mise/tasks/py/test",
        new = f'#MISE alias = "{alias}"\nuv run',
        old = "uv run"
    )
    sample.answer(fp, aliases={"py:test": (alias,)})

    assert scan(AliasCheck, sample) == [(
        Path(".mise/tasks/py/test"),
        2,
        f"`mise {alias}` runs mise's own `{alias}` command rather than `py:test`"
    )]


def test_an_alias_in_a_multi_line_list_is_a_finding_at_its_line(
    fp     : FakeProcess,
    sample : Sample
):
    """
    Asserts that a colliding alias in a list wrapped one name to a line
    draws a finding at the line holding that name.
    """
    sample.edit(
        ".mise/tasks/py/test",
        new = '#MISE alias = [\n#MISE   "lockfile",\n#MISE   "audit",\n#MISE ]\nuv run',
        old = "uv run"
    )
    sample.answer(fp, aliases={"py:test": ("lockfile", "audit")})

    assert scan(AliasCheck, sample) == [(
        Path(".mise/tasks/py/test"),
        4, "`mise audit` runs mise's own `audit` command rather than `py:test`"
    )]


def test_an_alias_of_a_task_an_included_file_declares_is_a_finding_at_its_line(
    fp     : FakeProcess,
    sample : Sample
):
    """
    Asserts that a colliding alias of a task an included TOML file declares
    draws a finding at the line of that file declaring it.
    """
    sample.edit(
        ".mise/tasks/site.toml",
        new = '["site:press"]\nalias   = "audit"',
        old = '["site:press"]'
    )
    sample.answer(fp, aliases={"site:press": ("audit",)})

    assert scan(AliasCheck, sample) == [(
        Path(".mise/tasks/site.toml"),
        6, "`mise audit` runs mise's own `audit` command rather than `site:press`"
    )]


def test_an_alias_of_an_inline_task_is_a_finding_at_its_line_of_the_config(
    fp     : FakeProcess,
    sample : Sample
):
    """
    Asserts that a colliding alias of a task declared inline draws a finding
    at the line of `.mise/config.toml` declaring it, passing over the alias
    another task declares above it.
    """
    sample.edit(
        ".mise/config.toml",
        new = (
            'uv     = "0.12.13"\n\n'
            '[tasks."repo:audits"]\nalias = "audits"\nrun   = "true"\n\n'
            '[tasks."repo:inline"]\nalias = "audit"\nrun   = "true"'
        ),
        old = 'uv     = "0.12.13"'
    )
    sample.answer(fp, aliases={"repo:inline": ("audit",)})

    assert scan(AliasCheck, sample) == [(
        Path(".mise/config.toml"),
        14, "`mise audit` runs mise's own `audit` command rather than `repo:inline`"
    )]


def test_an_alias_of_an_inline_task_is_a_finding_at_the_config(
    fp     : FakeProcess,
    sample : Sample
):
    """
    Asserts that a colliding alias of a task with no file of its own draws a
    finding at `.mise/config.toml`.
    """
    sample.answer(fp, aliases={"repo:inline": ("audit",)})

    assert scan(AliasCheck, sample) == [(
        Path(".mise/config.toml"),
        None, "`mise audit` runs mise's own `audit` command rather than `repo:inline`"
    )]


@mark.parametrize(
    ("source", "path"),
    [
        param(".mise/tasks/repo.toml", ".mise/tasks/repo.toml", id="included"),
        param(None, ".mise/config.toml", id="unnamed")
    ]
)
def test_a_dependency_no_row_runs_is_a_finding_at_the_file_declaring_repo_ci(
    fp     : FakeProcess,
    path   : str,
    sample : Sample,
    source : str | None
):
    """
    Asserts that where `repo:ci` is declared in TOML, a dependency no
    pull-request row runs is a finding at the file mise names as the task's
    source, or at `.mise/config.toml` where mise names none, the listing
    keeping the `site:links` whose dependency on `site:install` takes that
    row's setup out of the checks.
    """
    fp.register(
        ["mise", "tasks", "ls", "--json", "--local"],
        stdout = dumps(
            [
                {
                    "file"    : None,
                    "name"    : "repo:ci",
                    "depends" : [
                        "lock:check", "py:coverage", "repo:extra",
                        "site:links", "site:press"
                    ],
                    "source"  : source and str(sample.root.resolve() / source)
                },
                {
                    "file"    : None,
                    "name"    : "site:links",
                    "depends" : ["site:install", "site:press"]
                }
            ]
        )
    )
    sample.answer(fp)

    assert scan(RowCheck, sample) == [
        (
            Path(path),
            None, "`repo:ci` depends on `repo:extra`, which no pull-request row runs"
        )
    ]


@mark.parametrize(
    ("old", "new", "findings"),
    [
        param(
            'run     = "vitepress build docs"',
            'run     = [{ task = "site:install" }, "bunx vitepress build docs"]',
            [(
                Path(".mise/tasks/site.toml"),
                7,
                "`bunx` and `bun x` can run a copy of a tool from outside "
                "`docs/node_modules`"
            )],
            id = "bunx-in-run"
        ),
        param(
            'run     = "vitepress build docs"',
            'run     = """\nvitepress build docs\nbunx lychee docs\n"""',
            [(
                Path(".mise/tasks/site.toml"),
                9,
                "`bunx` and `bun x` can run a copy of a tool from outside "
                "`docs/node_modules`"
            )],
            id = "bunx-on-a-later-line-of-run"
        ),
        param(
            'run     = "vitepress build docs"',
            'run     = ["bunx vitepress build docs", "lychee docs"]',
            [(
                Path(".mise/tasks/site.toml"),
                7,
                "`bunx` and `bun x` can run a copy of a tool from outside "
                "`docs/node_modules`"
            )],
            id = "bunx-in-an-earlier-string-of-run"
        ),
        param(
            'run     = "vitepress build docs"',
            'run     = ["vitepress build docs", "bunx lychee docs"]',
            [(
                Path(".mise/tasks/site.toml"),
                7,
                "`bunx` and `bun x` can run a copy of a tool from outside "
                "`docs/node_modules`"
            )],
            id = "bunx-in-a-later-string-of-run"
        ),
        param(
            'run     = "vitepress build docs"',
            'run     = "bun\\u0078 vitepress build docs"',
            [(
                Path(".mise/tasks/site.toml"),
                None,
                "`bunx` and `bun x` can run a copy of a tool from outside "
                "`docs/node_modules`"
            )],
            id = "bunx-through-an-escape"
        ),
        param(
            'depends = ["site:install"]\nrun     = "vitepress build docs"',
            'depends     = ["site:install"]\n'
            'description = "Build the site through bunx vitepress"\n'
            'run         = "vitepress build docs"',
            [],
            id = "bunx-in-description"
        )
    ]
)
def test_a_command_the_run_of_a_toml_task_holds_is_a_finding_at_its_line(
    findings : list[tuple[Path, int, str]],
    fp       : FakeProcess,
    new      : str,
    old      : str,
    sample   : Sample
):
    """
    Asserts that a refused command in the `run` of a task an included TOML
    file declares is a finding at the line of that file holding it, or
    at no line where the file holds it only through an escape, a table in
    `run` naming a task being passed over, and that a command the task's
    description names is none.
    """
    sample.edit(".mise/tasks/site.toml", new=new, old=old)
    sample.answer(fp)

    assert scan(CommandCheck, sample) == findings


def test_each_problem_mise_reports_is_a_finding_at_its_task(
    fp     : FakeProcess,
    sample : Sample
):
    """
    Asserts that each problem `mise tasks validate` reports becomes a
    finding at the file declaring the task, its script or the TOML file
    `mise tasks ls` names as its source, or at `.mise/config.toml` for a
    task the listing leaves out, keeping the severity mise reports.
    """
    sample.answer(
        fp,
        issues = (
            {
                "details"  : "Tasks: a, b",
                "message"  : "Alias 'x' is shared",
                "severity" : "error",
                "task"     : "repo:ci"
            },
            {
                "message"  : "Description is empty",
                "severity" : "warning",
                "task"     : "repo:inline"
            },
            {
                "message"  : "Description is empty",
                "severity" : "warning",
                "task"     : "site:links"
            },
            {
                "message"  : "Description is empty",
                "severity" : "warning",
                "task"     : "global:lint"
            }
        )
    )

    assert [
        (finding.path.relative_to(sample.root), finding.level, finding.message)
        for finding in TaskCheck(checkout=sample.checkout).scan()
    ] == [
        (
            Path(".mise/tasks/repo/ci"),
            Level.ERROR, "`repo:ci`: Alias 'x' is shared (Tasks: a, b)"
        ),
        (
            Path(".mise/config.toml"),
            Level.WARNING, "`repo:inline`: Description is empty"
        ),
        (
            Path(".mise/tasks/site.toml"),
            Level.WARNING, "`site:links`: Description is empty"
        ),
        (
            Path(".mise/config.toml"),
            Level.WARNING, "`global:lint`: Description is empty"
        )
    ]


@mark.parametrize(
    "alias",
    [
        param("lockfile", id = "free"),
        param("list", id = "subcommand-alias"),
        param("--no-timing", id = "flag-alias"),
        param("quoted", id = "help-text"),
        param("banner", id = "banner-line"),
        param("[TASK]", id = "help-argument"),
        param("--dir", id = "help-flag-alias")
    ]
)
def test_a_task_alias_no_mise_command_takes_passes(
    alias  : str,
    fp     : FakeProcess,
    sample : Sample
):
    """
    Asserts that an alias only a subcommand, a flag, the text of a help
    string, or a line of `mise --help` outside its `Commands:` section
    carries draws no finding.
    """
    sample.answer(fp, aliases={"py:test": (alias,)})

    assert scan(AliasCheck, sample) == []


def test_each_rendered_file_that_drifted_is_a_finding_at_its_place(
    monkeypatch : MonkeyPatch,
    references  : References,
    sample      : Sample
):
    """
    Asserts that each rendered file departing from its declaration is a
    finding at its page:

    - A region holding other than its declaration's text, naming the task
      that rewrites it
    - A footnote definition the page lacks, at its line, naming that task
    - A page whose markers no longer enclose one region, naming the error
    - A page citing a source from a bibliography bibtexparser could not
      read, naming the error
    """
    (sample.root / "drifted.md").write_text(
        "<!-- table -->\n| old |\n<!-- /table -->\n"
    )
    (sample.root / "cited.md").write_text("A claim.[^doe2020]\n")
    (sample.root / "broken.md").write_text("<!-- table -->\n")

    unread = (
        "Line 3 of src/scotch/citations/references.bib holds a block "
        "bibtexparser could not read"
    )

    def unreadable() -> References:
        """
        Raises the error `References.read` raises for a block it could not
        read.
        """
        raise ValueError(unread)
    monkeypatch.setattr(
        Checkout,
        "outputs",
        Outputs(
            [
                Region(name="table", path=Path("drifted.md"), render=lambda: "| new |"),
                Footnotes(path=Path("cited.md"), references=lambda: references),
                Region(name="table", path=Path("broken.md"), render=lambda: ""),
                Footnotes(path=Path("cited.md"), references=unreadable)
            ]
        )
    )

    assert scan(RenderCheck, sample) == [
        (
            Path("drifted.md"),
            None,
            "The file has drifted from what `scotch render docs` writes, which "
            "`mise run docs:render` rewrites"
        ),
        (
            Path("cited.md"),
            1,
            f"{Mismatch(key='doe2020', line=1).problem}, which `mise run docs:render`"
            " rewrites"
        ),
        (
            Path("broken.md"),
            None,
            "holds other than one <!-- table --> followed by one "
            "<!-- /table -->"
        ),
        (Path("cited.md"), None, unread)
    ]


def test_markers_sharing_a_line_each_fail(fp: FakeProcess, sample: Sample):
    """
    Asserts that a line carrying both a lint comment and a compiler
    directive draws one finding for each, in the order the check lists its
    markers.
    """
    (file := sample.root / "docs" / ".vitepress" / "lib" / "listed.ts").parent.mkdir(
        exist_ok = True,
        parents  = True
    )
    file.write_text("// @ts-ignore eslint-disable-line\n")
    sample.answer(fp)

    assert [message.split("`")[1] for _, _, message in scan(
        check  = SuppressionCheck,
        sample = sample
    )] == [
        "eslint-disable-line", "@ts-ignore"
    ]


def test_only_the_colliding_alias_of_a_list_fails(fp: FakeProcess, sample: Sample):
    """
    Asserts that a task listing several aliases on one line draws one
    finding, for the alias a mise command takes, at that line.
    """
    sample.edit(
        ".mise/tasks/py/test",
        new = '#MISE alias = ["lockfile", "cfg"]\nuv run',
        old = "uv run"
    )
    sample.answer(fp, aliases={"py:test": ("lockfile", "cfg")})

    assert scan(AliasCheck, sample) == [(
        Path(".mise/tasks/py/test"),
        2, "`mise cfg` runs mise's own `cfg` command rather than `py:test`"
    )]
