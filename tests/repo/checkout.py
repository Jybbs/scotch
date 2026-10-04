"""
Pins what `Checkout` loads from a repository and asks mise for, and the
steps it pairs with the file declaring each one.
"""

from common.sample import Sample
from pathlib       import Path
from pytest        import MonkeyPatch
from pytest_subprocess.fake_process import FakeProcess

from scotch.repo.checkout import Checkout
from scotch.repo.schemas  import Step


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


def test_the_scripts_are_the_tasks_declaring_inline_metadata(answered: Sample):
    """
    Asserts that the checkout reads inline metadata from each task file that
    carries a `script` block, and from no other.
    """
    assert [script.path.name for script in answered.checkout.scripts] == ["brief"]


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
        *[Path("workflows/warm.yml")] * 3,
        Path("actions/provision/action.yml")
    ]
    assert [(
        path.name,
        " ".join(sorted(step.tools))
    ) for path, step in checkout.provisions] == [
        ("ci.yml", "python uv"),
        ("ci.yml", "python uv"),
        ("ci.yml", "python uv"),
        ("warm.yml", "python uv")
    ]


def test_the_tasks_join_each_file_mise_prints_onto_the_root(
    answered    : Sample,
    fp          : FakeProcess,
    monkeypatch : MonkeyPatch
):
    """
    Asserts that each task's file, which mise prints resolved and absolute,
    joins back onto the checkout's root, the relative root `scotch audit
    repo` reads included, and that a task declared inline keeps no file.
    """
    monkeypatch.chdir(answered.root)
    tasks = {task.name: task for task in Checkout(root=Path()).tasks}

    assert tasks["repo:ci"].file == Path(".mise") / "tasks" / "repo" / "ci"
    assert tasks["repo:ci"].depends == ("lock:check", "py:coverage")
    assert tasks["repo:inline"].file is None
    assert fp.calls[0] == ["mise", "tasks", "ls", "--json", "--local"]


def test_the_wrappers_come_from_the_folder_the_path_entry_names(sample: Sample):
    """
    Asserts that the wrappers are the files in the folder the `_.path` entry
    in `.mise/config.toml` names, in name order.
    """
    assert [wrapper.name for wrapper in sample.checkout.wrappers] == ["prose", "pytest"]
