"""
Pins what the `scotch` command itself defines, meaning the script
`[project.scripts]` declares, the help text the package's summary renders,
and the version its metadata carries.
"""

from common.cli         import invoke
from importlib.metadata import entry_points, version
from pytest             import CaptureFixture, MonkeyPatch
from syrupy.assertion   import SnapshotAssertion

from scotch.cli import app


def test_help_text(
    capsys      : CaptureFixture[str],
    monkeypatch : MonkeyPatch,
    snapshot    : SnapshotAssertion
):
    """
    Asserts that `--help` exits zero and prints the help text its fixture
    file holds at eighty columns, so a change to what the command documents
    is reviewed as a diff.
    """
    monkeypatch.setenv("COLUMNS", "80")

    assert invoke("--help") == 0
    assert capsys.readouterr().out == snapshot


def test_the_scotch_script_loads_the_app():
    """
    Asserts that the `scotch` script `[project.scripts]` declares loads the
    `App` this package defines, so the installed command runs it.
    """
    [script] = entry_points(group="console_scripts", name="scotch")

    assert script.load() is app


def test_version_reports_installed_package(capsys: CaptureFixture[str]):
    """
    Asserts that `--version` exits zero and names the installed version.
    """
    assert invoke("--version") == 0
    assert capsys.readouterr().out.strip() == version("scotch")
