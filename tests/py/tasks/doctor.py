"""
Pins the facts `.mise/config.toml` declares for mise itself:

- The setting that compares task sources by their contents rather than by
  their timestamps
- The condition the `tests-link` check of `mise doctor project` passes on,
  run in a scratch folder with the link in place and with a real folder
  standing where the link belongs
"""

from pathlib    import Path
from pytest     import Config, mark, param
from subprocess import run
from tomllib    import loads


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
    ("link", "status"),
    [
        param(True, 0, id="linked"),
        param(False, 1, id="a-real-folder")
    ]
)
def test_the_tests_link_check_passes_only_on_the_link(
    link         : bool,
    pytestconfig : Config,
    status       : int,
    tmp_path     : Path
):
    """
    Asserts that the `tests-link` check exits zero where
    `tests/node_modules` links to `docs/node_modules` and one where a real
    folder stands in its place.
    """
    (tmp_path / "docs" / "node_modules").mkdir(parents=True)
    (tmp_path / "tests").mkdir()

    if link:
        (tmp_path / "tests" / "node_modules").symlink_to("../docs/node_modules")
    else:
        (tmp_path / "tests" / "node_modules").mkdir()

    command = config(pytestconfig.rootpath)["doctor"]["checks"]["tests-link"]["run"]

    assert run(["sh", "-c", command], check=False, cwd=tmp_path).returncode == status
