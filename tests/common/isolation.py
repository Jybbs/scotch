"""
Holds the isolation every test keeps from the machine running it, meaning
`CLEARED`, the shell variables the root `conftest.py` clears before each
test, and the collection hook that lets a test open a network connection
only when it carries the `network` mark, a pytest plugin the root
`conftest.py` registers through `pytest_plugins`.
"""

from pytest import Item, mark

CLEARED = (
    "CLICOLOR", "COLORTERM", "COLUMNS", "FORCE_COLOR", "GITHUB_OUTPUT",
    "GITHUB_STEP_SUMMARY", "LINES", "NO_COLOR", "TTY_COMPATIBLE",
    "TTY_INTERACTIVE", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_STATE_HOME"
)


def pytest_collection_modifyitems(items: list[Item]):
    """
    Adds pytest-socket's `enable_socket` mark to every test carrying the
    `network` mark. The `--disable-socket` option in `addopts` blocks every
    test from opening a connection, and a test carrying `enable_socket` can
    reach a live service again.
    """
    for item in items:
        if item.get_closest_marker("network"):
            item.add_marker(mark.enable_socket)
