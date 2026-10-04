#!/usr/bin/env python3
# MISE description = "Cut the draft release a version bump on `main` calls for"
"""
Cuts the draft release that a push to `main` moving `[project].version`
calls for, writing the path the cut took to the outputs of the `♟️ Draft`
job, which the gate's summary reads.

The job runs this script on the runner's own `python3` and the `gh` it
carries, so it imports the standard library alone.
"""

from dataclasses import dataclass
from enum        import StrEnum, auto
from json        import loads as from_json
from os          import environ
from pathlib     import Path
from subprocess  import run
from tomllib     import loads
from typing      import Self


class State(StrEnum):
    """
    The path a cut takes, each value the `state` output the gate's summary
    reads.
    """

    CREATED   = auto()
    KEPT      = auto()
    PUBLISHED = auto()
    UNCHANGED = auto()


@dataclass(frozen=True, kw_only=True)
class Release:
    """
    A release carrying the version, as `gh release view` reports it.
    """

    draft: bool
    """
    Whether the release is still a draft, which reserves no tag.
    """

    url: str
    """
    The release's address.
    """

    @classmethod
    def create(cls, version: str) -> Self:
        """
        Creates a draft through `gh release create` with GitHub's generated
        notes, titled with the bare version and recording `main` as the
        place its tag is written, so publishing writes the tag at whatever
        `main` holds at that moment.
        """
        created = run(
            [
                "gh", "release", "create", version, "--draft",
                "--generate-notes", "--target", "main", "--title", version
            ],
            capture_output = True,
            check          = True,
            text           = True
        )
        return cls(draft=True, url=created.stdout.strip())

    @classmethod
    def find(cls, version: str) -> Self | None:
        """
        Looks the release carrying `version` up through `gh release view`.

        Returns:
            The release, or `None` where `gh` reports that none carries the
            version.

        Raises:
            SystemExit: Where `gh release view` fails for any other reason,
                        since a draft reserves no tag and a second create
                        would leave two drafts for one version.
        """
        view = run(
            ["gh", "release", "view", version, "--json", "isDraft,url"],
            capture_output = True,
            check          = False,
            text           = True
        )

        if view.returncode == 0:
            release = from_json(view.stdout)
            return cls(draft=release["isDraft"], url=release["url"])

        if "release not found" in view.stderr:
            return None

        raise SystemExit(view.stderr)


@dataclass(frozen=True, kw_only=True)
class Outcome:
    """
    The path a cut took, beside the release it created or found and the
    version it read.
    """

    release: Release | None
    """
    The release the cut created or found, `None` where the version did not
    move.
    """

    state: State
    """
    The path the cut took.
    """

    version: str
    """
    The version at `HEAD`.
    """

    def write(self, outputs: Path):
        """
        Appends the `state`, `url`, and `version` outputs to the file
        `outputs` names, printing the warning annotation GitHub Actions
        shows where a published release already carries the version.
        """
        url = self.release.url if self.release else ""

        if self.state is State.PUBLISHED:
            print(
                f"::warning::The published release {url} already carries {self.version}"
            )

        with outputs.open("a") as file:
            file.write(f"state={self.state}\nurl={url}\nversion={self.version}\n")


@dataclass(frozen=True, kw_only=True)
class Cut:
    """
    The version `pyproject.toml` carries at `HEAD` beside the one it carried
    at `HEAD~1`, and whether the workflow run was started by hand.
    """

    current: str
    """
    The version at `HEAD`, which names the release and its tag.
    """

    dispatched: bool
    """
    Whether the workflow run was started through `workflow_dispatch`, which
    reads the releases whether or not the version moved.
    """

    previous: str
    """
    The version at `HEAD~1`.
    """

    @property
    def moved(self) -> bool:
        """
        Reads whether the cut reads the releases at all, which it does where
        the version moved or the run was started by hand.
        """
        return self.dispatched or self.current != self.previous

    @classmethod
    def from_git(cls, event: str) -> Self:
        """
        Reads `[project].version` out of `pyproject.toml` at `HEAD` and
        at `HEAD~1` through `git show`, the job having checked out both
        commits.

        Args:
            event: The name of the event that started the workflow run, as
                   `GITHUB_EVENT_NAME` gives it.
        """
        current, previous = (
            loads(
                run(
                    ["git", "show", f"{ref}:pyproject.toml"],
                    capture_output = True,
                    check          = True,
                    text           = True
                ).stdout
            )["project"]["version"]
            for ref in ("HEAD", "HEAD~1")
        )
        return cls(
            current    = current,
            dispatched = event == "workflow_dispatch",
            previous   = previous
        )

    def outcome(self) -> Outcome:
        """
        Takes the cut, looking the release up where the version moved and
        creating a draft where no release carries it.
        """
        found = Release.find(self.current) if self.moved else None
        state = self.state(found)

        return Outcome(
            release = Release.create(self.current) if state is State.CREATED else found,
            state   = state,
            version = self.current
        )

    def state(self, found: Release | None) -> State:
        """
        Decides the path the cut takes from whether the version moved and
        the release `found` names, `None` where no release carries the
        version.
        """
        if not self.moved:
            return State.UNCHANGED

        if found is None:
            return State.CREATED

        return State.KEPT if found.draft else State.PUBLISHED


if __name__ == "__main__":
    (
        Cut.from_git(environ["GITHUB_EVENT_NAME"])
           .outcome()
           .write(Path(environ["GITHUB_OUTPUT"]))
    )
