"""
Holds `Format`, the shape `scotch audit repo` prints each finding in, which
cyclopts resolves as the type of that command's `--output-format` once a run
imports `scotch.cli.audit`, the module registering the command.
"""

from enum import StrEnum, auto


class Format(StrEnum):
    """
    The shape `scotch audit repo` prints each finding in.
    """

    GITHUB = auto()
    TEXT   = auto()
