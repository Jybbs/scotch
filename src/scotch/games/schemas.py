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

    @cached_property
    def keys(self) -> tuple[int, ...]:
        """
        Hashes each position of the mainline through python-chess's
        `zobrist_hash`, which reads the piece placement, the side to
        move, the castling rights, and the en passant file wherever a pawn
        stands ready to capture, whether or not that capture is legal. Two
        positions therefore share a key where FIDE's Laws of Chess, Article
        9.2.3, count them as the same position, save where that en passant
        capture would be illegal.
        """
        return tuple(map(zobrist_hash, self.boards()))

    @cached_property
    def placements(self) -> tuple[str, ...]:
        """
        Reads the piece placement of each position of the mainline, the
        first field of its Forsyth–Edwards Notation (FEN), from the starting
        position to the one after the last move.
        """
        return tuple(map(Board.board_fen, self.boards()))

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

    @cached_property
    def sans(self) -> tuple[str, ...]:
        """
        Writes each move of the mainline in Standard Algebraic Notation
        (SAN), read against the position it was played from.
        """
        return tuple(map(Board.san, self.boards(), self.moves))

    def boards(self) -> Iterator[Board]:
        """
        Yields the board at each position of the mainline, from the position
        the `FEN` tag sets up, or the standard starting position where the
        game carries none, to the one after the last move.

        Each step yields the one board the next move is then pushed onto, so
        a caller reads each position before drawing the next.
        """
        board = Headers(self.tags).board()
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

