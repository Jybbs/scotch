"""
Pins what the `scotch` command itself defines, meaning the script
`[project.scripts]` declares, the help text the docstrings of the app and
of each group and command it registers render, the version its metadata
carries, the dependencies and the group modules its help leaves unimported,
and the help and the version an install recording no directory prints
outside any project.
"""

from common.app         import invoke
from importlib.metadata import (
    entry_points,
    metadata,
    packages_distributions,
    requires,
    version
)
from pathlib          import Path
from pytest           import CaptureFixture, MonkeyPatch, mark, param
from subprocess       import run
from syrupy.assertion import SnapshotAssertion
from sys              import executable

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
            "cyclopts", "markdown-it-py", "rich"
        }
    )
)
def test_the_help_loads_no_package_behind_the_commands(
    help_modules : frozenset[str],
    module       : str
):
    """
    Asserts that `scotch --help` imports no module of a dependency the
    manifest declares beside the ones that render the help. The global
    lazy import mode defers each import a command's module makes until the
    command reads the name it binds, whereas registering the command runs
    its module and resolves the type of each parameter it takes.
    """
    assert module not in {name.partition(".")[0] for name in help_modules}


@mark.parametrize("verb", sorted(verb for verb in app if not verb.startswith("-")))
def test_the_help_imports_no_group_module(help_modules: frozenset[str], verb: str):
    """
    Asserts that `scotch --help` imports none of the modules under `cli/`
    holding a verb's group, which the app registers by its import path.
    """
    assert f"scotch.cli.{verb}" not in help_modules


@mark.parametrize(
    ("flag", "printed"),
    [
        param("--help", metadata("scotch")["Summary"], id="help"),
        param("--version", version("scotch"), id="version")
    ]
)
def test_an_install_recording_no_directory_runs_outside_any_project(
    flag     : str,
    printed  : str,
    tmp_path : Path
):
    """
    Asserts that `scotch --help` and `scotch --version` exit zero and print
    the summary and the version the metadata carries, run in an interpreter
    of its own from a directory holding no `pyproject.toml`, where the
    install records no directory it was installed from, as one from a wheel
    does.
    """
    source = (
        "import importlib.metadata, sys; "
        "importlib.metadata.Distribution.origin = None; "
        "from scotch.cli import app; app(sys.argv[1:])"
    )
    ran = run(
        [executable, "-c", source, flag],
        capture_output = True,
        cwd            = tmp_path,
        text           = True
    )

    assert ran.returncode == 0
    assert printed in " ".join(ran.stdout.split())


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
