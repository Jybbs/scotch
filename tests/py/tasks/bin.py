"""
Pins the arguments each wrapper hands `uv run`, which starts the program
the wrapper is named for out of the project's `.venv` whichever directory
the wrapper is called from. The wrappers are the files in the folder the
`_.path` entry in `.mise/config.toml` puts on `PATH`.

Each case runs a wrapper through its own shebang from the `tests` folder,
with a stand-in `uv` first on `PATH` that writes each argument it receives
on a line of its own.
"""

from collections.abc  import Callable
from common.stand_ins import StandIn, Wrapper
from pathlib          import Path
from pytest           import Config, Metafunc, param

from scotch.cli           import app
from scotch.repo.checkout import Checkout


def pytest_generate_tests(metafunc: Metafunc):
    """
    Parametrizes every case taking `wrapper` over the wrappers `Checkout`
    lists from the folder the `_.path` entry in `.mise/config.toml` names.
    """
    if "wrapper" in metafunc.fixturenames:
        metafunc.parametrize(
            "wrapper",
            [
                param(Wrapper(path=path), id=path.name)
                for path in Checkout(app=app, root=metafunc.config.rootpath).wrappers
            ]
        )


def test_a_wrapper_runs_its_program_from_its_project_venv(
    stand_in : Callable[[str], StandIn],
    tmp_path : Path,
    wrapper  : Wrapper
):
    """
    Asserts that a wrapper called from a subfolder runs `uv run` under
    `--exact --locked` against the project holding it, on the program of
    its own name in that project's `.venv`, passing every argument through
    whole, `prose` first syncing the environment inexactly without the
    project, since it never imports `scotch`, which leaves a built package
    installed, and then running under `--no-sync`.
    """
    calls = tmp_path / "calls.log"
    uv    = stand_in("uv", f'echo "$*" >> "{calls}"')
    flags = ["--no-sync"] if wrapper.path.name == "prose" else ["--exact", "--locked"]

    assert uv.run(wrapper, "two words", "--flag").returncode == 0
    *first, last = calls.read_text().splitlines()

    assert last.startswith("run ")
    assert len(first) == (wrapper.path.name == "prose")
    assert all(
        line.startswith("sync --inexact --locked --no-install-project --project ")
        for line in first
    )
    *head, project, program = uv.arguments[:len(flags) + 4]

    assert head == ["run", *flags, "--project"]
    assert Path(project).resolve() == wrapper.project
    assert Path(program).resolve() == wrapper.program
    assert uv.arguments[len(flags) + 4:] == ["two words", "--flag"]


def test_prose_stops_where_the_environment_sync_fails(
    pytestconfig : Config,
    stand_in     : Callable[..., StandIn],
    tmp_path     : Path
):
    """
    Asserts that the `prose` wrapper exits with the sync's status and
    never runs the formatter where `uv sync` fails, so no run reads a stale
    environment.
    """
    calls = tmp_path / "calls.log"
    prose = Wrapper(path=pytestconfig.rootpath / ".mise" / "bin" / "prose")

    assert stand_in("uv", f'echo "$1" >> "{calls}"; exit 3').run(prose).returncode == 3
    assert calls.read_text().splitlines() == ["sync"]
