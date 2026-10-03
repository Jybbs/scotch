"""
Holds the `Game` record each game in a Portable Game Notation (PGN) file is
read into.
"""

from chess           import Board, Move
from chess.pgn       import read_game
from collections.abc import Iterator
from functools       import partial
from pathlib         import Path
from pydantic        import BaseModel
from typing          import Self

from scotch.games.builders import MainlineBuilder


class Game(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One game a PGN file carries, meaning its tags, the moves of its
    mainline, and each error python-chess's reader recorded while reading
    it.
    """

    errors: tuple[str, ...]
    """
    The message of each error python-chess's reader recorded reading the tags
    and the mainline, such as a move illegal in the position it was played
    from.
    """

    moves: tuple[Move, ...]
    """
    The moves of the mainline in the order they were played, leaving out
    every variation.
    """

    tags: dict[str, str]
    """
    The value of each tag pair keyed by its name, where python-chess fills a
    tag of the Seven Tag Roster the file leaves out with its placeholder.
    """

    @property
    def problems(self) -> tuple[str, ...]:
        """
        Adds python-chess's message for a variant it cannot read to the
        errors its reader recorded, wherever the `Variant` tag names
        anything but standard chess. The reader reads Chess960 and several
        other variants under their own rules without recording that message.

        Returns:
            Each error in the order the reader recorded it, followed by the
            variant's message wherever the reader did not record it already.
            A `[Variant "Bughouse"]` game puts that message first, since the
            reader records it before reading the position or any move.
        """
        variant = self.tags.get("Variant", "Standard")

        if variant.casefold() in map(str.casefold, Board.aliases):
            return self.errors

        return tuple(dict.fromkeys((*self.errors, f"unsupported variant: {variant}")))

    @classmethod
    def read(cls, path: Path) -> Iterator[Self]:
        """
        Reads every game the PGN file at `path` carries, in the order the
        file holds them.

        Decodes the file as UTF-8, one of the two encodings python-chess's
        reader names as usual for a PGN file, and replaces what UTF-8 cannot
        decode with U+FFFD. A file another code page wrote therefore still
        yields every move, since every move is ASCII.
        """
        with path.open(encoding="utf-8", errors="replace") as handle:
            for game in iter(partial(read_game, handle, Visitor=MainlineBuilder), None):
                yield cls(
                    errors = map(str, game.errors),
                    moves  = game.mainline_moves(),
                    tags   = game.headers
                )

