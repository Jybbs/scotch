"""
Pins what the `readers` extension module reads and keys against what
python-chess reads and keys, the store's own reader before the crate:

- The moves, the tags, and the keys of any legal game python-chess plays
  and exports, read back through `read` and keyed again through `keys`
- The keys of each known-answer game, which the site's suite pins against
  the same games through the WebAssembly build of the crate
- Each quirk of python-chess's reader on malformed text, read as python-chess
  reads it under a visitor skipping every variation
- The positions `keys` reads no key for, and the move it stops at
"""

from chess             import Board
from chess.pgn         import Game as PgnGame, GameBuilder, SKIP, SkipType, read_game
from chess.polyglot    import zobrist_hash
from common.strategies import played
from functools         import partial
from hypothesis        import given
from io                import StringIO
from pathlib           import Path
from pytest            import mark, param

from scotch.games.readers import keys, read


class Mainline(GameBuilder):
    """
    Builds a game from its mainline alone through python-chess's reader,
    skipping every variation and keeping each error unlogged, the visitor
    the store read its games through before the crate.
    """

    def begin_variation(self) -> SkipType:
        """
        Skips the variation opening here.
        """
        return SKIP

    def end_variation(self):
        """
        Leaves the game as it stands, since the builder entered no
        variation.
        """

    def handle_error(self, error: Exception):
        """
        Appends `error` to the errors of the game being built.
        """
        self.game.errors.append(error)


def hashed(game: PgnGame) -> list[int]:
    """
    Keys each position of the mainline of `game` through python-chess's
    `zobrist_hash`, from the one it starts at to the one after its last
    move, or none where its tags set up no position.
    """
    try:
        return [zobrist_hash(node.board()) for node in (game, *game.mainline())]
    except ValueError:
        return []


@given(board=played())
def test_any_legal_game_reads_and_keys_as_python_chess_reads_and_keys_it(board: Board):
    """
    Asserts that any legal game python-chess exports reads back through
    the crate with python-chess's tags, its moves in UCI, its keys, and no
    error, and that `keys` keys its moves alike.
    """
    exported = PgnGame.from_board(board)
    [(tags, moves, keyed, errors)] = read(str(exported))
    uci = [move.uci() for move in board.move_stack]

    assert (tags, moves, errors) == (list(exported.headers.items()), uci, [])
    assert keyed == keys(uci) == hashed(exported)


@mark.parametrize("name", ["demo", "stored", "viewer"])
def test_each_known_answer_game_keys_as_python_chess_keys_it(known: Path, name: str):
    """
    Asserts that each game of a known-answer file takes, position by
    position, the key python-chess's `zobrist_hash` gives the board its own
    reader reaches.
    """
    text   = (known / f"{name}.pgn").read_text(encoding="utf-8")
    handle = StringIO(text)

    for _, _, keyed, _ in read(text):
        assert keyed == hashed(read_game(handle))


@mark.parametrize(
    ("moves", "setup", "length"),
    [
        param(["e2e4", "e7e5"], {}, 3, id="standard"),
        param(["e2e4", "e1e2", "e7e5"], {}, 2, id="stops-at-an-illegal-move"),
        param(["0000", "e7e5"], {}, 3, id="null-move"),
        param(["e1g1"], {"fen": "4k3/8/8/8/8/8/8/4K2R w K - 0 1"}, 2, id="castle"),
        param(
            ["e1h1"],
            {"fen": "4k3/8/8/8/8/8/8/4K2R w K - 0 1", "variant": "Chess960"},
            2,
            id = "chess960"
        ),
        param(["e2e4"], {"fen": "garbage"}, 0, id="unreadable-fen"),
        param(["e2e4"], {"variant": "Atomic"}, 0, id="own-rules"),
        param(["e2e4"], {"variant": "Bughouse"}, 0, id="unknown-variant")
    ]
)
def test_keys_reads_a_key_for_each_position_it_can_reach(
    length : int,
    moves  : list[str],
    setup  : dict[str, str]
):
    """
    Asserts that `keys` keys the position its tags set up and each one its
    moves reach, stopping at the first move illegal where it is played, and
    keys nothing where the tags set up no position or name a variant other
    than standard chess and Chess960.
    """
    assert len(keys(moves, **setup)) == length


@mark.parametrize(
    "text",
    [
        param('[Event "A"]\n1. e4 e5 1-0\n[Event "B"]\n1. d4 *\n', id="joined-games"),
        param("-----\n\n1. e4 *\n", id="row-of-dashes"),
        param('[Event "A"]\n\n\n1. e4 *\n', id="two-blank-lines-after-the-tags"),
        param("1. e4 Qh5 ) e5 *\n", id="stray-close-resumes-the-mainline"),
        param("( 1. e4 ) e5 *\n", id="open-before-any-move"),
        param("1. e4 {a\n\nb} e5 *\n", id="comment-across-a-blank-line"),
        param(
            '[FEN "garbage"]\n\n1. e4 {a\n\nb} e5\n\n1. d4 *\n',
            id = "unreadable-fen-skips-a-comment"
        ),
        param('[Event "A"]\r\r1. e4 e5\r\r1. d4 *\r', id="carriage-returns"),
        param(
            '1. e4 *\n\n\ufeff[Event "B"]\n\n1. d4 *\n',
            id = "byte-order-mark-on-a-later-game"
        ),
        param(
            '[FEN "8/P7/8/8/8/8/8/k6K w - - 0 1"]\n\n1. a8q *\n',
            id = "lowercase-promotion"
        ),
        param(
            '[FEN "8/P7/8/8/8/8/8/k6K w - - 0 1"]\n\n1. a8=n *\n',
            id = "underpromotion"
        ),
        param("1. e2e4 e7-e5 2. Ng1f3 *\n", id="long-algebraic"),
        param("1. e4 d5 2. d5 *\n", id="pawn-push-naming-a-capture"),
        param(
            '[FEN "8/P7/8/8/8/8/8/k6K w - - 0 1"]\n\n1. a7a8 *\n',
            id = "missing-promotion-piece"
        ),
        param(
            '[FEN "4k3/8/8/8/8/8/8/4K2R w K - 0 1"]\n\n1. e1h1 *\n',
            id = "king-takes-its-rook"
        ),
        param(
            '[FEN "4k3/8/8/8/8/2N3N1/8/4K3 w - - 0 1"]\n\n1. Ne4 *\n',
            id = "ambiguous-knight"
        ),
        param(
            '[Variant "Chess960"]\n'
            '[FEN "4k3/8/8/8/8/8/8/R4K1R w KQ - 0 1"]\n\n1. O-O *\n',
            id = "chess960-castle"
        )
    ]
)
def test_each_quirk_of_the_reader_reads_as_python_chess_reads_it(text: str):
    """
    Asserts that malformed or unusual text reads through the crate into the
    games python-chess's reader reads from it under a visitor skipping every
    variation, each with the same tags, moves in UCI, keys, and errors, so
    games joined with no blank line, stray parentheses, comments spanning a
    blank line, and every spelling of a move python-chess accepts split and
    read alike.
    """
    handle = StringIO(text, newline=None)

    assert list(map(list, read(text))) == [
        [
            list(game.headers.items()),
            [move.uci() for move in game.mainline_moves()],
            hashed(game),
            list(map(str, game.errors))
        ]
        for game in iter(partial(read_game, handle, Visitor=Mainline), None)
    ]
