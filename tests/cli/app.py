"""
Pins what the `scotch` command itself defines, meaning the help text the
package's summary renders and the version its metadata carries.
"""

from importlib.metadata import version
from pytest             import CaptureFixture, MonkeyPatch, raises
from syrupy.assertion   import SnapshotAssertion

from scotch.cli import app


def invoke(*argv: str) -> int:
    """
    Runs `scotch` with `argv`, reading the exit status from the `SystemExit`
    the app raises after every invocation, whether it printed the help or
    the version or refused a token.
    """
    with raises(SystemExit) as exit:
        app(argv)

    return exit.value.code


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


def test_version_reports_installed_package(capsys: CaptureFixture[str]):
    """
    Asserts that `--version` exits zero and names the installed version.
    """
    assert invoke("--version") == 0
    assert capsys.readouterr().out.strip() == version("scotch")
