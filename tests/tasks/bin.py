"""
Pins the wrappers in the folder the `_.path` entry in `.mise/config.toml`
puts on `PATH`, each of which runs the program it is named for out of the
project's `.venv` through `uv run`, whichever directory it is called from.

Each case runs a wrapper through its own shebang from the `tests` folder,
with a stand-in `uv` first on `PATH` that writes each argument it receives
on a line of its own.
"""

from os         import environ, pathsep
from pathlib    import Path
from pydantic   import BaseModel
from pytest     import Metafunc, fixture, param
from subprocess import CompletedProcess, run
from tomllib    import loads


class StandIn(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    A stand-in `uv` that writes each argument it receives to a log, one per
    line, and exits zero.
    """

    root: Path
    """
    The directory holding the stand-in and its log.
    """

    @property
    def arguments(self) -> list[str]:
        """
        Reads the arguments the stand-in received, in the order it received
        them.
        """
        return (self.root / "arguments.log").read_text().splitlines()

    @property
    def variables(self) -> dict[str, str]:
        """
        Copies the suite's environment with the stand-in first on `PATH`.
        """
        return {**environ, "PATH": f"{self.root}{pathsep}{environ['PATH']}"}

    def run(self, wrapper: Path, *arguments: str) -> CompletedProcess[str]:
        """
        Runs `wrapper` with `arguments` from the `tests` folder of the
        project holding it, with the stand-in first on `PATH`.
        """
        return run(
            [wrapper, *arguments],
            capture_output = True,
            check          = False,
            cwd            = wrapper.parents[2] / "tests",
            env            = self.variables,
            text           = True
        )


def pytest_generate_tests(metafunc: Metafunc):
    """
    Parametrizes every case taking `wrapper` over the files in the folder
    the `_.path` entry in `.mise/config.toml` names, which mise resolves
    against the directory holding `.mise`.
    """
    if "wrapper" in metafunc.fixturenames:
        root   = metafunc.config.rootpath
        config = loads((root / ".mise" / "config.toml").read_text())
        folder = root / config["env"]["_"]["path"]
        metafunc.parametrize(
            "wrapper",
            [param(path, id=path.name) for path in sorted(folder.iterdir())]
        )


@fixture
def stand_in(tmp_path: Path) -> StandIn:
    """
    Writes the stand-in `uv` into `tmp_path`.
    """
    uv = tmp_path / "uv"
    uv.write_text(f'#!/bin/sh\nprintf "%s\\n" "$@" > "{tmp_path / "arguments.log"}"\n')
    uv.chmod(0o755)

    return StandIn(root=tmp_path)


def test_each_wrapper_is_a_file_holding_the_bytes_of_the_first(wrapper: Path):
    """
    Asserts that every wrapper is a plain file rather than a symlink, which
    git checks out as a file holding the link's target where `core.symlinks`
    is off, and that it holds the same bytes as the first wrapper in the
    folder.
    """
    assert not wrapper.is_symlink()
    assert wrapper.read_bytes() == min(wrapper.parent.iterdir()).read_bytes()


def test_a_wrapper_runs_its_program_from_its_project_venv(
    stand_in : StandIn,
    wrapper  : Path
):
    """
    Asserts that a wrapper called from a subfolder runs `uv run` under
    `--exact --locked` against the project holding it, on the program of
    its own name in that project's `.venv`, passing every argument through
    whole.
    """
    root = wrapper.parents[2].resolve()
    venv = root / ".venv" / "bin"

    assert stand_in.run(wrapper, "two words", "--flag").returncode == 0
    assert stand_in.arguments[:4] == ["run", "--exact", "--locked", "--project"]
    assert Path(stand_in.arguments[4]).resolve() == root
    assert Path(stand_in.arguments[5]).resolve() == venv / wrapper.name
    assert stand_in.arguments[6:] == ["two words", "--flag"]
