"""
Pins what each record in `scotch.repo.schemas` reads out of the file it
describes, and the facts the checks read off those records.
"""

from common.sample import Sample
from datetime      import UTC, datetime
from pathlib       import Path
from pydantic      import ValidationError
from pytest        import mark, param, raises

from scotch.repo.schemas import (
    Action,
    Cache,
    Finding,
    Format,
    Issue,
    Job,
    Level,
    License,
    Lock,
    MiseConfig,
    Package,
    Pyproject,
    Script,
    Step,
    Task,
    Workflow,
    exact,
    normalized,
    pinned
)


@mark.parametrize(
    ("finding", "output", "rendered"),
    [
        param(
            Finding(line=3, message="Drifted", path=Path("a/b.yml")),
            Format.TEXT,
            "a/b.yml:3: error: Drifted",
            id = "text-error-at-a-line"
        ),
        param(
            Finding(level=Level.WARNING, message="Drifted", path=Path("a/b.yml")),
            Format.TEXT,
            "a/b.yml: warning: Drifted",
            id = "text-warning-at-a-file"
        ),
        param(
            Finding(line=3, message="100% off\r\nnext", path=Path("a,b:c.yml")),
            Format.GITHUB,
            "::error file=a%2Cb%3Ac.yml,line=3::100%25 off%0D%0Anext",
            id = "github-escaped"
        ),
        param(
            Finding(level=Level.WARNING, message="Drifted", path=Path("a.yml")),
            Format.GITHUB,
            "::warning file=a.yml::Drifted",
            id = "github-at-a-file"
        )
    ]
)
def test_a_finding_renders_in_each_format(
    finding  : Finding,
    output   : Format,
    rendered : str
):
    """
    Asserts that a finding prints as its path, its line where it has one,
    its level, and its message, or as the workflow command of its level,
    escaping `%` and line breaks in the message and `,` and `:` in the file
    property as GitHub's command syntax requires, and leaving out the line
    where it has none.
    """
    assert finding.render(output) == rendered


@mark.parametrize(
    "new",
    [
        param('license-files   = "LICENSE.md"', id="field-out-of-shape"),
        param("license-files   = ", id="unparsable-toml")
    ]
)
def test_a_file_out_of_its_records_shape_fails_naming_the_file(
    new    : str,
    sample : Sample
):
    """
    Asserts that a file failing to parse, or to validate as its record,
    raises the validation error titled with the file's path.
    """
    sample.edit("pyproject.toml", new=new, old='license-files   = ["LICENSE.md"]')
    path = sample.root / "pyproject.toml"

    with raises(ValidationError) as error:
        Pyproject.read(path)

    assert error.value.title == str(path)


@mark.parametrize(
    ("text", "identifier", "holders"),
    [
        param(
            "Copyright (C) 2023 James Parkington\n\nSPDX-License-Identifier: "
            "GPL-3.0-or-later\n\nCopyright (C) 2007 Free Software Foundation\n",
            "GPL-3.0-or-later",
            ("James Parkington",),
            id = "one"
        ),
        param(
            "Copyright (c) 2021-2023 Ada Lovelace, Alan Turing and Grace Hopper\n\n"
            "SPDX-License-Identifier: MIT\n",
            "MIT",
            ("Ada Lovelace", "Alan Turing", "Grace Hopper"),
            id = "several"
        ),
        param(
            "The Unlicense\n\nThis is free and unencumbered software.\n",
            None,
            (),
            id = "none"
        )
    ]
)
def test_a_license_reads_its_identifier_and_holders(
    holders    : tuple[str, ...],
    identifier : str | None,
    text       : str,
    tmp_path   : Path
):
    """
    Asserts that a license file reads the SPDX expression its
    `SPDX-License-Identifier` line declares and the names after the years
    on its first copyright line as its holders, split on the commas and the
    `and` between them.
    """
    path = tmp_path / "LICENSE.md"
    path.write_text(text)

    assert License.read(path) == License(
        holders    = holders,
        identifier = identifier,
        path       = path
    )


def test_a_job_pairs_each_legs_check_name_with_its_tasks():
    """
    Asserts that a job names each leg's check from the matrix expression in
    its `name`, beside each task the leg runs.
    """
    job = Job.model_validate(
        {
            "id"       : "check",
            "name"     : "${{ matrix.name }}",
            "runs-on"  : "ubuntu-26.04",
            "steps"    : [{"run": "mise run ${{ matrix.task }}"}],
            "strategy" : {
                "matrix": {
                    "include": [
                        {"name": "Lockfiles", "task": "lock:check"},
                        {"name": "Coverage", "task": "py:coverage"}
                    ]
                }
            }
        }
    )

    assert job.checks == (("Lockfiles", "lock:check"), ("Coverage", "py:coverage"))


