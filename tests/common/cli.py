"""
Holds `invoke`, which runs the `scotch` command in the test process and
reads the status it exits with.
"""

from pytest import raises

from scotch.cli import app


def invoke(*argv: str) -> int:
    """
    Runs `scotch` with `argv`, reading the exit status from the `SystemExit`
    the app raises after every invocation, whether it printed the help or
    the version, ran a command, or refused a token.
    """
    with raises(SystemExit) as exit:
        app(argv)

    return exit.value.code
