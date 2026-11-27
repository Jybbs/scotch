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
from pytest           import Metafunc, param

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
    wrapper  : Wrapper
):
    """
    Asserts that a wrapper called from a subfolder runs `uv run` under
    `--exact --locked` against the project holding it, on the program of
    its own name in that project's `.venv`, passing every argument through
    whole, `prose` running under `--locked --no-install-project` instead,
    since it never imports `scotch` and leaves a built package installed.
    """
    uv = stand_in("uv")

    assert uv.run(wrapper, "two words", "--flag").returncode == 0
    flags = (
        ["--locked", "--no-install-project"]
        if wrapper.path.name == "prose"
        else ["--exact", "--locked"]
    )
    count = len(flags) + 1

    assert uv.arguments[:count + 1] == ["run", *flags, "--project"]
    assert Path(uv.arguments[count + 1]).resolve() == wrapper.project
    assert Path(uv.arguments[count + 2]).resolve() == wrapper.program
    assert uv.arguments[count + 3:] == ["two words", "--flag"]
