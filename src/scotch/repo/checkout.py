"""
Holds `Checkout`, the repository `scotch audit repo` reads, which loads each
file into its record from `scotch.repo.schemas` the first time a check reads
it and asks mise for the tasks it declares.
"""

from functools  import cached_property
from pathlib    import Path
from pydantic   import BaseModel, TypeAdapter
from subprocess import run

from scotch.repo.schemas import (
    Action,
    License,
    Lock,
    MiseConfig,
    Pyproject,
    Script,
    Step,
    Task,
    Validation,
    Workflow
)


class Checkout(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The repository the checks read, each file loaded the first time a check
    reads it, with every path the records carry joined onto `root`.
    """

    root: Path
    """
    The directory holding the repository.
    """

    @cached_property
    def actions(self) -> tuple[Action, ...]:
        """
        Reads each composite action's manifest under `.github/actions/`.
        """
        return tuple(
            map(Action.read, sorted(self.root.glob(".github/actions/*/action.yml")))
        )

    @cached_property
    def license(self) -> License:
        """
        Reads the first license file `[project].license-files` names.
        """
        return License.read(self.root / self.pyproject.licenses[0])

    @cached_property
    def lock(self) -> Lock:
        """
        Reads `uv.lock`.
        """
        return Lock.read(self.root / "uv.lock")

    @cached_property
    def mise(self) -> MiseConfig:
        """
        Reads `.mise/config.toml`.
        """
        return MiseConfig.read(self.root / ".mise" / "config.toml")

    @property
    def provisions(self) -> tuple[tuple[Path, Step], ...]:
        """
        Pairs each step that calls a provisioning action, once for each leg
        of its job's matrix, with the workflow declaring it.
        """
        return tuple(
            (path, step)
            for path, step in self.runs
            if (action := self.action(step.uses)) and action.provisions
        )

    @cached_property
    def pyproject(self) -> Pyproject:
        """
        Reads `pyproject.toml`.
        """
        return Pyproject.read(self.root / "pyproject.toml")

    @property
    def runs(self) -> tuple[tuple[Path, Step], ...]:
        """
        Pairs each step the workflows run, once for each leg of its job's
        matrix, with the workflow declaring it.
        """
        return tuple(
            (workflow.path, step)
            for workflow in self.workflows
            for step in workflow.instances
        )

    @cached_property
    def scripts(self) -> tuple[Script, ...]:
        """
        Reads the inline metadata of each task script that declares any.
        """
        return tuple(
            script
            for task in self.tasks
            if task.file and (script := Script.read(task.file))
        )

    @property
    def steps(self) -> tuple[tuple[Path, Step], ...]:
        """
        Pairs each step the workflows and the composite actions declare with
        the file declaring it.
        """
        return tuple(
            (source.path, step)
            for source in (*self.workflows, *self.actions)
            for step in source.steps
        )

    @cached_property
    def tasks(self) -> tuple[Task, ...]:
        """
        Runs `mise tasks ls`, listing the tasks the repository declares and
        leaving out the global ones.

        mise prints each task's file as an absolute path with every symlink
        resolved, so each one is joined back onto `root`.
        """
        listing = run(
            ["mise", "tasks", "ls", "--json", "--local"],
            capture_output = True,
            check          = True,
            cwd            = self.root,
            text           = True
        )
        return tuple(
            task.model_copy(
                update = {
                    "file": self.root / task.file.relative_to(self.root.resolve())
                }
            )
            if task.file
            else task
            for task in TypeAdapter(tuple[Task, ...]).validate_json(listing.stdout)
        )

    @cached_property
    def validation(self) -> Validation:
        """
        Runs `mise tasks validate`, which exits nonzero on the errors its
        report lists.
        """
        report = run(
            ["mise", "tasks", "validate", "--json"],
            capture_output = True,
            check          = False,
            cwd            = self.root,
            text           = True
        )
        return Validation.model_validate_json(report.stdout)

    @cached_property
    def workflows(self) -> tuple[Workflow, ...]:
        """
        Reads each workflow under `.github/workflows/`.
        """
        return tuple(
            map(Workflow.read, sorted(self.root.glob(".github/workflows/*.yml")))
        )

    @cached_property
    def wrappers(self) -> tuple[Path, ...]:
        """
        Lists the wrappers in the folder the `_.path` entry in
        `.mise/config.toml` names, which mise resolves against the directory
        holding `.mise`.
        """
        return tuple(sorted((self.root / self.mise.wrappers).iterdir()))

    def action(self, uses: str) -> Action | None:
        """
        Finds the composite action a step's `uses` names through GitHub's
        self-repository syntax, a path from the repository's root behind
        `$/`.

        Returns:
            The action, or `None` where `uses` names an action outside the
            repository.
        """
        path = self.root / uses.removeprefix("$/") / "action.yml"

        return next((action for action in self.actions if action.path == path), None)

    def summarizes(self, step: Step) -> bool:
        """
        Reads whether `step` writes the workflow step summary, either from
        its own script or from a task its script runs through `mise run`.
        """
        return step.writes_summary or any(
            task.writes_summary for task in self.tasks if task.name in step.tasks
        )

    def task(self, name: str) -> Task | None:
        """
        Finds the task `name` names.

        Returns:
            The task, or `None` where mise lists no task of that name.
        """
        return next((task for task in self.tasks if task.name == name), None)
