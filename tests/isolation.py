"""
Pins the isolation the suite keeps from the machine running it, covering
the shell variables each test starts without, the home directory it reads,
the block that stops a test without the `network` mark from opening a
connection, and the mark that lets a `network` test open one.
"""

from collections.abc import Iterator
from os              import environ
from pathlib         import Path
from pytest          import FixtureRequest, MonkeyPatch, fixture, mark, raises, warns
from pytest_socket   import SocketBlockedError
from socket          import create_connection
from tests.conftest  import CLEARED, pytest_collection_modifyitems

from scotch.cli.settings import Settings


def test_a_network_test_gets_the_mark_that_opens_the_socket(request: FixtureRequest):
    """
    Asserts that the collection hook in `tests/conftest.py` gives a test
    carrying the `network` mark pytest-socket's `enable_socket` mark, which
    lets that test open a connection.
    """
    request.node.add_marker(mark.network)
    pytest_collection_modifyitems([request.node])

    assert request.node.get_closest_marker("enable_socket")


def test_a_socket_stays_closed_outside_the_network_mark():
    """
    Asserts that a test without the `network` mark cannot open a connection,
    pytest-socket issuing a warning and then raising `SocketBlockedError` on
    the attempt.

    `create_connection` looks `getaddrinfo` up on the socket module each
    time it runs rather than binding it once at import, and that name is the
    one pytest-socket replaces when a test starts.
    """
    with warns(UserWarning), raises(SocketBlockedError):
        create_connection(("blocked.invalid", 80))


def test_home_is_an_empty_directory():
    """
    Asserts that `~` resolves to an empty directory, so no test reads a
    dotfile from the developer's home.
    """
    assert list(Path.home().iterdir()) == []


@fixture(
    params = (
        *CLEARED,
        *(
            casing(f"{Settings.model_config['env_prefix']}{field}")
            for field in Settings.model_fields
            for casing in (str.upper, str.lower)
        )
    ),
    scope = "module"
)
def name(request: FixtureRequest) -> Iterator[str]:
    """
    Sets the variable `request.param` names and yields that name.

    A module-scoped fixture runs before the function-scoped `environment`
    fixture, so the variable is set on every machine by the time
    `environment` clears it, a CI runner that never sets it included.
    """
    with MonkeyPatch.context() as patched:
        patched.setenv(request.param, "1")

        yield request.param


def test_the_shell_carries_no_variable_that_changes_a_result(name: str):
    """
    Asserts that no variable `CLEARED` names, and no variable `Settings`
    reads in either case, reaches a test.
    """
    assert name not in environ
