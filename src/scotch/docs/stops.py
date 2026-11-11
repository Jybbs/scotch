"""
Holds `Stops`, the messages a command exits nonzero on, read from the
`stops.toml` beside this module, which the commands page sets beneath each
command and the audit's `StopCheck` holds to the messages the code prints.
"""

from importlib.resources     import files
from importlib.resources.abc import Traversable
from pathlib                 import Path
from pydantic                import BaseModel
from re      import sub
from tomllib import loads
from typing  import ClassVar, Self

from scotch.docs.tallies import markdown


class Stop(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One message a command exits nonzero on.
    """

    clears: str
    """
    The step that clears the message.
    """

    commands: tuple[str, ...]
    """
    Each command printing the message, as its verb and its noun.
    """

    message: str
    """
    The message, each part a run fills in written as a name between `<` and
    `>`, such as `<pgn>`.
    """

    when: str
    """
    The condition the command prints the message under.
    """

    @property
    def template(self) -> str:
        """
        Writes the message with each part a run fills in as `{}`, the shape
        `StopCheck` reads each message of the code in.
        """
        return sub(r"<[a-z]+>", "{}", self.message)


class Stops(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The messages `stops.toml` declares, beside the files holding them.
    """

    path: ClassVar[Path] = Path("src/scotch/docs/stops.toml")
    """
    The registry's place in the repository, relative to its root.
    """

    modules: tuple[str, ...]
    """
    Each file, relative to the repository's root, holding a message a
    command the help lists exits nonzero on, each command's own module among
    them.
    """

    stops: tuple[Stop, ...]
    """
    Each message, in the order the commands page lists it.
    """

    @classmethod
    def read(cls, path: Traversable = files("scotch.docs") / "stops.toml") -> Self:
        """
        Reads every message of the `stops.toml` at `path`, the one the
        `scotch.docs` package ships unless another is named.
        """
        return cls.model_validate(loads(path.read_text(encoding="utf-8")))

    def table(self, command: str) -> str:
        """
        Writes the table of each message `command` exits nonzero on, beside
        when it prints it and the step that clears it, or nothing where it
        exits on none.
        """
        rows = [
            (coded(stop.message), stop.when, stop.clears)
            for stop in self.stops
            if command in stop.commands
        ]

        return markdown(
            headers = ("Message", "When", "Clears It"),
            right   = False,
            rows    = rows
        ) if rows else ""


def coded(text: str) -> str:
    """
    Writes `text` as inline code, between doubled backticks where it holds
    one, as CommonMark reads a code span.
    """
    return f"`` {text} ``" if "`" in text else f"`{text}`"
