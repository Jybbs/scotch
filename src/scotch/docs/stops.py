"""
Holds `Stops`, the messages a command exits nonzero on, read from the
`stops.toml` beside this module, which the commands page sets beneath each
command, Matching a Game sets for the games it refuses, and the audit's
`StopCheck` holds to the messages the code prints.
"""

from collections.abc         import Iterator
from importlib.resources     import files
from importlib.resources.abc import Traversable
from pathlib                 import Path
from pydantic                import BaseModel, Field
from re      import sub
from tomllib import loads
from typing  import Annotated, ClassVar, Self

from scotch.docs.tallies import coded, markdown


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

    check: str | None = None
    """
    The check a file fails to print the message, named in a few words, where
    the Guide's sentence on the games a match refuses names it.
    """

    external: Annotated[bool, Field(exclude=True)] = False
    """
    Whether a library prints the message before the command runs, so no file
    `Stops.modules` lists holds it.
    """

    phrase: str | None = None
    """
    The phrase finishing *"A match refuses a file that"* for the message,
    where the Guide's sentence on the games a match refuses names it.
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

    def printed(self, command: str, naming: str | None = None) -> Iterator[Stop]:
        """
        Yields each message `command` exits nonzero on, or each one holding
        `naming` where it is given, in the order the registry lists them.
        """
        return (
            stop
            for stop in self.stops
            if command in stop.commands and (naming is None or naming in stop.message)
        )

    @classmethod
    def read(cls, path: Traversable = files("scotch.docs") / "stops.toml") -> Self:
        """
        Reads every message of the `stops.toml` at `path`, the one the
        `scotch.docs` package ships unless another is named.
        """
        return cls.model_validate(loads(path.read_text(encoding="utf-8")))

    def table(self, command: str, naming: str | None = None) -> str:
        """
        Writes the table of each message `command` exits nonzero on, or each
        one holding `naming` where it is given, beside when it prints it and
        the step that clears it, or nothing where it exits on none.
        """
        rows = [
            (coded(stop.message), stop.when, stop.clears)
            for stop in self.printed(command, naming)
        ]

        return markdown(
            headers = ("Message", "When", "Clears It"),
            right   = False,
            rows    = rows
        ) if rows else ""
