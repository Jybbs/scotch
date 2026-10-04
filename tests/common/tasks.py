"""
Holds `mirror`, which imports the task script under `.mise/tasks/` that a
test module under `tests/tasks/` mirrors.
"""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib        import Path
from types          import ModuleType


def mirror(root: Path, test: Path) -> ModuleType:
    """
    Imports the task script the test module at `test` mirrors under `root`,
    so `tests/tasks/gha/cut.py` imports `.mise/tasks/gha/cut.py`, leaving
    the script's `__main__` block unrun.
    """
    path   = root / ".mise" / test.relative_to(root / "tests")
    spec   = spec_from_file_location(path.stem, path)
    module = module_from_spec(spec)
    spec.loader.exec_module(module)

    return module
