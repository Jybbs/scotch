"""
Pins the facts `.mise/config.toml` declares for mise itself:

- The setting that compares task sources by their contents rather than by
  their timestamps
- The condition the `tests-link` check of `mise doctor project` passes on,
  run in a scratch folder with the link in place and with a real folder
  standing where the link belongs
- The command each lockfile check runs, and the status it exits with,
  against a stand-in for that command's program
"""

from collections.abc  import Callable
from common.stand_ins import StandIn
from pathlib          import Path
from pytest           import Config, mark, param
from subprocess       import run
from tomllib          import loads


def config(root: Path) -> dict[str, dict[str, object]]:
    """
    Reads the tables of `.mise/config.toml` under `root`.
    """
    return loads((root / ".mise" / "config.toml").read_text())


def test_task_sources_compare_by_their_contents(pytestconfig: Config):
    """
    Asserts that the config sets `task.source_freshness_hash_contents`, so a
    branch switch that restores a source's bytes reruns no task.
    """
    assert config(pytestconfig.rootpath)["settings"]["task"] == {
        "source_freshness_hash_contents": True
    }


@mark.parametrize(
    ("target", "status"),
    [
        param("../docs/node_modules", 0, id="linked"),
        param("../docs/other", 1, id="linked-elsewhere"),
        param(None, 1, id="a-real-folder")
    ]
)
def test_the_tests_link_check_passes_only_on_the_link(
    pytestconfig : Config,
    status       : int,
    target       : str | None,
    tmp_path     : Path
):
    """
    Asserts that the `tests-link` check exits zero where
    `tests/node_modules` links to `docs/node_modules` and one where it links
    elsewhere or a real folder stands in its place.
    """
    (tmp_path / "docs" / "node_modules").mkdir(parents=True)
    (tmp_path / "docs" / "other").mkdir()
    (tmp_path / "tests").mkdir()

    if target:
        (tmp_path / "tests" / "node_modules").symlink_to(target)
    else:
        (tmp_path / "tests" / "node_modules").mkdir()

    command = config(pytestconfig.rootpath)["doctor"]["checks"]["tests-link"]["run"]

    assert run(["sh", "-c", command], check=False, cwd=tmp_path).returncode == status


@mark.parametrize("status", [0, 1])
@mark.parametrize(
    ("check", "program", "arguments"),
    [
        param(
            "bun-lock",
            "bun",
            [
                "install", "--cwd", "docs",
                "--dry-run", "--frozen-lockfile", "--no-summary"
            ],
            id = "bun-lock"
        ),
        param(
            "cargo-lock",
            "cargo",
            [
                "metadata", "--format-version", "1",
                "--locked", "--manifest-path", "rust/Cargo.toml"
            ],
            id = "cargo-lock"
        ),
        param("mise-lock", "mise", ["lock", "--check"], id="mise-lock"),
        param(
            "script-locks",
            "uv",
            ["lock", "--check", "--script", ".mise/tasks/task.py"],
            id = "script-locks"
        ),
        param("uv-lock", "uv", ["lock", "--check"], id="uv-lock")
    ]
)
def test_a_lockfile_check_exits_with_its_command(
    arguments    : list[str],
    check        : str,
    program      : str,
    pytestconfig : Config,
    stand_in     : Callable[..., StandIn],
    status       : int,
    tmp_path     : Path
):
    """
    Asserts that each lockfile check runs the command `lock:check` runs for
    its lockfile and exits with that command's status, against a stand-in
    for the command's program and a task script declaring inline metadata.
    """
    (tasks := tmp_path / ".mise" / "tasks").mkdir(parents=True)
    (tasks / "task.py").write_text("# /// script\n# ///\n")
    command = config(pytestconfig.rootpath)["doctor"]["checks"][check]["run"]
    program = stand_in(program, f"exit {status}")

    assert program.start(["sh", "-c", command], tmp_path).returncode == status
    assert program.arguments == arguments