def test_a_job_reads_one_need_as_a_list():
    """
    Asserts that a job's `needs` reads a single job as a list of one.
    """
    assert Job.model_validate(
        {"id": "brief", "needs": "check", "runs-on": "ubuntu-26.04"}
    ).needs == ("check",)


def test_a_lockfile_finds_the_version_it_resolves(sample: Sample):
    """
    Asserts that the lockfile returns the version it resolves for a package,
    an empty version for a package locked from a path, and `None` for a
    package it does not resolve.
    """
    lock = Lock.read(sample.root / "uv.lock")

    assert lock.version("minijinja") == "2.24.0"
    assert lock.version("sample") == ""
    assert lock.version("pyyaml") is None
    assert lock.package("minijinja") == Package(name="minijinja", version="2.24.0")
    assert lock.package("pyyaml") is None


def test_a_package_dates_its_release_by_its_earliest_upload():
    """
    Asserts that a package reads its release as the earliest upload among
    its source distribution and its wheels, passing over a file the lockfile
    records no upload for, and as `None` where it records none.
    """
    package = Package.model_validate(
        {
            "name"    : "polars",
            "version" : "2.0.0",
            "sdist"   : {"upload-time": "2026-10-06T11:51:29.679Z"},
            "wheels"  : [{"upload-time": "2026-10-06T11:44:04.327Z"}, {}]
        }
    )

    assert package.released == datetime(2026, 10, 6, 11, 44, 4, 327000, tzinfo=UTC)
    assert Package(name="sample").released is None


@mark.parametrize(
    ("name", "expected"),
    [
        param("MiniJinja", "minijinja", id="case"),
        param("trove_classifiers", "trove-classifiers", id="underscore"),
        param("zope.interface", "zope-interface", id="dot"),
        param("a-_.b", "a-b", id="run")
    ]
)
def test_a_name_normalizes_as_pep_503_sets_out(expected: str, name: str):
    """
    Asserts that a project's name lowers its case and folds each run of `-`,
    `_`, and `.` into one `-`.
    """
    assert normalized(name) == expected


@mark.parametrize(
    ("version", "matches"),
    [
        param("5.0.5", True, id="release"),
        param("2.0.0-alpha.20", True, id="prerelease"),
        param("1.0.0+build.5", True, id="build"),
        param("^5.0.5", False, id="caret"),
        param("~0.7.5", False, id="tilde"),
        param("5.0", False, id="short"),
        param("5.0.5 || 6.0.0", False, id="either")
    ]
)
def test_an_exact_version_names_one_release(matches: bool, version: str):
    """
    Asserts that only a major, a minor, and a patch, with an optional
    prerelease and build, match the shape of one exact version as npm writes
    it.
    """
    assert bool(exact(version)) is matches


@mark.parametrize(
    ("requirement", "matches"),
    [
        param("hatchling==1.32.4", True, id="exact"),
        param("trove-classifiers==2026.9.21.13", True, id="calendar"),
        param("hatchling>=1.32", False, id="floor"),
        param("hatchling==1.*", False, id="wildcard"),
        param("hatchling", False, id="bare")
    ]
)
def test_an_exact_pin_names_one_version(matches: bool, requirement: str):
    """
    Asserts that only a name, `==`, and one version with no wildcard match
    the shape of an exact pin.
    """
    assert bool(pinned(requirement)) is matches


def test_a_script_declaring_no_metadata_reads_as_none(sample: Sample):
    """
    Asserts that a file carrying no `script` block reads as `None`.
    """
    assert Script.read(sample.root / ".mise" / "tasks" / "py" / "test") is None


def test_a_script_reads_its_inline_metadata(sample: Sample):
    """
    Asserts that a task script reads the dependencies and `requires-python`
    its inline metadata declares, and maps each exact pin to its version
    under the name PEP 503 normalizes.
    """
    sample.edit(
        ".mise/tasks/gha/brief",
        new = '["Mini_Jinja==2.24.0", "rich"]',
        old = '["minijinja==2.24.0"]'
    )
    script = Script.read(sample.root / ".mise" / "tasks" / "gha" / "brief")

    assert script.dependencies == ("Mini_Jinja==2.24.0", "rich")
    assert script.python == ">=3.14"
    assert script.pins == {"mini-jinja": "2.24.0"}


