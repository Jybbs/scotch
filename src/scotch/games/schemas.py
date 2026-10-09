"""
Holds the `Game` record each game in a Portable Game Notation (PGN) file is
read into.
"""

from chess           import Board, Move
from chess.pgn       import Headers, read_game
from chess.polyglot  import zobrist_hash
from collections.abc import Iterator
from functools       import cached_property, partial
from itertools       import islice
from pathlib         import Path
from pydantic        import BaseModel
from typing          import Self

from scotch.games.builders import MainlineBuilder


class Game(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One game a PGN file carries, meaning its tags, its mainline's moves, and
    each error python-chess's reader recorded.
    """

    errors: tuple[str, ...]
    """
    The message of each error python-chess's reader recorded, such as a move
    illegal in the position it was played from.
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

    @cached_property
    def keys(self) -> tuple[int, ...]:
        """
        Hashes each position of the mainline through python-chess's
        `zobrist_hash`, so two positions share a key where FIDE's Laws of
        Chess, Article 9.2.3, count them as the same position, save that
        the hash reads the en passant file wherever a pawn stands ready to
        capture, legal or not.
        """
        return tuple(map(zobrist_hash, self.boards()))

    @cached_property
    def placements(self) -> tuple[str, ...]:
        """
        Reads the piece placement of each position `boards` yields, the
        first field of its Forsyth–Edwards Notation (FEN).
        """
        return tuple(map(Board.board_fen, self.boards()))

    @property
    def problems(self) -> tuple[str, ...]:
        """
        Adds python-chess's message for a variant it cannot read to the
        errors its reader recorded, wherever the `Variant` tag names
        anything but standard chess and the message is not among them, since
        the reader reads Chess960 and several other variants under their own
        rules without recording it.
        """
        variant = self.tags.get("Variant", "Standard")

        if variant.casefold() in map(str.casefold, Board.aliases):
            return self.errors

        return tuple(dict.fromkeys((*self.errors, f"unsupported variant: {variant}")))

    @cached_property
    def sans(self) -> tuple[str, ...]:
        """
        Writes each move of the mainline in Standard Algebraic Notation
        (SAN), read against the position it was played from.
        """
        return tuple(map(Board.san, self.boards(), self.moves))

    def boards(self) -> Iterator[Board]:
        """
        Yields the board at each position of the mainline, from the one the
        `FEN` tag sets up or the standard starting position to the one after
        the last move, pushing each move onto the one board it yields, or no
        board where python-chess raises `ValueError` setting up the `FEN` or
        `Variant` tag.
        """
        try:
            board = Headers(self.tags).board()
        except ValueError:
            return

        yield board

        for move in self.moves:
            board.push(move)
            yield board

    def numbered(self, ply: int) -> str:
        """
        Writes the move played from the position at `ply` in SAN behind its
        move number, such as `22. Bc2` for White and `13...Bxa1` for Black.
        """
        return next(islice(self.boards(), ply, None)).variation_san([self.moves[ply]])

    @classmethod
    def read(cls, path: Path) -> Iterator[Self]:
        """
        Reads every game the PGN file at `path` carries, in the order it
        holds them, decoding the file as UTF-8 and replacing each byte UTF-8
        cannot decode with U+FFFD, so a file another code page wrote still
        yields every move, every move being ASCII.
        """
        with path.open(encoding="utf-8", errors="replace") as handle:
            for game in iter(partial(read_game, handle, Visitor=MainlineBuilder), None):
                yield cls(
                    errors = map(str, game.errors),
                    moves  = game.mainline_moves(),
                    tags   = game.headers
                )

