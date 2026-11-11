"""
Pins how `gha:reuse` finds the coverage total a `♟️ CI` run of the merged
pull request attached for the tree on `main`, the commands it sends git and
GitHub, and what it writes for the `☂️ Coverage` job of `♟️ Deploy`.

Each case loads the script in the test process and answers each command it
runs through pytest-subprocess, so no case reaches git or GitHub.
"""

from collections.abc import Mapping
from pathlib         import Path
from pytest          import mark, param
from pytest_subprocess.fake_process import FakePopen, FakeProcess
from types import ModuleType


def attach(fp: FakeProcess, reports: Mapping[int, Mapping[str, str] | None]):
    """
    Registers `gh run list` listing the runs `reports` names, newest first
    as the highest number, and `gh run download` unpacking for each run the
    files its entry holds, or failing for a run whose entry is `None`, as
    `gh` does for a run that attached no `coverage` artifact.
    """
    fp.register(
        ["gh", "run", "list", fp.any()],
        stdout = "".join(f"{number}\n" for number in sorted(reports, reverse=True))
    )

    for number, files in reports.items():
        def unpack(process: FakePopen, files: Mapping[str, str] | None = files):
            """
            Writes `files` into the folder `--dir` names.
            """
            folder = Path(process.args[process.args.index("--dir") + 1])
            folder.mkdir(parents=True)

            for name, text in (files or {}).items():
                (folder / name).write_text(text)

        fp.register(
            ["gh", "run", "download", str(number), fp.any()],
            callback   = unpack,
            returncode = 0 if files is not None else 1
        )


def pulled(fp: FakeProcess, *heads: str):
    """
    Registers `gh api` answering the pull requests of a commit with the head
    commits `heads` names, `b2c3` where it names none.
    """
    fp.register(
        ["gh", "api", fp.any()],
        stdout = "".join(f"{head}\n" for head in heads or ("b2c3",))
    )


