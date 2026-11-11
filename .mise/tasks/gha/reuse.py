#!/usr/bin/env python3
# MISE description = "Copy the coverage total `♟️ CI` attached for the tree on `main`"
"""
Copies the coverage total a `♟️ CI` run attached for the tree a push to
`main` landed, the run being one of the pull request that push merged,
and writes `found` to the job's outputs. The coverage job of `♟️ Deploy`
publishes that total in place of running the suite again.

The job runs this script on the runner's own `python3` and the `gh` it
carries, so it imports the standard library alone.
"""

from dataclasses import dataclass
from os          import environ
from pathlib     import Path
from subprocess  import run
from sys         import argv
from tempfile    import TemporaryDirectory
from typing      import Self


@dataclass(frozen=True, kw_only=True)
class Report:
    """
    The coverage report one `♟️ CI` run attached, unpacked into a folder,
    beside which the run wrote the total and the tree it checked.
    """

    folder: Path
    """
    The folder the report was unpacked into.
    """

    @property
    def total(self) -> int | None:
        """
        Reads the whole-number total `coverage.json` holds.

        Returns:
            The total, or `None` where the file is missing or holds anything
            but a whole number from 0 to 100.
        """
        file = self.folder / "coverage.json"
        text = file.read_text().strip() if file.is_file() else ""

        return int(text) if text.isdecimal() and int(text) <= 100 else None

    @property
    def tree(self) -> str:
        """
        Reads the hash of the tree the run checked, empty where the run
        wrote none.
        """
        file = self.folder / "tree"
        return file.read_text().strip() if file.is_file() else ""

    @classmethod
    def download(cls, folder: Path, number: int) -> Self | None:
        """
        Unpacks the `coverage` artifact of the workflow run `number` names
        into `folder` through `gh run download`.

        Returns:
            The report, or `None` where the run attached no such artifact.
        """
        download = run(
            [
                "gh", "run", "download",
                str(number),
                "--dir",
                str(folder),
                "--name", "coverage"
            ],
            capture_output = True,
            check          = False,
            text           = True
        )
        return cls(folder=folder) if download.returncode == 0 else None


@dataclass(frozen=True, kw_only=True)
class Merge:
    """
    The commit a push to `main` landed and the tree it holds.
    """

    commit: str
    """
    The commit the push landed.
    """

    tree: str
    """
    The hash of the tree the commit holds, which equals the tree a `♟️ CI`
    run checked out wherever the pull request's branch was up to date with
    `main` when it merged.
    """

    @property
    def heads(self) -> tuple[str, ...]:
        """
        Lists the head commit of each pull request GitHub associates with
        the commit, which for a commit on `main` is the pull request that
        merged it.
        """
        return tuple(
            gh(
                "api",
                f"repos/{{owner}}/{{repo}}/commits/{self.commit}/pulls",
                "--jq",
                ".[].head.sha"
            ).split()
        )

    @property
    def runs(self) -> tuple[int, ...]:
        """
        Lists the `pull_request` runs of `ci.yml` on each head commit,
        newest first as `gh run list` orders them.
        """
        return tuple(
            int(number)
            for head in self.heads
            for number in gh(
                "run",
                "list",
                "--commit",
                head,
                "--event",
                "pull_request",
                "--jq",
                ".[].databaseId",
                "--json",
                "databaseId",
                "--workflow",
                "ci.yml"
            ).split()
        )

    @classmethod
    def from_git(cls) -> Self:
        """
        Reads the commit and the tree `HEAD` names in the checkout the job
        made.
        """
        commit, tree = run(
            ["git", "rev-parse", "HEAD", "HEAD^{tree}"],
            capture_output = True,
            check          = True,
            text           = True
        ).stdout.split()

        return cls(commit=commit, tree=tree)

    def report(self, scratch: Path) -> Report | None:
        """
        Finds the newest run whose report was written for `tree` and holds
        a total, unpacking each run's report into a folder of its own under
        `scratch`.

        Returns:
            The report, or `None` where no run attached one for the tree.
        """
        return next(
            (
                report
                for number in self.runs
                if (report := Report.download(scratch / str(number), number))
                and report.tree      == self.tree
                and report.total is not None
            ),
            None
        )

    def reuse(self, folder: Path, outputs: Path):
        """
        Writes the total of the report `report` finds into `coverage.json`
        in `folder`, creating the folder, and appends `found` to the file
        `outputs` names, `true` where a run attached a total for the tree
        and `false` otherwise.
        """
        with TemporaryDirectory() as scratch:
            report = self.report(Path(scratch))

            if report:
                folder.mkdir(exist_ok=True, parents=True)
                (folder / "coverage.json").write_text(f"{report.total}\n")

        with outputs.open("a") as file:
            file.write(f"found={'true' if report else 'false'}\n")


def gh(*arguments: str) -> str:
    """
    Runs `gh` with `arguments` and reads what it prints, empty where it
    exits nonzero, so a lookup that fails finds no run and the job runs
    the suite.
    """
    done = run(
        ["gh", *arguments],
        capture_output = True,
        check          = False,
        text           = True
    )
    return done.stdout if done.returncode == 0 else ""


if __name__ == "__main__":
    Merge.from_git().reuse(Path(argv[1]), Path(environ["GITHUB_OUTPUT"]))
