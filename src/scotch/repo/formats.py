"""
Holds `Format`, the shape `scotch audit repo` prints each finding in, which
cyclopts resolves as the type of that command's `--output-format` each time
the app registers the command, on every run of `scotch`.
"""

from enum import StrEnum, auto


class Format(StrEnum):
    """
    The shape `scotch audit repo` prints each finding in.
    """

    GITHUB = auto()
    TEXT   = auto()
