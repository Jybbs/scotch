#!/usr/bin/env python3
# MISE description = "Decide whether a `♟️ Deploy` run publishes the commit it builds"
"""
Decides whether the `♟️ Deploy` run the `⏳ Order` job opens publishes the
commit it builds, writing `skip` and `head` to the job's outputs, `head`
naming the commit `main` points at where a run dispatched on `main` builds
another commit and empty otherwise.

A push leaves the publish to the `♟️ Store` run the same push started, since
that run starts `♟️ Deploy` once the store it publishes is live. A dispatch
on `main` publishes only the commit `main` points at, so a store run
finishing after a later push cannot publish its older commit over the newer
one, and a dispatch naming an unmerged commit publishes nothing.

The job runs this script on the runner's own `python3` and the `gh` it
carries, so it imports the standard library alone.
"""

from collections.abc import Mapping
from dataclasses     import dataclass
from enum            import StrEnum, auto
from os              import environ
from pathlib         import Path
from subprocess      import run
from typing          import Self


class Event(StrEnum):
    """
    The events that start a deploy run, each value the name GitHub gives it
    in `github.event_name`.
    """

    PUSH              = auto()
    WORKFLOW_DISPATCH = auto()


@dataclass(frozen=True, kw_only=True)
class Deploy:
    """
    The `♟️ Deploy` run the order job opens.
    """

    commit: str
    """
    The commit the run builds, the `ref` input of a dispatch or otherwise
    the commit the run started on.
    """

    event: Event
    """
    The event that started the run.
    """

    ref: str
    """
    The ref the run started on, `refs/heads/main` for every run that can
    publish.
    """

    @property
    def head(self) -> str | None:
        """
        Reads the commit `main` points at where the run was dispatched on
        `main` and builds another commit.

        Returns:
            The commit `main` points at, or `None` where the run is a push,
            was dispatched on another branch, or builds that same commit.
        """
        if self.event is not Event.WORKFLOW_DISPATCH or self.ref != "refs/heads/main":
            return None

        head = resolve("heads/main")
        return head if head != resolve(self.commit) else None

    @property
    def stored(self) -> bool:
        """
        Reads whether the run is a push whose commit a `♟️ Store` run also
        builds.
        """
        return self.event is Event.PUSH and printed(
            "run",
            "list",
            "--commit",
            self.commit,
            "--event",
            "push",
            "--jq",
            "length",
            "--json",
            "databaseId",
            "--workflow",
            "store.yml"
        ) != "0"

    @classmethod
    def from_environ(cls, variables: Mapping[str, str]) -> Self:
        """
        Reads the run out of the variables the order job's step sets,
        `COMMIT`, `EVENT`, and `REF`.
        """
        return cls(
            commit = variables["COMMIT"],
            event  = Event(variables["EVENT"]),
            ref    = variables["REF"]
        )

    def order(self, outputs: Path):
        """
        Appends `head` and `skip` to the file `outputs` names, `skip`
        reading `true` where `head` names a commit or the push left the
        publish to its `♟️ Store` run, and `false` otherwise.
        """
        head = self.head
        skip = "true" if head or self.stored else "false"

        with outputs.open("a") as file:
            file.write(f"head={head or ''}\nskip={skip}\n")


def printed(*arguments: str) -> str:
    """
    Runs `gh` with `arguments` and reads what it prints, stripped of its
    trailing newline, raising `CalledProcessError` where it exits nonzero,
    so a lookup that fails fails the job rather than deciding the publish.
    """
    return run(
        ["gh", *arguments],
        capture_output = True,
        check          = True,
        text           = True
    ).stdout.strip()


def resolve(ref: str) -> str:
    """
    Reads the full hash of the commit `ref` names, whether a hash, a
    short hash, or a branch written as `heads/<branch>`, through the
    `application/vnd.github.sha` media type of GitHub's commits API.
    """
    return printed(
        "api",
        f"repos/{{owner}}/{{repo}}/commits/{ref}",
        "--header",
        "Accept: application/vnd.github.sha"
    )


if __name__ == "__main__":
    Deploy.from_environ(environ).order(Path(environ["GITHUB_OUTPUT"]))
