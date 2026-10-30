"""
Pins that the sample checkout passes every check in `scotch.repo.checks`,
and the findings each check reports once a file in the sample departs from
the rule the check holds.
"""

from collections.abc import Iterable
from common.sample   import Sample
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
    AnchorCheck,
    Check,
    CommandCheck,
    ContributingCheck,
    ExactPinCheck,
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
    SummaryCheck,
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


@mark.parametrize("check", Check.__subclasses__(), ids=lambda check: check.__name__)
def test_the_sample_passes_every_check(answered: Sample, check: type[Check]):
    """
    Asserts that the sample checkout, which keeps every rule, draws no
    finding from any check.
    """
    assert scan(check, answered) == []


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
            GateCheck,
            [(".github/workflows/warm.yml", "mise run gha:brief", "mise run py:test")],
            [(
                ".github/workflows/warm.yml", None,
                "The workflow ends on no gate job running `gha:brief`"
            )],
            id = "no-gate"
        ),
        param(
            GateCheck,
            [(".github/workflows/warm.yml", "    name: ⏱️ Brief\n", "")],
            [(".github/workflows/warm.yml", None, "The gate `brief` sets no name")],
            id = "unnamed-gate"
        ),
        param(
            GateCheck,
            [(".github/workflows/warm.yml", "name: ⏱️ Brief", "name: Brief")],
            [
                (
                    ".github/workflows/warm.yml",
                    None,
                    "The gate `brief` is named `Brief` where the other gates are named "
                    "`⏱️ Brief`"
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
                "The gate `brief` does not run under `always()`"
            )],
            id = "conditional-gate"
        ),
        param(
            GateCheck,
            [(".github/workflows/warm.yml", "      - kit\n", "      - nothing\n")],
            [(
                ".github/workflows/warm.yml", None,
                "The gate `brief` does not wait for `kit`"
            )],
            id = "ungated-job"
        ),
        param(
            ContributingCheck,
            [(
                ".github/CONTRIBUTING.md",
                "| `Coverage` | `mise run py:coverage` | A test fails |\n",
                ""
            )],
            [(
                ".github/CONTRIBUTING.md",
                None,
                "The checks table leaves out `Coverage`, "
                "which a pull-request workflow runs"
            )],
            id = "checks-table-row-missing"
        ),
        param(
            ContributingCheck,
            [(".github/CONTRIBUTING.md", "`mise lockfile`", "`mise run lock:check`")],
            [(
                ".github/CONTRIBUTING.md",
                None,
                "The checks table runs `Lockfiles` through `mise run lock:check` where "
                "its row runs `mise lockfile`"
            )],
            id = "checks-table-command"
        ),
        param(
            ContributingCheck,
            [(
                ".github/CONTRIBUTING.md", "| `Coverage` |",
                "| `Links` | `mise links` | A link leads nowhere |\n| `Coverage` |"
            )],
            [(
                ".github/CONTRIBUTING.md", None,
                "The checks table names `Links`, which no pull-request workflow runs"
            )],
            id = "checks-table-row-extra"
        ),
        param(
            ContributingCheck,
            [(".github/workflows/ci.yml", "task: py:coverage", "task: py:unlisted")],
            [(
                ".github/CONTRIBUTING.md",
                None,
                "The checks table runs `Coverage` through `mise run py:coverage` "
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
            RulesetCheck,
            [(
                ".github/rulesets/main.json", '"context": "⏱️ Brief"',
                '"context": "Brief"'
            )],
            [(
                ".github/rulesets/main.json",
                None,
                "The ruleset requires `Brief`, "
                "which no pull-request workflow's gate reports"
            )],
            id = "required-check-with-no-gate"
        ),
        param(
            RulesetCheck,
            [(".github/workflows/ci.yml", "  pull_request:\n", "  push:\n")],
            [(
                ".github/rulesets/main.json",
                None,
                "The ruleset requires `⏱️ Brief`, "
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
            [(".mise/tasks/gha/brief", '">=3.14"', '">=3.13"')],
            [
                (
                    ".mise/tasks/gha/brief", None,
                    "`requires-python` is `>=3.13` where the manifest declares `>=3.14`"
                )
            ],
            id = "script-python"
        ),
        param(
            ScriptCheck,
            [(".mise/tasks/gha/brief", "minijinja==2.24.0", "minijinja==2.23.0")],
            [
                (
                    ".mise/tasks/gha/brief",
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
                ".mise/tasks/gha/brief", '"minijinja==2.24.0"',
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
                    "  steps:\n    - name: Brief\n"
                    "      run: mise run gha:brief\n      shell: bash\n"
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


def test_each_problem_mise_reports_is_a_finding_at_its_task(
    fp     : FakeProcess,
    sample : Sample
):
    """
    Asserts that each problem `mise tasks validate` reports becomes a
    finding at the task's file, or at `.mise/config.toml` for a task with
    none, keeping the severity mise reports.
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
        )
    ]


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

    def unreadable() -> References:
        """
        Raises the error `References.read` raises for a block it could not
        read.
        """
        raise ValueError(
            "Line 3 of docs/references.bib holds a block bibtexparser could not read"
        )
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
        (
            Path("cited.md"),
            None,
            "Line 3 of docs/references.bib holds a block bibtexparser could not read"
        )
    ]
