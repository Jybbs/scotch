#!/usr/bin/env python3
# MISE description = "Decide which commit a `♟️ Deploy` run builds, if any"
"""
Decides which commit the `♟️ Deploy` run the `⏳ Order` job opens builds and
whether it builds one, writing `commit` and `skip` to the job's outputs.

A push leaves the publish to the `♟️ Store` run the same push started, since
that run starts `♟️ Deploy` once the store it publishes is live. A dispatch
on `main` naming a commit other than the one `main` points at builds the
commit `main` points at instead, so a store run finishing after a later push
cannot publish its older commit over the newer one, unless a `♟️ Store` push
run on that newer commit starts its own deploy, in which case the dispatch
builds nothing.

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
    The commit the run was started for, the `ref` input of a dispatch or
    otherwise the commit the run started on.
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
        `main` for another commit.

        Returns:
            The commit `main` points at, or `None` where the run is a push,
            was dispatched on another branch, or was started for that same
            commit.
        """
        if self.event is not Event.WORKFLOW_DISPATCH or self.ref != "refs/heads/main":
            return None

        head = resolve("heads/main")
        return head if head != resolve(self.commit) else None

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
        Appends `commit` and `skip` to the file `outputs` names, `commit`
        naming the commit `main` points at where `head` reads one and the
        commit the run started for otherwise. `skip` reads `true` where the
        run is a push or reads `head`, and `stored` finds a `♟️ Store` push
        run on `commit`, which starts a deploy of its own.
        """
        head   = self.head
        commit = head or self.commit
        skip   = (self.event is Event.PUSH or head is not None) and stored(commit)

        with outputs.open("a") as file:
            file.write(f"commit={commit}\nskip={'true' if skip else 'false'}\n")


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


def stored(commit: str) -> bool:
    """
    Reads whether a `♟️ Store` push run builds `commit`, which starts `♟️
    Deploy` on that commit once the store it publishes is live.
    """
    return printed(
        "run",
        "list",
        "--commit",
        commit,
        "--event",
        "push",
        "--jq",
        "length",
        "--json",
        "databaseId",
        "--workflow",
        "store.yml"
    ) != "0"


if __name__ == "__main__":
    Deploy.from_environ(environ).order(Path(environ["GITHUB_OUTPUT"]))
