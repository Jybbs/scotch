"""
Pins what `Checkout` reads from a repository and from mise, the steps it
pairs with the file declaring each one, and the files it lists `scotch
render docs` writing.
"""

from common.sample import Sample
from datetime      import UTC, datetime
from json          import dumps
from pathlib       import Path
from pytest        import MonkeyPatch, mark, param
from pytest_subprocess.fake_process import FakeProcess

from scotch.cli            import app
from scotch.docs.inventory import Outputs
from scotch.repo.checkout  import Checkout
from scotch.repo.schemas   import Cache, Step, Task


def test_a_step_finds_the_action_its_self_repository_path_names(sample: Sample):
    """
    Asserts that a `uses` written in GitHub's self-repository syntax finds
    the composite action at that path, and that a remote action finds none.
    """
    checkout = sample.checkout

    assert checkout.action("$/.github/actions/provision") == checkout.actions[0]
    assert checkout.action(
        "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1"
    ) is None


def test_a_step_summarizes_through_its_script_or_a_task_it_runs(answered: Sample):
    """
    Asserts that a step writes the step summary where its own script names
    it or a task it runs through `mise run` does, and not otherwise.
    """
    checkout  = answered.checkout
    gate, row = checkout.workflows[0].jobs[1].steps[1], checkout.workflows[0].jobs[0]

    assert checkout.summarizes(gate)
    assert checkout.summarizes(Step(run='echo >> "$GITHUB_STEP_SUMMARY"'))
    assert not any(checkout.summarizes(step) for step in row.instances)


def test_a_task_a_config_above_the_root_declares_keeps_no_source(
    fp     : FakeProcess,
    sample : Sample
):
    """
    Asserts that a task whose file or source lies outside the checkout's
    root, from a config or a task folder in a directory above it, lists with
    no file and no source.
    """
    script = sample.root.resolve().parent / ".mise" / "tasks" / "up"

    fp.register(
        ["mise", "tasks", "ls", "--json", "--local"],
        stdout = dumps(
            [
                {
                    "file"    : None,
                    "name"    : "up:task",
                    "aliases" : [],
                    "depends" : [],
                    "run"     : ["echo up"],
                    "source"  : str(sample.root.resolve().parent / "mise.toml")
                },
                {
                    "name"    : "up:script",
                    "aliases" : [],
                    "file"    : str(script),
                    "depends" : [],
                    "source"  : str(script)
                }
            ]
        )
    )

    assert [(task.file, task.source) for task in Task.listed(sample.root)] == [
        (None, None),
        (None, None)
    ]


def test_the_bunfig_is_the_file_beside_the_sites_manifest_where_one_stands(
    sample: Sample
):
    """
    Asserts that the `bunfig.toml` beside `docs/package.json` loads with its
    age and its exemptions, and that a site with none reads as `None`.
    """
    sample.edit(
        "docs/bunfig.toml",
        new = '259200\nminimumReleaseAgeExcludes = ["vitest@5.1.0"]\n',
        old = "259200\n"
    )

    assert (sample.checkout.bunfig.age, sample.checkout.bunfig.excludes) == (
        259200,
        ("vitest@5.1.0",)
    )

    (sample.root / "docs" / "bunfig.toml").rename(sample.root / "docs" / "bunfig.junk")

    assert sample.checkout.bunfig is None


def test_the_checks_leave_out_a_task_another_task_of_the_leg_depends_on(
    answered: Sample
):
    """
    Asserts that each check a pull-request row reports pairs with the task
    its leg runs, leaving out the `site:install` the sample's Site row runs
    ahead of `site:links`, which depends on it, and keeping the `site:press`
    the Press check runs, which `site:links` depends on from another check.
    """
    assert [
        (workflow.name, name, task)
        for workflow, name, task in answered.checkout.checks
    ] == [
        ("CI", "Lockfiles", "lock:check"),
        ("CI", "Coverage", "py:coverage"),
        ("Site", "Links", "site:links"),
        ("Site", "Press", "site:press")
    ]


def test_the_outputs_are_the_ones_its_app_and_readme_render_under_the_root(
    monkeypatch : MonkeyPatch,
    tmp_path    : Path
):
    """
    Asserts that a checkout's outputs are the ones `Outputs.shipped` lists
    for its app, the README its manifest names, and its root, with no index,
    which a checkout holds no copy of.
    """
    calls = []
    root  = Sample.copy(tmp_path).root
    monkeypatch.setattr(
        Outputs,
        "shipped",
        classmethod(lambda cls, *arguments: calls.append(arguments) or cls([]))
    )
    checkout = Checkout(app=app, root=root)

    assert list(checkout.outputs) == []
    assert calls == [(app, checkout.pyproject.readme, root)]


def test_the_scripts_are_the_tasks_declaring_inline_metadata(answered: Sample):
    """
    Asserts that the checkout reads inline metadata from each task file that
    carries a `script` block, and from no other.
    """
    assert [script.path.name for script in answered.checkout.scripts] == ["scoresheet"]


