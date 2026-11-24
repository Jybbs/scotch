"""
Pins what `site:install` leaves at a checkout's root and in its `tests/`
once the stand-in `bun` has run, meaning each root `node_modules` or
`package.json` link removed whatever it points at, a real file or folder
there kept with a line naming it, and `tests/node_modules` linked to
`../docs/node_modules` on the first run and on each run after it.

Each case runs the task through its own shebang from a scratch checkout's
`docs/`, the folder its `dir` names, with a stand-in `bun` first on `PATH`
that logs each argument it receives.
"""

from collections.abc  import Callable
from common.stand_ins import StandIn
from pathlib          import Path
from pytest           import Config, mark, param
from subprocess       import CompletedProcess

NAMES = ("node_modules", "package.json")


def install(
    checkout     : Path,
    pytestconfig : Config,
    stand_in     : Callable[..., StandIn]
) -> CompletedProcess[str]:
    """
    Runs `site:install` from the `docs/` of `checkout` against a stand-in
    `bun`, laying out `docs/node_modules`, `docs/package.json`, and `tests/`
    first where they are missing.
    """
    (checkout / "docs" / "node_modules").mkdir(exist_ok=True, parents=True)
    (checkout / "docs" / "package.json").touch()
    (checkout / "tests").mkdir(exist_ok=True)

    return stand_in("bun").start(
        [pytestconfig.rootpath / ".mise" / "tasks" / "site" / "install"],
        checkout / "docs"
    )


@mark.parametrize(
    "target",
    [param("docs/{}", id="the-site-s-own"), param("gone/{}", id="dangling")]
)
def test_a_root_link_is_removed_whatever_it_points_at(
    pytestconfig : Config,
    stand_in     : Callable[..., StandIn],
    target       : str,
    tmp_path     : Path
):
    """
    Asserts that `site:install` removes the root `node_modules` and
    `package.json` links an install made before `tests/node_modules`, and a
    dangling link at either path, printing nothing.
    """
    for name in NAMES:
        (tmp_path / name).symlink_to(target.format(name))

    result = install(tmp_path, pytestconfig, stand_in)

    assert result.returncode == 0
    assert result.stderr == ""
    assert [name for name in NAMES if (tmp_path / name).is_symlink()] == []


def test_a_real_root_file_or_folder_is_kept_with_a_line_naming_it(
    pytestconfig : Config,
    stand_in     : Callable[..., StandIn],
    tmp_path     : Path
):
    """
    Asserts that `site:install` keeps a real root `node_modules` folder and
    `package.json` file with what each holds, printing a line naming each to
    standard error and exiting zero.
    """
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / "kept").write_text("kept")
    (tmp_path / "package.json").write_text("{}")

    result = install(tmp_path, pytestconfig, stand_in)

    assert result.returncode == 0
    assert result.stderr.splitlines() == [
        f"Left the root {name} in place, since it is not a link" for name in NAMES
    ]
    assert (tmp_path / "node_modules" / "kept").read_text() == "kept"
    assert (tmp_path / "package.json").read_text() == "{}"


def test_a_second_run_leaves_the_suite_s_link_as_it_was(
    pytestconfig : Config,
    stand_in     : Callable[..., StandIn],
    tmp_path     : Path
):
    """
    Asserts that two runs of `site:install` leave `tests/node_modules`
    a relative link to `../docs/node_modules` and write nothing inside
    `docs/node_modules`.
    """
    for _ in range(2):
        assert install(tmp_path, pytestconfig, stand_in).returncode == 0

    assert (tmp_path / "tests" / "node_modules").readlink() == Path(
        "../docs/node_modules"
    )
    assert list((tmp_path / "docs" / "node_modules").iterdir()) == []
