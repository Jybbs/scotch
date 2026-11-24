"""
Holds `invoke`, which runs the `scotch` command in the test process.
"""

from pytest import raises

from scotch.cli import app


def invoke(*argv: str) -> int | str:
    """
    Runs `scotch` with `argv`, reading the exit status from the `SystemExit`
    the app raises after every invocation, which carries the message where a
    command exits naming its problem.
    """
    with raises(SystemExit) as exit:
        app(argv)

    return exit.value.code