def test_a_step_expands_the_matrix_expressions_in_its_inputs_and_script():
    """
    Asserts that expanding a step against one leg replaces each matrix
    expression in its inputs and its script with that leg's value, an
    expression naming a key the leg lacks with nothing, leaving an input
    that is no string as it stands.
    """
    step = Step.model_validate(
        {
            "run"  : "mise run ${{ matrix.task }}${{ matrix.absent }}",
            "with" : {"depth": 2, "tools": "${{matrix.tools}}"}
        }
    )
    expanded = step.expand({"task": "py:check", "tools": "python uv"})

    assert expanded.run == "mise run py:check"
    assert expanded.inputs == {"depth": 2, "tools": "python uv"}


@mark.parametrize(
    ("aliases", "command"),
    [
        param(("lockfile",), "mise lockfile", id="aliased"),
        param((), "mise run lock:check", id="unaliased")
    ]
)
def test_a_task_runs_through_its_alias_where_it_has_one(
    aliases : tuple[str, ...],
    command : str
):
    """
    Asserts that a task's command runs it through its first alias where it
    has one, and through `mise run` and its name otherwise.
    """
    task = Task(
        aliases = aliases,
        depends = (),
        file    = None,
        name    = "lock:check"
    )

    assert task.command == command


def test_a_step_reads_the_tasks_tools_and_summary_its_inputs_and_script_name():
    """
    Asserts that a step reads the tasks its script runs through `mise
    run`, the tools its `tools` input names as a set, the cache each of
    its `tools` and `shared-key` inputs names, whether it saves them, and
    whether its script names the step summary.
    """
    step = Step.model_validate(
        {
            "run": (
                "mise run lock:check && mise run py:test\n"
                'echo x >> "$GITHUB_STEP_SUMMARY"'
            ),
            "with": {"save": "true", "tools": "uv python"}
        }
    )

    assert step.tasks == ("lock:check", "py:test")
    assert step.tools == frozenset({"python", "uv"})
    assert step.caches == {Cache.TOOLS: "python uv"}
    assert step.saves
    assert step.writes_summary
    assert not Step.model_validate({"with": {"save": "false"}}).saves
    assert Step.model_validate({"with": {"shared-key": "scotch-crate"}}).caches == {
        Cache.CARGO: "scotch-crate"
    }
    assert Step().tools == frozenset()
    assert Step().caches == {}


def test_a_step_splits_what_it_uses():
    """
    Asserts that a step splits a remote action from the commit it is pinned
    to, and reads a local action as having no pin.
    """
    remote = Step(uses="actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1")
    local  = Step(uses="$/.github/actions/provision")

    assert (
        remote.action, remote.pin
    ) == ("actions/checkout", "3d3c42e5aac5ba805825da76410c181273ba90b1")
    assert (local.action, local.pin) == ("$/.github/actions/provision", "")


def test_a_task_without_a_file_writes_no_summary():
    """
    Asserts that a task declared inline, which has no file, reads as never
    writing the step summary.
    """
    assert not Task(depends=(), file=None, name="repo:inline").writes_summary


def test_a_workflow_lists_each_job_its_gate_leaves_out(sample: Sample):
    """
    Asserts that a workflow lists each job its gate does not wait for, and
    nothing where it has no gate at all.
    """
    sample.edit(".github/workflows/ci.yml", new="needs: []", old="needs: check")

    assert Workflow.read(
        sample.root / ".github" / "workflows" / "ci.yml"
    ).ungated == ("check",)

    sample.edit(
        ".github/workflows/ci.yml",
        new = "mise run py:test",
        old = "mise run gha:brief"
    )
    workflow = Workflow.read(sample.root / ".github" / "workflows" / "ci.yml")

    assert workflow.gate is None
    assert workflow.ungated == ()


