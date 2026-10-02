"""
Holds the `Game` record each game in a Portable Game Notation (PGN) file is
read into through python-chess's own reader.
"""

from chess           import Board, Move
from chess.pgn       import read_game
from collections.abc import Iterator
from functools       import partial
from pathlib         import Path
from pydantic        import BaseModel
from typing          import Self


class Game(BaseModel, frozen=True, use_attribute_docstrings=True):
    """
    One game a PGN file carries, meaning its tags, the moves of its
    mainline, and each error python-chess's reader recorded while reading
    it.
    """

    errors: tuple[str, ...]
    """
    The message of each error python-chess's reader recorded, such as a move
    illegal in the position it was played from, after which the reader keeps
    no later move of the mainline.
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
            Each error in the order the reader recorded it, with the variant's
            message last and never twice.
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

        Decodes the file as UTF-8, the encoding python-chess's reader
        documents, and reads each byte UTF-8 cannot decode as U+FFFD. Every
        move is ASCII, so a file another code page wrote still yields every
        move.
        """
        with path.open(encoding="utf-8", errors="replace") as handle:
            for game in iter(partial(read_game, handle), None):
                yield cls(
                    errors = map(str, game.errors),
                    moves  = game.mainline_moves(),
                    tags   = game.headers
                )
