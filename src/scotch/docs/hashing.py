"""
Holds `Hashing`, the numbers of Polyglot's table each move of a line takes
out of its position's key and puts in, beside the `Passant` positions whose
en passant file the key reads or leaves out, which `scotch render docs`
writes out as the JSON the Position Keys page draws.
"""

from chess          import Board, COLOR_NAMES, FILE_NAMES, piece_name, square_file, square_name
from chess.polyglot import POLYGLOT_RANDOM_ARRAY
from itertools      import pairwise
from pydantic       import BaseModel, NonNegativeInt, computed_field
from typing         import ClassVar, Self

from scotch.games         import readers
from scotch.games.schemas import Game


class Passant(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    A position whose pawn has just advanced two squares beside a pawn of the
    side to move, with its key and the key of the same position with no en
    passant square, each as sixteen hexadecimal digits.
    """

    cleared: str
    """
    The key of the position with no en passant square.
    """

    counted: str
    """
    The key of the position as the index keys it.
    """

    fen: str
    """
    The position in Forsyth–Edwards Notation (FEN).
    """

    legal: bool
    """
    Whether a legal move plays the en passant capture.
    """

    @classmethod
    def from_fen(cls, fen: str) -> Self:
        """
        Keys the position `fen` sets up with its en passant square and
        without.
        """
        board                = Board(fen)
        bare                 = board.copy()
        bare.ep_square       = None
        [counted], [cleared] = (readers.keys([], fen=each.fen()) for each in (
            board, bare
        ))

        return cls(
            cleared = f"{cleared:016x}",
            counted = f"{counted:016x}",
            fen     = fen,
            legal   = board.has_legal_en_passant()
        )


class Term(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One number of Polyglot's table a position's key combines, beside what it
    stands for.
    """

    index: NonNegativeInt
    """
    The number's place in Polyglot's table of 781.
    """

    name: str
    """
    What the number stands for, such as `White pawn d4`, `White castling
    short`, or `White to move`.
    """

    piece: str | None = None
    """
    The symbol of the piece the number stands for, or `None` where it
    stands for a castling right, the en passant file, or the side to move.
    """

    square: NonNegativeInt | None = None
    """
    The square the piece stands on, a1 being 0, or `None` beside no piece.
    """

    @classmethod
    def combined(cls, board: Board) -> tuple[Self, ...]:
        """
        Lists every number the key of `board` combines, as python-chess's
        `ZobristHasher` reads them, save that the en passant file counts
        only where a legal move plays the capture, as the index keys it: one
        for each piece on its square, a1 first, one for each castling right,
        one for the file, and one where White is to move.
        """
        rights = (
            (768, "White castling short", board.has_kingside_castling_rights(True)),
            (769, "White castling long", board.has_queenside_castling_rights(True)),
            (770, "Black castling short", board.has_kingside_castling_rights(False)),
            (771, "Black castling long", board.has_queenside_castling_rights(False))
        )
        passant = board.ep_square if board.has_legal_en_passant() else None

        return (
            *(
                cls(
                    index = 64 * ((piece.piece_type - 1) * 2 + piece.color) + square,
                    name  = (
                        f"{COLOR_NAMES[piece.color].title()}"
                        f" {piece_name(piece.piece_type)} {square_name(square)}"
                    ),
                    piece  = piece.symbol(),
                    square = square
                )
                for square, piece in sorted(board.piece_map().items())
            ),
            *(cls(index=index, name=name) for index, name, held in rights if held),
            *(
                (
                    cls(
                        index = 772 + square_file(passant),
                        name  = f"En passant, {FILE_NAMES[square_file(passant)]} file"
                    ),
                )
                if passant is not None
                else ()
            ),
            *((cls(index=780, name="White to move"),) if board.turn else ())
        )

    @computed_field
    @property
    def value(self) -> str:
        """
        Writes the number as its sixteen hexadecimal digits.
        """
        return f"{POLYGLOT_RANDOM_ARRAY[self.index]:016x}"


class Turn(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The numbers one move takes out of the key and puts in, or every number
    of the first position's key, which no move reached.
    """

    joins: tuple[Term, ...]
    """
    The numbers the key gains.
    """

    leaves: tuple[Term, ...]
    """
    The numbers the key loses.
    """

    @classmethod
    def between(cls, after: tuple[Term, ...], before: tuple[Term, ...]) -> Self:
        """
        Reads the numbers `after` holds and `before` does not as joining,
        and those `before` holds and `after` does not as leaving.
        """
        return cls(
            joins  = tuple(term for term in after if term not in before),
            leaves = tuple(term for term in before if term not in after)
        )


class Hashing(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    A line keyed a move at a time, beside the positions showing when the key
    reads the en passant file.
    """

    passants: ClassVar[tuple[str, ...]] = (
        "r5k1/8/8/3pP3/8/8/8/4K3 w - d6 0 2", "4r1k1/8/8/3pP3/8/8/8/4K3 w - d6 0 2"
    )
    """
    A White pawn on e5 beside the Black pawn just advanced to d5, free to
    capture, then pinned against its king by a rook on the e file.
    """

    line: tuple[Turn, ...]
    """
    The numbers each position of the line combines as its predecessor's
    turned, every number of its first position's key first.
    """

    passant: tuple[Passant, ...]
    """
    The positions `passants` sets up.
    """

    @classmethod
    def from_game(cls, game: Game) -> Self:
        """
        Reads the numbers each position of the mainline of `game` combines.
        """
        combined = [Term.combined(board) for board in game.boards()]

        return cls(
            line = tuple(
                Turn.between(after, before)
                for before, after in pairwise(((), *combined))
            ),
            passant = tuple(map(Passant.from_fen, cls.passants))
        )