@mark.parametrize(
    ("matrix", "legs"),
    [
        param({}, ({},), id="none"),
        param(
            {"os": ["a", "b"], "tools": ["x", "y"]},
            (
                {"os": "a", "tools": "x"},
                {"os": "a", "tools": "y"},
                {"os": "b", "tools": "x"},
                {"os": "b", "tools": "y"}
            ),
            id = "axes"
        ),
        param(
            {"include": [{"task": "a"}, {"task": "b"}]},
            ({"task": "a"}, {"task": "b"}),
            id = "include"
        ),
        param(
            {"include": [{"task": "b"}], "tools": ["x", "y"]},
            ({"task": "b", "tools": "x"}, {"task": "b", "tools": "y"}),
            id = "include-merged"
        ),
        param(
            {
                "include" : [{"task": "b", "tools": "x"}, {"tools": "z"}],
                "tools"   : ["x", "y"]
            },
            ({"task": "b", "tools": "x"}, {"tools": "y"}, {"tools": "z"}),
            id = "include-matched-or-added"
        )
    ]
)
def test_a_job_expands_its_matrix_into_legs(
    legs   : tuple[dict[str, str], ...],
    matrix : dict[str, list[str] | list[dict[str, str]]]
):
    """
    Asserts that a job crosses every axis value with every other axis's,
    merges an `include` entry into each leg it overwrites no axis value of,
    takes an entry fitting no leg as a leg of its own, and runs one empty
    leg where it declares no matrix.
    """
    job = Job.model_validate(
        {"id": "check", "runs-on": "ubuntu-26.04", "strategy": {"matrix": matrix}}
    )

    assert job.legs == legs


@mark.parametrize(
    ("condition", "always"),
    [
        param("always()", True, id="bare"),
        param("${{ always() }}", True, id="wrapped"),
        param("${{ !cancelled() }}", False, id="other"),
        param("", False, id="none")
    ]
)
def test_a_job_reads_whether_it_runs_always(always: bool, condition: str):
    """
    Asserts that a job runs under `always()` whether or not its condition is
    wrapped in `${{ }}`, and under no other condition.
    """
    assert Job.model_validate(
        {"id": "brief", "if": condition, "runs-on": "ubuntu-26.04"}
    ).always is always


def test_a_workflow_lists_the_files_its_push_filter_leaves_out(sample: Sample):
    """
    Asserts that a workflow lists each cache its steps save and, relative to
    the root, each file and its own file that its `push` filter leaves out,
    and reads no filter where it fires on no push, matching each pattern of
    the filter so that:

    - `*` stops at a `/`
    - A `**` segment spans folders
    - A later `!` pattern leaves out what an earlier one took in
    """
    root = sample.root
    warm = Workflow.read(root / ".github" / "workflows" / "warm.yml")
    ci   = Workflow.read(root / ".github" / "workflows" / "ci.yml")

    assert warm.saved == {Cache.CARGO, Cache.TOOLS}
    assert warm.paths[0] == ".github/actions/provision/action.yml"
    assert warm.unfiltered([root / ".mise" / "config.toml"], root) == []
    assert warm.unfiltered([root / "uv.lock"], root) == [Path("uv.lock")]
    assert ci.paths == ()
    assert ci.unfiltered([], root) == [Path(".github/workflows/ci.yml")]

    sample.edit(
        ".github/workflows/warm.yml",
        new = "      - .mise/*.toml\n",
        old = "      - .mise/config.toml\n"
    )
    globbed = Workflow.read(root / ".github" / "workflows" / "warm.yml")

    assert globbed.unfiltered([root / ".mise" / "config.toml"], root) == []
    assert globbed.unfiltered([root / ".mise" / "tasks" / "py" / "test"], root) == [
        Path(".mise/tasks/py/test")
    ]

    sample.edit(
        ".github/workflows/warm.yml",
        new = '      - .mise/**\n      - "!.mise/mise.lock"\n',
        old = "      - .mise/*.toml\n      - .mise/mise.lock\n"
    )
    negated = Workflow.read(root / ".github" / "workflows" / "warm.yml")

    assert negated.unfiltered([root / ".mise" / "mise.lock"], root) == [Path(
        ".mise/mise.lock"
    )]


def test_a_workflow_reads_its_triggers_jobs_and_gate(sample: Sample):
    """
    Asserts that a workflow reads its events from the `on` key YAML 1.1
    loads as `True`, a pull request among them, and gives each job its key
    as its id. It also finds the gate, its rows, and the tasks each row runs
    across its matrix, and lists its steps as declared and once for each
    leg, none of them saving a cache.
    """
    workflow = Workflow.read(sample.root / ".github" / "workflows" / "ci.yml")

    assert set(workflow.triggers) == {"pull_request", "workflow_dispatch"}
    assert workflow.requests
    assert [job.id for job in workflow.jobs] == ["check", "brief"]
    assert workflow.gate.name == "⏱️ Brief"
    assert [job.tasks for job in workflow.rows] == [frozenset(
        {"lock:check", "py:coverage"}
    )]
    assert workflow.ungated == ()
    assert workflow.saved == frozenset()
    assert len(workflow.steps) == 5
    assert len(workflow.instances) == 8


