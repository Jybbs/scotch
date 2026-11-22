"""
Pins the `Hashing` the Position Keys page draws: the numbers of Polyglot's
table each move of a line turns in its key, and the `Passant` positions
whose en passant file the key reads or leaves out.
"""

from chess        import Board
from common.games import line
from functools    import reduce
from operator     import xor
from pytest       import mark

from scotch.docs.hashing import Hashing, Passant, Term, Turn


def keyed(terms: tuple[Term, ...]) -> int:
    """
    Combines the numbers `terms` holds into one key.
    """
    return reduce(xor, (int(term.value, 16) for term in terms), 0)


def test_a_passant_keys_the_position_with_its_square_and_without():
    """
    Asserts that each position `Hashing` sets up takes two keys where its
    capture is legal and one where it is not, as the page says.
    """
    free, pinned = map(Passant.from_fen, Hashing.passants)

    assert (free.legal, free.counted != free.cleared) == (True, True)
    assert (pinned.legal, pinned.counted == pinned.cleared) == (False, True)


def test_a_pawn_move_turns_its_squares_and_the_side_to_move():
    """
    Asserts that 1. e4 takes the pawn off e2 and White to move out of the
    key and puts the pawn on e4 in, its numbers placed by Polyglot's own
    formula of 64 times the piece's kind and color, plus the square.
    """
    [_, turn] = Hashing.from_game(line("e4")).line

    assert [term.name for term in turn.leaves] == ["White pawn e2", "White to move"]
    assert [(
        term.name, term.index, term.piece, term.square
    ) for term in turn.joins] == [("White pawn e4", 64 + 28, "P", 28)]


def test_a_turn_reads_what_one_position_holds_and_the_other_does_not():
    """
    Asserts that `Turn.between` lists the numbers only the later position
    holds as joining and those only the earlier holds as leaving, in their
    own order, and leaves out the numbers both hold.
    """
    a, b, c = (Term(index=index, name=str(index)) for index in (1, 2, 3))

    assert Turn.between((a, b), (b, c)) == Turn(joins=(c,), leaves=(a,))


@mark.parametrize(
    ("fen", "file"),
    [
        ("r5k1/8/8/3pP3/8/8/8/4K3 w - d6 0 2", ["En passant, d file"]),
        ("4r1k1/8/8/3pP3/8/8/8/4K3 w - d6 0 2", [])
    ],
    ids = ["free", "pinned"]
)
def test_the_key_counts_the_en_passant_file_only_where_the_capture_is_legal(
    fen  : str,
    file : list[str]
):
    """
    Asserts that the en passant file joins the key where the pawn beside it
    may capture, and stays out where its king's pin forbids the capture.
    """
    names = [term.name for term in Term.combined(Board(fen))]

    assert [name for name in names if name.startswith("En passant")] == file


def test_each_move_turns_the_numbers_that_carry_the_key_to_the_next_ones():
    """
    Asserts that turning every number a move joins or leaves in the key
    before it gives the key the index stores, at every ply of a line where
    castling rights leave and a capture takes a piece off.
    """
    game = line("e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "Ke2")
    key  = 0

    for turn, stored in zip(Hashing.from_game(game).line, game.keys, strict=True):
        key = keyed(turn.joins) ^ keyed(turn.leaves) ^ key
        assert key == stored


def test_the_first_position_combines_a_number_for_each_piece_right_and_white_to_move():
    """
    Asserts that the starting position's key combines 37 numbers, its 32
    pieces, a1 first, then the four castling rights and White to move, and
    that nothing leaves it.
    """
    [first, *_] = Hashing.from_game(line("e4")).line

    assert (len(first.joins), first.leaves) == (37, ())
    assert [term.name for term in first.joins[:2]] == [
        "White rook a1", "White knight b1"
    ]
    assert [term.name for term in first.joins[32:]] == [
        "White castling short", "White castling long", "Black castling short",
        "Black castling long", "White to move"
    ]
