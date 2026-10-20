"""
Pins what the `scotch` command itself defines, meaning the script
`[project.scripts]` declares, the help text the docstrings of the app and of
each command it registers render, and the version its metadata carries.
"""

from common.app         import invoke
from importlib.metadata import entry_points, version
from pytest             import CaptureFixture, MonkeyPatch, mark, param
from syrupy.assertion   import SnapshotAssertion

from scotch.cli import app


@mark.parametrize(
    "tokens",
    [
        param((), id="scotch"),
        *(
            param((verb, noun), id=f"{verb}-{noun}")
            for verb in app
            if not verb.startswith("-")
            for noun in app[verb]
            if not noun.startswith("-")
        )
    ]
)
def test_help_text(
    capsys      : CaptureFixture[str],
    monkeypatch : MonkeyPatch,
    snapshot    : SnapshotAssertion,
    tokens      : tuple[str, ...]
):
    """
    Asserts that `--help` exits zero and prints the help text its snapshot
    holds at eighty columns, for `scotch` itself and for each command it
    registers, the hidden ones included.
    """
    monkeypatch.setenv("COLUMNS", "80")

    assert invoke(*tokens, "--help") == 0
    assert capsys.readouterr().out == snapshot


def test_the_scotch_script_loads_the_app():
    """
    Asserts that the `scotch` script `[project.scripts]` declares loads the
    `App` this package defines.
    """
    [script] = entry_points(group="console_scripts", name="scotch")

    assert script.load() is app


def test_version_reports_installed_package(capsys: CaptureFixture[str]):
    """
    Asserts that `--version` exits zero and names the installed version.
    """
    assert invoke("--version") == 0
    assert capsys.readouterr().out.strip() == version("scotch")
