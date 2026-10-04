#!/usr/bin/env -S uv run --exact --locked --script
# MISE description = "Write the workflow run's summary and exit with its verdict"
# /// script
# dependencies = ["minijinja==2.24.0"]
# requires-python = ">=3.14"
# ///
"""
Writes the summary of the workflow run the `⏱️ Brief` gate ends, from the
`needs` context the gate passes as `NEEDS`, and exits with status 1 where
any job the gate waited on failed or was canceled.

The summary fills in the template under `.github/scripts/summaries/` named
for the workflow's file, falling back to `base.md.j2`, through minijinja,
which the inline metadata above declares and `brief.py.lock` beside this
script pins.
"""

from collections.abc import Mapping
from dataclasses     import dataclass
from json            import loads
from minijinja       import Environment, load_from_path
from os              import environ
from pathlib         import Path
from typing          import Self


@dataclass(frozen=True, kw_only=True)
class Need:
    """
    One job the gate waited on, as the `needs` context reports it.
    """

    outputs: Mapping[str, str]
    """
    The outputs the job set, such as the address of the coverage report the
    `py:coverage` row attached.
    """

    result: str
    """
    The job's result, one of `success`, `failure`, `cancelled`, or
    `skipped`.
    """

    @property
    def passed(self) -> bool:
        """
        Reads whether the job succeeded or was skipped, the two results that
        pass the gate.
        """
        return self.result in {"skipped", "success"}


@dataclass(frozen=True, kw_only=True)
class Run:
    """
    The workflow run the gate ends.
    """

    branch: str
    """
    The branch the run checked, the pull request's head branch on a pull
    request.
    """

    commit: str
    """
    The commit the run checked, which `ci.yml` sets to the head of the pull
    request's branch rather than the merge commit the runner checks out.
    """

    needs: Mapping[str, Need]
    """
    Each job the gate waited on, keyed by its id.
    """

    workflow: str
    """
    The stem of the workflow's file, such as `ci`, which names its template.
    """

    templates: Path = Path(".github") / "scripts" / "summaries"
    """
    The folder holding the summaries' templates, relative to the root of the
    checkout the gate runs from.
    """

    @property
    def passed(self) -> bool:
        """
        Reads whether every job the gate waited on passed.
        """
        return all(need.passed for need in self.needs.values())

    @property
    def status(self) -> int:
        """
        Reads the exit status the gate takes, 1 where any job failed and
        0 otherwise.
        """
        return int(not self.passed)

    @classmethod
    def from_environ(cls, variables: Mapping[str, str]) -> Self:
        """
        Reads the run out of the variables the runner sets and the ones the
        gate's step passes, `NEEDS` and, on a pull request, `COMMIT`, where
        `GITHUB_HEAD_REF` names a pull request's head branch and is empty on
        any other event.
        """
        return cls(
            branch = variables.get("GITHUB_HEAD_REF") or variables["GITHUB_REF_NAME"],
            commit = variables.get("COMMIT") or variables["GITHUB_SHA"],
            needs  = {job: Need(**need) for job, need in loads(
                variables["NEEDS"]
            ).items()},
            workflow = Path(variables["GITHUB_WORKFLOW_REF"].partition("@")[0]).stem
        )

    def render(self) -> str:
        """
        Fills in the template under `templates` named for the workflow's
        file, or `base.md.j2` where no such template exists.
        """
        environment = Environment(
            keep_trailing_newline = True,
            loader                = load_from_path(self.templates)
        )
        own = f"{self.workflow}.md.j2"

        return environment.render_template(
            own if (self.templates / own).is_file() else "base.md.j2",
            run = self
        )

    def write(self, summary: Path):
        """
        Appends the rendered summary to the file `summary` names.
        """
        with summary.open("a") as file:
            file.write(self.render())


if __name__ == "__main__":
    run = Run.from_environ(environ)
    run.write(Path(environ["GITHUB_STEP_SUMMARY"]))

    raise SystemExit(run.status)
