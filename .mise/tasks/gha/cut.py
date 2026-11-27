#!/usr/bin/env python3
# MISE description = "Create or refresh the draft release of the version on `main`"
"""
Holds one draft release for the `[project].version` that `pyproject.toml`
carries, creating it where no release carries the version, refreshing its
notes where a draft does, and failing where a published release does. It
writes the path it took to the job's outputs, which the gate's summary
reads.

The job runs this script on the runner's own `python3`, so it imports the
standard library alone, and calls the `gh` that `.mise/config.toml` pins.
"""

from dataclasses import dataclass, replace
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
    PUBLISHED = auto()
    REFRESHED = auto()


@dataclass(frozen=True, kw_only=True)
class Release:
    """
    A release carrying the version, as `gh release view` reports it.
    """

    draft: bool
    """
    Whether the release is still a draft, which reserves no tag.
    """

    target: str
    """
    The branch or commit the release's tag is written at.
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
        url = gh(
            "release",
            "create",
            version,
            "--draft",
            "--generate-notes",
            "--target",
            "main",
            "--title",
            version
        )
        return cls(draft=True, target="main", url=url)

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
            ["gh", "release", "view", version, "--json", "isDraft,targetCommitish,url"],
            capture_output = True,
            check          = False,
            text           = True
        )

        if view.returncode == 0:
            release = from_json(view.stdout)
            return cls(
                draft  = release["isDraft"],
                target = release["targetCommitish"],
                url    = release["url"]
            )

        if "release not found" in view.stderr:
            return None

        raise SystemExit(view.stderr)

    def refresh(self, version: str) -> Self:
        """
        Replaces the draft's notes with the ones GitHub's `generate-notes`
        call writes for `version` at the draft's target now, leaving its
        title and target as they are.

        Returns:
            The draft at the address `gh release edit` prints, since GitHub
            writes a new `untagged-` address on each edit of a draft.
        """
        notes = gh(
            "api",
            "repos/{owner}/{repo}/releases/generate-notes",
            "--raw-field",
            f"tag_name={version}",
            "--raw-field",
            f"target_commitish={self.target}",
            "--jq",
            ".body"
        )
        return replace(
            self,
            url = gh("release", "edit", version, "--notes-file", "-", stdin=notes)
        )


@dataclass(frozen=True, kw_only=True)
class Outcome:
    """
    The path a cut took, beside the release it created, refreshed, or found
    and the version it read.
    """

    release: Release
    """
    The release the cut created, refreshed, or found.
    """

    state: State
    """
    The path the cut took.
    """

    version: str
    """
    The `[project].version` the cut read.
    """

    @classmethod
    def cut(cls, version: str) -> Self:
        """
        Takes the cut for `version`, creating a draft where no release
        carries it, refreshing the notes of the draft that does, and keeping
        a published release carrying it as found.
        """
        match Release.find(version):
            case None: release, state = Release.create(version), State.CREATED
            case Release(draft=True) as found:
                release, state = found.refresh(version), State.REFRESHED
            case found: release, state = found, State.PUBLISHED

        return cls(release=release, state=state, version=version)

    def write(self, outputs: Path):
        """
        Appends the `state`, `url`, and `version` outputs to the file
        `outputs` names.

        Raises:
            SystemExit: Where a published release already carries the
                        version, after printing the error annotation GitHub
                        Actions shows, so the gate reports the failure.
        """
        with outputs.open("a") as file:
            file.write(
                f"state={self.state}\nurl={self.release.url}\nversion={self.version}\n"
            )

        if self.state is State.PUBLISHED:
            print(
                f"::error::The published release {self.release.url} already "
                f"carries {self.version}, so run `mise bump` with `patch`, "
                "`minor`, or `major` to move `[project].version` to the next version"
            )
            raise SystemExit(1)


def gh(*arguments: str, stdin: str | None = None) -> str:
    """
    Runs `gh` with `arguments`, sending `stdin` on its standard input where
    given, and reads what it prints, stripped.

    Raises:
        CalledProcessError: Where `gh` exits nonzero.
    """
    return run(
        ["gh", *arguments],
        capture_output = True,
        check          = True,
        input          = stdin,
        text           = True
    ).stdout.strip()


def version(manifest: Path) -> str:
    """
    Reads the `[project].version` that the manifest at `manifest` carries.
    """
    return loads(manifest.read_text())["project"]["version"]


if __name__ == "__main__":
    Outcome.cut(version(Path("pyproject.toml"))).write(Path(environ["GITHUB_OUTPUT"]))
