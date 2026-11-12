"""
Holds `Stops`, the messages a command exits nonzero on, read from the
`stops.toml` beside this module, which the commands page sets beneath each
command, the Guide's walkthroughs set for the steps they cover, and the
audit's `StopCheck` holds to the messages the code prints.
"""

from collections.abc         import Iterable
from importlib.resources     import files
from importlib.resources.abc import Traversable
from pathlib                 import Path
from pydantic                import BaseModel
from re      import sub
from tomllib import loads
from typing  import ClassVar, Self

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

    def steps(self, commands: Iterable[str]) -> str:
        """
        Writes the table of each message `commands` exit nonzero on, in the
        order given, each beside the command linked to its section of the
        commands page, when it prints the message, and the step that clears
        it.
        """
        return markdown(
            headers = ("Command", "Message", "When", "Clears It"),
            right   = False,
            rows    = (
                (
                    f"[`scotch {command}`](../reference/commands.md"
                    f"#scotch-{command.replace(' ', '-')})",
                    coded(stop.message),
                    stop.when, stop.clears
                )
                for command in commands
                for stop in self.stops
                if command in stop.commands
            )
        )

    def table(self, command: str, naming: str | None = None) -> str:
        """
        Writes the table of each message `command` exits nonzero on, or each
        one holding `naming` where it is given, beside when it prints it and
        the step that clears it, or nothing where it exits on none.
        """
        rows = [
            (coded(stop.message), stop.when, stop.clears)
            for stop in self.stops
            if command in stop.commands and (naming is None or naming in stop.message)
        ]

        return markdown(
            headers = ("Message", "When", "Clears It"),
            right   = False,
            rows    = rows
        ) if rows else ""
