"""
Pins the global lazy import mode every interpreter of the project's
environment starts in, meaning the filter the installed `scotch.start`
file sets, the imports that filter keeps eager, and the defect each package
`EAGER` lists still carries.
"""

from pathlib    import Path
from pytest     import mark, param
from subprocess import run
from sys        import executable, get_lazy_imports, get_lazy_imports_filter, set_lazy_imports, set_lazy_imports_filter

from scotch.imports.filters import EAGER, Eager, lazily, start


def test_start_turns_on_the_global_mode_under_the_filter():
    """
    Asserts that `start` turns the global lazy import mode on under `lazily`
    in an interpreter running the normal mode with no filter, as the startup
    entry point finds it.
    """
    set_lazy_imports_filter(None)
    set_lazy_imports("normal")
    start()

    assert (get_lazy_imports(), get_lazy_imports_filter()) == ("all", lazily)


@mark.parametrize("importer", [*EAGER, *(f"{package}.inner" for package in EAGER)])
def test_a_listed_package_imports_eagerly(importer: str):
    """
    Asserts that every import a package `EAGER` lists makes, from the
    package or from any module inside it, runs eagerly.
    """
    assert not lazily(importer, "fnmatch", None)


@mark.parametrize(
    ("importer", "module"),
    [
        param("scotch.cli", "polars", id="the-package"),
        param("polars.dataframe", "polars.series", id="a-dependency"),
        param(None, "json", id="code-exec-runs-without-a-name"),
        *(
            param("scotch.cli", f"{package}.inner", id=f"scotch-importing-{package}")
            for package in EAGER
        ),
        *(
            param(f"{package}_plugin", "fnmatch", id=f"{package}-as-a-prefix")
            for package in EAGER
        )
    ]
)
def test_every_other_import_stays_lazy(importer: str | None, module: str):
    """
    Asserts that an import stays lazy wherever the module making it belongs
    to no listed package or is code `exec` runs without a name, whatever it
    imports and even where its package's name opens on a listed one.
    """
    assert lazily(importer, module, ("name",))


def test_the_environment_starts_in_the_global_mode_under_the_filter():
    """
    Asserts that the interpreter running the suite started in the global
    lazy import mode under `lazily`, which only the startup entry point the
    editable install carries sets.
    """
    assert (get_lazy_imports(), get_lazy_imports_filter()) == ("all", lazily)


@mark.parametrize("entry", EAGER.values(), ids=list(EAGER))
def test_each_listed_defect_still_reproduces(entry: Eager, tmp_path: Path):
    """
    Asserts that each entry's reproduction passes under `lazily` and fails
    once the filter is cleared, so a lift fixing the defect fails this case
    until the entry is removed.
    """
    under, cleared = (
        run([executable, "-c", source], capture_output=True, cwd=tmp_path).returncode
        for source in (
            entry.reproduction,
            f"import sys; sys.set_lazy_imports_filter(None); {entry.reproduction}"
        )
    )

    assert under == 0
    assert cleared
