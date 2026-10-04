"""
Pins that the sample checkout passes every check in `scotch.repo.checks`,
and the findings each check reports once a file in the sample departs from
the rule the check holds.
"""

from collections.abc import Iterable
from common.sample   import Sample
from pathlib         import Path
from pytest          import mark, param
from pytest_subprocess.fake_process import FakeProcess

from scotch.repo.checks  import (
    ActionPinCheck,
    AnchorCheck,
    Check,
    ExactPinCheck,
    GateCheck,
    InputCheck,
    KitCheck,
    LicenseCheck,
    LockedRunCheck,
    PinCheck,
    RowCheck,
    RunnerCheck,
    ScriptCheck,
    SummaryCheck,
    TaskCheck,
    WarmCheck,
    WrapperCheck
)
from scotch.repo.schemas import Level


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
                    6,
                    "The manifest carries a YAML anchor or alias, which GitHub's "
                    "action-manifest parser rejects"
                )
            ],
            id = "anchor"
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
                    "No step saves the tool cache for `python uv zizmor`, which this "
                    "workflow installs"
                )
            ],
            id = "subset-unsaved"
        ),
        param(
            KitCheck,
            [(".github/workflows/warm.yml", "- python uv", "- zizmor")],
            [
                *[
                    (
                        ".github/workflows/ci.yml",
                        None,
                        "No step saves the tool cache for `python uv`, which this "
                        "workflow installs"
                    )
                ] * 3,
                (
                    ".github/workflows/warm.yml",
                    None,
                    "No other step installs `zizmor`, whose tool cache this workflow "
                    "saves"
                )
            ],
            id = "subset-saved-alone"
        ),
        param(
            LicenseCheck,
            [("LICENSE.md", "MIT License", "Apache License")],
            [(
                "LICENSE.md",
                None,
                "The license file is titled `Apache License` while the manifest "
                "declares `MIT`"
            )],
            id = "license-title"
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
            LockedRunCheck,
            [(".mise/tasks/py/test", "--exact --locked", "--locked --exact")],
            [(
                ".mise/tasks/py/test", 2,
                "`uv run` does not open its arguments on `--exact --locked`"
            )],
            id = "unlocked-task"
        ),
        param(
            LockedRunCheck,
            [(".mise/bin/prose", "--exact --locked", "--locked --exact")],
            [(
                ".mise/bin/prose", 3,
                "`uv run` does not open its arguments on `--exact --locked`"
            )],
            id = "unlocked-wrapper"
        ),
        param(
            LockedRunCheck,
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
    Asserts that each departure the edits pose draws exactly the findings
    the check reports for it, at the file and the line each concerns.
    """
    for path, old, new in edits:
        answered.edit(path, new=new, old=old)

    assert scan(check, answered) == [(
        Path(path),
        line, message
    ) for path, line, message in findings]


def test_a_wrapper_that_is_a_symlink_fails(sample: Sample):
    """
    Asserts that a wrapper that is a symlink draws a finding, since git
    checks one out as a plain file holding the link's target wherever
    `core.symlinks` is off.
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