def test_the_steps_pair_with_the_file_declaring_them(sample: Sample):
    """
    Asserts that the checkout pairs each declared step with its workflow or
    its action, and each expanded step that calls the provisioning action
    with its workflow, once for each leg of its job's matrix.
    """
    checkout = sample.checkout
    root     = sample.root / ".github"

    assert [path.relative_to(root) for path, _ in checkout.steps] == [
        *[Path("workflows/ci.yml")] * 5,
        *[Path("workflows/deploy.yml")] * 4,
        *[Path("workflows/site.yml")] * 9,
        *[Path("workflows/store.yml")] * 2,
        *[Path("workflows/warm.yml")] * 4,
        Path("actions/provision/action.yml")
    ]
    assert [(path.name, step.caches) for path, step in checkout.provisions] == [
        ("ci.yml", {Cache.TOOLS: "python uv"}),
        ("ci.yml", {Cache.CARGO: "scotch-python", Cache.TOOLS: "python uv"}),
        ("ci.yml", {Cache.TOOLS: "python uv"}),
        ("deploy.yml", {Cache.TOOLS: "python uv"}),
        ("site.yml", {Cache.TOOLS: "python uv"}),
        ("site.yml", {Cache.TOOLS: "python uv"}),
        ("site.yml", {Cache.TOOLS: "python uv"}),
        ("warm.yml", {Cache.TOOLS: "python uv"}),
        ("warm.yml", {Cache.CARGO: "scotch-python", Cache.TOOLS: "python uv"})
    ]


def test_the_tasks_join_each_file_mise_prints_onto_the_root(
    answered    : Sample,
    fp          : FakeProcess,
    monkeypatch : MonkeyPatch
):
    """
    Asserts that each task's directory, file, and source, which mise prints
    resolved and absolute, join back onto the checkout's root, a relative
    root included, and that its `sources` patterns pass through, and that a
    task declared in TOML keeps no file and takes the TOML file declaring it
    as its source.
    """
    monkeypatch.chdir(answered.root)
    tasks = {task.name: task for task in Checkout(app=app, root=Path()).tasks}

    assert tasks["repo:ci"].file == Path(".mise") / "tasks" / "repo" / "ci"
    assert tasks["repo:ci"].depends == (
        "lock:check", "py:coverage", "site:links", "site:press"
    )
    assert tasks["rs:wasm"].dir == Path("rust")
    assert tasks["rs:wasm"].sources == (
        "../.mise/tasks/py/test", "Cargo.toml", "src/**/*.rs"
    )
    assert tasks["repo:inline"].file is None
    assert tasks["repo:inline"].source == Path(".mise") / "config.toml"
    assert tasks["site:links"].source == Path(".mise") / "tasks" / "site.toml"
    assert fp.calls[0] == ["mise", "tasks", "ls", "--json", "--local"]


def test_the_wrappers_come_from_the_folder_the_path_entry_names(sample: Sample):
    """
    Asserts that the wrappers are the files in the folder the `_.path` entry
    in `.mise/config.toml` names, in name order.
    """
    assert [wrapper.name for wrapper in sample.checkout.wrappers] == ["prose", "pytest"]


@mark.parametrize(
    ("folder", "age", "policy", "where"),
    [
        param(".", "3 days", None, ".cargo/config.toml", id="root"),
        param("rust", "3 days", None, ".cargo/config.toml", id="inherited"),
        param(
            "rust",
            "1 days",
            "allow",
            "rust/.cargo/config.toml",
            id = "deepest-file-wins"
        )
    ]
)
def test_cargo_reads_each_setting_from_the_deepest_config_above_its_folder(
    age    : str,
    folder : str,
    policy : str | None,
    sample : Sample,
    where  : str
):
    """
    Asserts that the settings Cargo reads when it starts in a folder come
    from the `.cargo/config.toml` in that folder or the nearest folder above
    it that sets them, and name the file setting the age.
    """
    if where.startswith("rust"):
        (sample.root / "rust" / ".cargo").mkdir()
        (sample.root / "rust" / ".cargo" / "config.toml").write_text(
            '[registry]\nglobal-min-publish-age = "1 days"\n'
            '[resolver]\nincompatible-publish-age = "allow"\n'
        )

    config = sample.checkout.cargo(sample.root / folder)

    assert (config.age, config.policy, config.path) == (
        age, policy,
        sample.root / where
    )


@mark.parametrize(
    ("times", "published"),
    [
        param(
            {"5.0.5": "2026-10-20T00:00:00Z"},
            datetime(2026, 10, 20, tzinfo=UTC),
            id = "dated"
        ),
        param({"5.0.6": "2026-10-20T00:00:00Z"}, None, id="unpublished")
    ]
)
def test_a_release_is_published_where_bun_info_dates_it(
    fp        : FakeProcess,
    published : datetime | None,
    sample    : Sample,
    times     : dict[str, str]
):
    """
    Asserts that the instant a version of an npm package was published reads
    from the `time` `bun info` prints for the package, `None` where the
    package has no such version.
    """
    fp.register(
        [
            "mise", "exec", "--", "bun", "info",
            f"--cwd={sample.root / 'docs'}",
            "vitest", "time", "--json"
        ],
        stdout = dumps(times)
    )

    assert sample.checkout.published("vitest", "5.0.5") == published
