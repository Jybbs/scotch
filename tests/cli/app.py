"""
Pins what the `scotch` command itself defines, meaning the script
`[project.scripts]` declares, the help text the docstrings of the app and
of each group and command it registers render, the version its metadata
carries, and the dependencies its help leaves unimported.
"""

from common.app         import invoke
from importlib.metadata import entry_points, packages_distributions, requires, version
from pytest             import CaptureFixture, MonkeyPatch, mark, param
from syrupy.assertion   import SnapshotAssertion

from scotch.cli          import app
from scotch.repo.schemas import normalized


@mark.parametrize(
    "tokens",
    [
        param((), id="scotch"),
        *(param((verb,), id=verb) for verb in app if not verb.startswith("-")),
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
    holds at eighty columns, for `scotch` itself, for each group it
    registers, which lists the summary of every command it holds, and for
    each command, the hidden ones included.
    """
    monkeypatch.setenv("COLUMNS", "80")

    assert invoke(*tokens, "--help") == 0
    assert capsys.readouterr().out == snapshot


@mark.parametrize(
    "module",
    sorted(
        module
        for module, distributions in packages_distributions().items()
        if {*map(normalized, distributions)}
        & {*map(normalized, requires("scotch"))} - {
            "cyclopts", "markdown-it-py", "pydantic", "rich"
        }
    )
)
def test_the_help_loads_no_package_behind_the_commands(
    help_modules : frozenset[str],
    module       : str
):
    """
    Asserts that `scotch --help` imports no module of a dependency the
    manifest declares beside the ones that render the help and Pydantic,
    which `scotch.repo.schemas` loads as it runs to define the `Format` that
    the `--output-format` of `scotch audit repo` defaults to. The global
    lazy import mode defers each import a command's module makes until the
    command reads the name it binds, whereas the module itself runs once the
    app registers the command.
    """
    assert module not in help_modules


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