def test_an_action_reads_its_inputs_steps_and_anchors(sample: Sample):
    """
    Asserts that a composite action reads the names of its inputs and its
    steps, provisions tools through `jdx/mise-action`, and finds the line of
    each anchor and alias its manifest carries, counting from one.
    """
    path = sample.root / ".github" / "actions" / "provision" / "action.yml"
    sample.edit(
        ".github/actions/provision/action.yml",
        new = "  save: &save\n",
        old = "  save:\n"
    )
    sample.edit(
        ".github/actions/provision/action.yml",
        new = "  again: *save\n  tools:\n",
        old = "  tools:\n"
    )
    action = Action.read(path)

    assert action.inputs == ("save", "shared-key", "again", "tools")
    assert action.provisions
    assert action.anchors == (3, 9)
    assert not action.model_copy(update={"steps": ()}).provisions


def test_an_issue_reads_as_one_sentence():
    """
    Asserts that an issue joins its details after its message in
    parentheses, and stands as its message alone where mise printed none.
    """
    issue = Issue(
        details  = "Tasks: a, b",
        message  = "Alias 'x' is shared",
        severity = Level.ERROR,
        task     = "a"
    )

    assert issue.sentence == "Alias 'x' is shared (Tasks: a, b)"
    assert issue.model_copy(update={"details": ""}).sentence == "Alias 'x' is shared"


def test_the_manifest_lists_each_loose_build_pin(sample: Sample):
    """
    Asserts that the manifest lists each build requirement and build
    constraint that is not an exact pin, in the order it declares them.
    """
    sample.edit("pyproject.toml", new="hatchling>=1.32", old="hatchling==1.32.4")
    sample.edit("pyproject.toml", new="setuptools", old="setuptools==84.0.0")

    assert Pyproject.read(sample.root / "pyproject.toml").loose == (
        "hatchling>=1.32", "setuptools"
    )


def test_the_manifest_reads_the_facts_the_repository_page_carries(sample: Sample):
    """
    Asserts that the manifest reads the description and the keywords
    `[project]` declares, and the homepage `[project.urls]` declares beside
    its bare domain.
    """
    pyproject = Pyproject.read(sample.root / "pyproject.toml")

    assert pyproject.description == "Finds the stored game closest to a submitted one."
    assert pyproject.keywords == ("chess", "pgn")
    assert (
        pyproject.homepage, pyproject.domain
    ) == ("https://example.com", "example.com")


def test_the_manifest_reads_the_fields_the_checks_compare(sample: Sample):
    """
    Asserts that the manifest reads each field a check compares out of the
    table that declares it, and lists the build requirement beside the build
    constraint.
    """
    pyproject = Pyproject.read(sample.root / "pyproject.toml")

    assert [author.name for author in pyproject.authors] == ["James Parkington"]
    assert pyproject.builds == ("hatchling==1.32.4",)
    assert pyproject.constraints == ("setuptools==84.0.0",)
    assert pyproject.build_requirements == ("hatchling==1.32.4", "setuptools==84.0.0")
    assert (pyproject.license, pyproject.licenses) == ("MIT", (Path("LICENSE.md"),))
    assert (
        pyproject.python, pyproject.target, pyproject.uv
    ) == (">=3.14", "3.14", "==0.12.13")
    assert pyproject.loose == ()


def test_the_mise_config_reads_its_floor(sample: Sample):
    """
    Asserts that the mise config reads the release its `min_version` sets as
    the floor.
    """
    sample.edit(
        ".mise/config.toml",
        new = 'min_version = "2026.9.18"\n[env]',
        old = "[env]"
    )

    assert MiseConfig.read(sample.root / ".mise" / "config.toml").floor == "2026.9.18"


def test_the_mise_config_reads_its_pins_and_its_neighbors(sample: Sample):
    """
    Asserts that the mise config reads the Python and uv pins, the wrappers'
    folder, and the variables of its `[env]` block, reads no floor where
    it sets no `min_version`, cuts Python to its minor, and locates its
    lockfile beside it.
    """
    mise = MiseConfig.read(sample.root / ".mise" / "config.toml")

    assert (
        mise.python, mise.uv, mise.wrappers
    ) == ("3.14.6", "0.12.13", Path(".mise/bin"))
    assert mise.minor == "3.14"
    assert mise.lockfile == sample.root / ".mise" / "mise.lock"
    assert (mise.floor, mise.variables) == (None, {"_": {"path": ".mise/bin"}})
