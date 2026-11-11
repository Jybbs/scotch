"""
Pins what the `scotch` command itself defines, meaning the script
`[project.scripts]` declares, the help text the docstrings of the app and
of each group and command it registers render, the version its metadata
carries, the dependencies its help leaves unimported, and the root it reads
the project's `pyproject.toml` from.
"""

from common.app         import invoke
from importlib.metadata import entry_points, packages_distributions, requires, version
from pathlib            import Path
from pytest             import CaptureFixture, Config, MonkeyPatch, mark, param
from syrupy.assertion   import SnapshotAssertion
from types              import SimpleNamespace

from scotch.cli          import app, root
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
    assert module not in help_modules


def test_the_root_falls_back_to_the_working_directory(
    monkeypatch : MonkeyPatch,
    tmp_path    : Path
):
    """
    Asserts that an install recording no directory it was installed from,
    such as one from a wheel, leaves the working directory as the root.
    """
    monkeypatch.setattr(
        "scotch.cli.distributions",
        lambda name: iter([SimpleNamespace(origin=None)])
    )
    monkeypatch.chdir(tmp_path)

    assert root() == tmp_path


def test_the_root_is_the_directory_the_package_was_installed_from(pytestconfig: Config):
    """
    Asserts that the root is the clone the editable install records in its
    `direct_url.json`, which holds the `pyproject.toml` the settings read.
    """
    assert root() == pytestconfig.rootpath


def test_the_root_reads_a_clone_whose_path_holds_a_space(
    monkeypatch : MonkeyPatch,
    tmp_path    : Path
):
    """
    Asserts that the root decodes the percent-encoded `file:` address an
    installer writes for a clone whose path holds a space.
    """
    clone = tmp_path / "a clone"
    monkeypatch.setattr(
        "scotch.cli.distributions",
        lambda name: iter(
            [SimpleNamespace(origin=SimpleNamespace(dir_info=None, url=clone.as_uri()))]
        )
    )

    assert root() == clone


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
