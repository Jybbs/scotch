"""
Holds `start`, which turns on Python's global lazy import mode in every
interpreter the project's environment starts, since the `scotch.start` file
the wheel carries names it as a startup entry point. The mode runs under
`lazily`, which keeps eager the imports of each package `EAGER` lists, every
entry an `Eager` naming the defect that keeps its package on the list.
"""

from dataclasses import dataclass
from sys         import set_lazy_imports, set_lazy_imports_filter


@dataclass(frozen=True, kw_only=True)
class Eager:
    """
    The defect that keeps a package's own modules importing eagerly under
    the global lazy import mode.
    """

    defect: str
    """
    What fails where the package's modules import lazily.
    """

    reproduction: str
    """
    Python source an interpreter of the environment runs through `-c`, which
    passes under `lazily` and fails with the defect once a call to
    `sys.set_lazy_imports_filter(None)` ahead of it clears the filter.
    """

    issue: str | None = None
    """
    The address of the upstream issue tracking the defect, or `None` where
    no issue tracks it.
    """


EAGER = frozendict(
    hypothesis = Eager(
        defect = (
            "`hypothesis.strategies` asserts at import time that every strategy "
            "it exports has registered itself, which a strategy does only when "
            "the module defining it runs, so the assertion fails while those "
            "modules' imports stay lazy"
        ),
        reproduction = "import hypothesis.strategies; hypothesis.strategies.integers"
    ),
    _pytest = Eager(
        defect = (
            "pytest's assertion-rewriting import hook resolves the lazy import "
            "of `fnmatch` in `_pytest.pathlib` while it is itself importing, "
            "which raises `ImportCycleError` and stops pytest before it starts"
        ),
        issue        = "https://github.com/pytest-dev/pytest/issues/14632",
        reproduction = "import pytest, sys; sys.exit(pytest.main(['--help']))"
    )
)


def lazily(importer: str | None, module: str, names: tuple[str, ...] | None) -> bool:
    """
    Lets an import stay lazy unless the module making it belongs
    to a package `EAGER` lists, reading the first of the arguments
    `sys.set_lazy_imports_filter` calls a filter with.

    Args:
        importer : The module making the import, or `None` for code `exec`
                   runs under globals holding no `__name__`.
        module   : The module imported.
        names    : The names a `from` import takes, or `None` for a plain
                   `import`.

    Returns:
        `True` where the import stays lazy, and `False` where it runs
        eagerly.
    """
    return (importer or "").partition(".")[0] not in EAGER


def start():
    """
    Turns on the global lazy import mode under `lazily`, so each
    module-level import outside a `try` block waits until its name is first
    read.
    """
    set_lazy_imports_filter(lazily)
    set_lazy_imports("all")
