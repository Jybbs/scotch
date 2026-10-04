"""
Pins what each wrapper in the folder the `_.path` entry in
`.mise/config.toml` puts on `PATH` hands `uv run`, which runs the program
the wrapper is named for out of the project's `.venv`, whichever directory
it is called from.

Each case runs a wrapper through its own shebang from the `tests` folder,
with a stand-in `uv` first on `PATH` that writes each argument it receives
on a line of its own. The `repo:audit` row holds every wrapper to a plain
file carrying the same bytes as the others.
"""

from common.stand_ins import StandIn, Wrapper
from pathlib          import Path
from pytest           import Metafunc, param

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
                for path in Checkout(root=metafunc.config.rootpath).wrappers
            ]
        )


def test_a_wrapper_runs_its_program_from_its_project_venv(
    stand_in : StandIn,
    wrapper  : Wrapper
):
    """
    Asserts that a wrapper called from a subfolder runs `uv run` under
    `--exact --locked` against the project holding it, on the program of
    its own name in that project's `.venv`, passing every argument through
    whole.
    """
    assert stand_in.run(wrapper, "two words", "--flag").returncode == 0
    assert stand_in.arguments[:4] == ["run", "--exact", "--locked", "--project"]
    assert Path(stand_in.arguments[4]).resolve() == wrapper.project
    assert Path(stand_in.arguments[5]).resolve() == wrapper.program
    assert stand_in.arguments[6:] == ["two words", "--flag"]