@mark.parametrize(
    ("command", "printed"),
    [
        param(("api",), "b2c3\n", id="pull-requests"),
        param(("run", "list"), "12\n", id="runs")
    ]
)
def test_a_failed_lookup_reports_no_total(
    command  : tuple[str, ...],
    fp       : FakeProcess,
    printed  : str,
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that a `gh` lookup that fails, whether of the merged pull
    request or of its runs, reads as no run, so `found` reads `false` and
    the job runs the suite, even where `gh` printed an answer before it
    failed.
    """
    outputs = tmp_path / "outputs"

    fp.register(["gh", *command, fp.any()], returncode=1, stdout=printed)
    pulled(fp)
    attach(fp, {12: {"coverage.json": "97\n", "tree": "t0\n"}})
    task.Merge(commit="a1b2", tree="t0").reuse(tmp_path / "total", outputs)

    assert outputs.read_text() == "found=false\n"


def test_a_run_without_the_artifact_downloads_no_report(
    fp       : FakeProcess,
    task     : ModuleType,
    tmp_path : Path
):
    """
    Asserts that a run whose `gh run download` fails yields no report, even
    where the download left the files of a matching report behind.
    """
    fp.register(["gh", "run", "download", "12", fp.any()], returncode=1)
    (tmp_path / "12").mkdir()
    (tmp_path / "12" / "coverage.json").write_text("97\n")
    (tmp_path / "12" / "tree").write_text("t0\n")

    assert task.Report.download(tmp_path / "12", 12) is None


def test_the_merge_reads_the_commit_and_its_tree_from_head(
    fp   : FakeProcess,
    task : ModuleType
):
    """
    Asserts that the merge reads the commit and the tree `HEAD` names in one
    `git rev-parse`.
    """
    fp.register(["git", "rev-parse", "HEAD", "HEAD^{tree}"], stdout="a1b2\nt0\n")

    assert task.Merge.from_git() == task.Merge(commit="a1b2", tree="t0")


@mark.parametrize(
    ("reports", "total"),
    [
        param({12: {"coverage.json": "97\n", "tree": "t0\n"}}, 97, id="matching"),
        param(
            {
                12 : None,
                10 : {"coverage.json": "95\n", "tree": "t0\n"},
                11 : {"coverage.json": "96\n", "tree": "t1\n"}
            },
            95,
            id = "older-run-matching"
        ),
        param({12: {"coverage.json": "97\n", "tree": "t1\n"}}, None, id="other-tree"),
        param({12: {"coverage.json": "97\n"}}, None, id="no-tree"),
        param({12: {"tree": "t0\n"}}, None, id="no-total"),
        param(
            {
                11 : {"coverage.json": "96\n", "tree": "t0\n"},
                12 : {"tree": "t0\n"}
            },
            96,
            id = "newer-run-without-total"
        ),
        param({12: {"coverage.json": "1e3\n", "tree": "t0\n"}}, None, id="not-whole"),
        param({12: {"coverage.json": "101\n", "tree": "t0\n"}}, None, id="above-100"),
        param({12: None}, None, id="no-artifact"),
        param({}, None, id="no-run")
    ]
)
def test_the_report_is_the_newest_holding_a_total_for_the_tree(
    fp       : FakeProcess,
    reports  : Mapping[int, Mapping[str, str] | None],
    task     : ModuleType,
    tmp_path : Path,
    total    : int | None
):
    """
    Asserts that the report is the newest a run attached whose tree is the
    merged commit's and whose total is a whole number from 0 to 100, and
    that no report is found where no run attached one.
    """
    pulled(fp)
    attach(fp, reports)
    report = task.Merge(commit="a1b2", tree="t0").report(tmp_path)

    assert (report.total if report else None) == total


@mark.parametrize(
    ("reports", "written", "line"),
    [
        param(
            {12: {"coverage.json": "97\n", "tree": "t0\n"}},
            "97\n",
            "found=true\n",
            id = "found"
        ),
        param({12: None}, None, "found=false\n", id="missing")
    ]
)
def test_the_total_and_the_output_are_written_for_the_job(
    fp       : FakeProcess,
    line     : str,
    reports  : Mapping[int, Mapping[str, str] | None],
    task     : ModuleType,
    tmp_path : Path,
    written  : str | None
):
    """
    Asserts that a found total lands in `coverage.json` inside the folder
    given, created where missing, and that `found` reads `true` beside it,
    whereas a missing one writes no file and `found` reads `false`.
    """
    outputs = tmp_path / "outputs"
    outputs.write_text("earlier=1\n")
    folder = tmp_path / "total"

    pulled(fp)
    attach(fp, reports)
    task.Merge(commit="a1b2", tree="t0").reuse(folder, outputs)

    assert outputs.read_text() == "earlier=1\n" + line
    assert (
        (folder / "coverage.json").read_text() if folder.exists() else None
    ) == written


def test_the_runs_come_from_each_head_of_the_merged_pull_request(
    fp   : FakeProcess,
    task : ModuleType
):
    """
    Asserts that the runs are the `pull_request` runs of `ci.yml` on each
    head commit GitHub associates with the merged commit, in the order `gh`
    lists them.
    """
    pulled(fp, "b2c3", "c3d4")
    fp.register(["gh", "run", "list", fp.any()], stdout="12\n11\n")
    fp.register(["gh", "run", "list", fp.any()], stdout="14\n")

    assert task.Merge(commit="a1b2", tree="t0").runs == (12, 11, 14)
    assert list(fp.calls) == [
        [
            "gh", "api", "repos/{owner}/{repo}/commits/a1b2/pulls",
            "--jq", ".[].head.sha"
        ],
        *(
            [
                "gh", "run", "list", "--commit", head, "--event", "pull_request",
                "--jq", ".[].databaseId", "--json", "databaseId", "--workflow", "ci.yml"
            ]
            for head in ("b2c3", "c3d4")
        )
    ]
