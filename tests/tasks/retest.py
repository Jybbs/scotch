"""
Pins what the `retest` tasks hand the test runners they wrap:

- The pytest-testmon flag `py:retest` hands pytest, selecting where every
  file testmon cannot trace matches the last full run and running the whole
  suite otherwise, and the runs after which it records those files
- The reference `site:retest` hands Vitest's `--changed`

Each case runs a task through its own shebang inside a scratch checkout,
with stand-in executables first on `PATH` that log each call they receive.
"""

from collections.abc  import Callable
from common.stand_ins import Retest, StandIn
from pytest           import Config, mark, param


def test_a_full_run_with_failures_records_the_files(retest: Retest):
    """
    Asserts that a full run whose tests fail exits one and still records the
    files, since pytest-testmon reruns each failed test on the next run.
    """
    assert retest.run(status=1).returncode == 1
    assert retest.run().returncode == 0
    assert retest.flags == ["--testmon-forceselect"]


@mark.parametrize(
    "files",
    [
        param({"fixture.txt": "one", "module.py": "one"}, id="nothing-changed"),
        param({"fixture.txt": "one", "module.py": "two"}, id="python-changed"),
        param(
            {"added.py": "", "fixture.txt": "one", "module.py": "one"},
            id = "python-added"
        )
    ]
)
def test_a_change_testmon_traces_selects(files: dict[str, str], retest: Retest):
    """
    Asserts that a run after a full one selects under
    `--testmon-forceselect`, which keeps the `-m` the suite's `addopts`
    passes, wherever every file outside the Python matches what the full
    run recorded.
    """
    retest.run()
    retest.write(**files)

    assert retest.run("-x").returncode == 0
    assert retest.flags == ["--testmon-forceselect", "-x"]


@mark.parametrize(
    ("files", "changed"),
    [
        param({"fixture.txt": "two", "module.py": "one"}, "fixture.txt", id="changed"),
        param(
            {"added.toml": "", "fixture.txt": "one", "module.py": "one"},
            "added.toml",
            id = "added"
        ),
        param({"fixture.txt": None, "module.py": "one"}, "fixture.txt", id="deleted")
    ]
)
def test_a_change_testmon_cannot_trace_runs_every_test(
    changed : str,
    files   : dict[str, str | None],
    retest  : Retest
):
    """
    Asserts that a run after a full one runs the whole suite under
    `--testmon-noselect` and names the file wherever a file outside the
    Python changed, was added, or was deleted, and that the run after it
    selects again.
    """
    retest.run()
    retest.write(**files)
    result = retest.run()

    assert result.returncode == 0
    assert result.stderr.splitlines()[1:] == [changed]
    assert retest.flags == ["--testmon-noselect"]
    assert retest.run().returncode == 0
    assert retest.flags == ["--testmon-forceselect"]


@mark.parametrize(
    ("arguments", "status"),
    [
        param(("-k", "name"), 0, id="narrowed"),
        param((), 2, id="interrupted")
    ]
)
def test_a_partial_full_run_records_nothing(
    arguments : tuple[str, ...],
    retest    : Retest,
    status    : int
):
    """
    Asserts that a full run narrowed by an argument or ending on a status
    above one, the status pytest gives an interrupted run, exits with
    pytest's status and records nothing, so the next run is full again.
    """
    assert retest.run(*arguments, status=status).returncode == status
    assert not retest.recorded.exists()
    assert retest.run().returncode == 0
    assert retest.flags == ["--testmon-noselect"]


def test_the_first_run_runs_every_test_and_records_the_files(retest: Retest):
    """
    Asserts that a run finding no recorded files runs the whole suite under
    `--testmon-noselect`, saying no full run has recorded them, keeps the
    data file under the checkout's `.cache/testmon`, and records the files
    so the next run selects.
    """
    result = retest.run()

    assert result.returncode == 0
    assert "no full run has recorded" in result.stderr
    assert retest.calls == [f"{retest.root}/.cache/testmon/data --testmon-noselect"]
    assert "fixture.txt" in retest.recorded.read_text()
    assert "module.py" not in retest.recorded.read_text()


def test_the_site_selects_against_main(
    pytestconfig : Config,
    stand_in     : Callable[[str], StandIn]
):
    """
    Asserts that `site:retest` runs Vitest under `--changed origin/main` and
    the suite's config, passing every further argument through.
    """
    vitest = stand_in("vitest")
    folder = vitest.root / "node_modules" / ".bin"
    folder.mkdir(parents=True)
    (vitest.root / "vitest").rename(folder / "vitest")
    result = vitest.start(
        [pytestconfig.rootpath / ".mise" / "tasks" / "site" / "retest", "--bail=1"],
        vitest.root
    )

    assert result.returncode == 0
    assert vitest.arguments == [
        "run", "--changed", "origin/main",
        "--config", ".vitepress/vitest.config.ts", "--bail=1"
    ]
