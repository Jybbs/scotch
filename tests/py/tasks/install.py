"""
Pins what `site:install` leaves at a checkout's root and in its `tests/`
once the stand-in `bun` has run, meaning each root `node_modules` or
`package.json` link removed whatever it points at, a real file or folder
there kept with a line naming it, and `tests/node_modules` linked to
`../docs/node_modules` on the first run and on each run after it, and
`docs/node_modules` left newer than `docs/bun.lock`, and which changes make
a second `mise run site:install` run `bun` again.

Each case runs the task through its own shebang from a scratch checkout's
`docs/`, the folder its `dir` names, or through `mise run` from a scratch
checkout holding a copy of it, with a stand-in `bun` first on `PATH` that
logs each argument it receives.
"""

from collections.abc  import Callable
from common.stand_ins import StandIn
from os               import utime
from pathlib          import Path
from pytest           import Config, MonkeyPatch, mark, param
from shutil           import copy2
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


def test_a_run_leaves_docs_node_modules_newer_than_the_lockfile(
    pytestconfig : Config,
    stand_in     : Callable[..., StandIn],
    tmp_path     : Path
):
    """
    Asserts that `site:install` leaves `docs/node_modules` newer than
    `docs/bun.lock` where the stand-in `bun` writes nothing into it, so the
    outputs it declares read as current until the lockfile changes again.
    """
    (modules := tmp_path / "docs" / "node_modules").mkdir(parents=True)
    utime(modules, (1, 1))
    (lockfile := tmp_path / "docs" / "bun.lock").touch()

    assert install(tmp_path, pytestconfig, stand_in).returncode == 0
    assert modules.stat().st_mtime_ns > lockfile.stat().st_mtime_ns


@mark.parametrize(
    ("change", "reruns"),
    [
        param(lambda docs: None, False, id="nothing-changed"),
        param(lambda docs: (docs / "bun.lock").touch(), True, id="lockfile-touched"),
        param(
            lambda docs: (docs / "package.json").write_text("{}"),
            True,
            id = "manifest-edited"
        ),
        param(
            lambda docs: (docs.parent / "tests" / "node_modules").rename(
                docs.parent / "moved"
            ),
            True,
            id = "suite-link-moved"
        )
    ]
)
def test_mise_runs_the_install_again_only_where_a_source_or_output_moved(
    change       : Callable[[Path], object],
    monkeypatch  : MonkeyPatch,
    pytestconfig : Config,
    reruns       : bool,
    stand_in     : Callable[..., StandIn],
    tmp_path     : Path
):
    """
    Asserts that a second `mise run site:install` runs `bun` again
    only where `docs/bun.lock` or `docs/package.json` changed or the
    `tests/node_modules` link moved away since the first, and otherwise
    exits without running it.
    """
    (tasks := tmp_path / ".mise" / "tasks" / "site").mkdir(parents=True)
    copy2(pytestconfig.rootpath / ".mise" / "tasks" / "site" / "install", tasks)
    (tmp_path / "mise.toml").touch()
    (docs := tmp_path / "docs").mkdir()
    (docs / "bun.lock").touch()
    (docs / "package.json").touch()
    (tmp_path / "tests").mkdir()
    monkeypatch.setenv("MISE_STATE_DIR", str(tmp_path / "state"))
    monkeypatch.setenv("MISE_TRUSTED_CONFIG_PATHS", str(tmp_path))
    bun = stand_in("bun", "mkdir -p node_modules")
    log = bun.root / "arguments.log"

    assert bun.start(["mise", "run", "site:install"], tmp_path).returncode == 0
    log.unlink()
    change(docs)

    assert bun.start(["mise", "run", "site:install"], tmp_path).returncode == 0
    assert log.exists() == reruns


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
