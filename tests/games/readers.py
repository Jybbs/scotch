"""
Pins what the `readers` extension module reads and keys against what
python-chess reads and keys, the store's own reader before the crate:

- The moves, the tags, and the keys of any legal game python-chess plays
  and exports, read back through `read` and keyed again through `keys`
- The keys of each known-answer game, which the site's suite pins against
  the same games through the WebAssembly build of the crate
- Each quirk of python-chess's reader on malformed text, read as python-chess
  reads it under a visitor skipping every variation
- Where one game opens for each set of tags as python-chess's reader does
  not, and whether a text holds more past its first game
- The positions `keys` reads no key for, and the move it stops at
- The names `STANDARD` reads as standard chess, python-chess's own aliases
- The moves `scored` writes in SAN and the placements beside them, against
  python-chess's `Board.san` and `Board.board_fen`
- The key of a position whose en passant capture no legal move plays, which
  leaves out what `zobrist_hash` reads, so two positions FIDE's Laws of Chess
  count as the same share a key
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

from scotch.games.readers import STANDARD, keys, read, scored, trails


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
    move, clearing an en passant square no legal capture reaches first, or
    none where its tags set up no position.
    """
    try:
        return [legally(node.board()) for node in (game, *game.mainline())]
    except ValueError:
        return []


def legally(board: Board) -> int:
    """
    Keys `board` through `zobrist_hash` with its en passant square cleared
    where no legal capture reaches it.
    """
    board = board.copy(stack=False)

    if not board.has_legal_en_passant():
        board.ep_square = None

    return zobrist_hash(board)


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


def test_an_en_passant_capture_no_legal_move_plays_leaves_the_key_as_without_it():
    """
    Asserts that a position whose pawn stands pinned along its rank beside
    the pawn that just advanced takes the key of the same position with
    no en passant square, which FIDE's Laws of Chess count as the same
    position, although `zobrist_hash` reads the file there, and that a
    capture a legal move plays takes a key of its own.
    """
    pinned, passed = (
        "8/8/8/K3Pp1r/8/8/8/4k3 w - f6 0 1", "8/8/8/K3Pp1r/8/8/8/4k3 w - - 0 1"
    )
    legal, closed = (
        "4k3/8/8/4Pp2/8/8/8/4K3 w - f6 0 1", "4k3/8/8/4Pp2/8/8/8/4K3 w - - 0 1"
    )

    assert keys([], fen=pinned) == keys([], fen=passed)
    assert zobrist_hash(Board(pinned)) != zobrist_hash(Board(passed))
    assert keys([], fen=legal) == [zobrist_hash(Board(legal))]
    assert keys([], fen=legal) != keys([], fen=closed)


@given(board=played())
def test_scored_writes_each_move_and_placement_as_python_chess_writes_it(board: Board):
    """
    Asserts that `scored` writes each move of any legal game in SAN and the
    placement of each position it reaches as python-chess's `Board.san` and
    `Board.board_fen` write them.
    """
    mainline   = list(PgnGame.from_board(board).mainline())
    sans       = [node.san() for node in mainline]
    placements = [Board().board_fen(), *(node.board().board_fen() for node in mainline)]

    assert scored([move.uci() for move in board.move_stack]) == (sans, placements)


@mark.parametrize(
    ("moves", "setup", "expected"),
    [
        param(
            ["0000", "e7e5"],
            {},
            (
                ["--", "e5"],
                [
                    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
                    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
                    "rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR"
                ]
            ),
            id = "null-move"
        ),
        param(
            ["e1g1", "e8e6"],
            {"fen": "4k3/8/8/8/8/8/8/4K2R w K - 0 1"},
            (["O-O"], ["4k3/8/8/8/8/8/8/4K2R", "4k3/8/8/8/8/8/8/5RK1"]),
            id = "stops-at-an-illegal-move"
        ),
        param(["e2e4"], {"variant": "Atomic"}, ([], []), id="own-rules")
    ]
)
def test_scored_writes_a_null_move_and_stops_where_keys_stops(
    expected : tuple[list[str], list[str]],
    moves    : list[str],
    setup    : dict[str, str]
):
    """
    Asserts that `scored` writes a null move as python-chess's `Board.san`
    writes one, stops at the first move illegal where it is played, and
    writes nothing where the tags set up no position it reads.
    """
    assert scored(moves, **setup) == expected


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


def test_the_standard_names_are_the_aliases_python_chess_gives_standard_chess():
    """
    Asserts that `STANDARD`, the names the site reads a `Variant` tag
    against before matching, are the aliases python-chess's `Board` gives
    standard chess, which `Game.problems` reads.
    """
    assert list(STANDARD) == Board.aliases


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
        param(["e2e4"], {"variant": "Wild/5"}, 2, id="read-as-standard-chess"),
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
    moves reach, stopping at the first move illegal where it is played,
    and keys nothing where the tags set up no position or name a variant
    python-chess reads under rules of its own.
    """
    assert len(keys(moves, **setup)) == length


@mark.parametrize(
    "text",
    [
        param("1. e4 hello e5 Qh9 *\n", id="words-naming-no-move"),
        param("[hello\n1. e4 *\n", id="line-holding-no-tag-pair"),
        param("1. e4 Qh5 ) e5 *\n", id="stray-close-resumes-the-mainline"),
        param("( 1. e4 ) e5 *\n", id="open-before-any-move"),
        param("1. e4 {a\n\nb} e5 *\n", id="comment-across-a-blank-line"),
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


@mark.parametrize(
    ("text", "read_as"),
    [
        param(
            '[Event "A"]\n1. e4 e5 1-0\n[Event "B"]\n1. d4 *\n',
            [("A", ["e2e4", "e7e5"], []), ("B", ["d2d4"], [])],
            id = "result-ends-the-moves-before-the-next-tags"
        ),
        param(
            '[Event "A"]\n\n\n1. e4 *\n',
            [("A", ["e2e4"], [])],
            id = "blank-lines-after-the-tags-leave-the-game-whole"
        ),
        param(
            '[Event "A"]\r\r1. e4 e5\r\r1. d4 *\r',
            [("A", ["e2e4", "e7e5"], [])],
            id = "moves-past-a-blank-line-hold-no-tags"
        ),
        param(
            "-----\n\n1. e4 *\n",
            [("?", ["0000", "0000"], [])],
            id = "moves-after-a-first-tagless-game-hold-no-tags"
        ),
        param(
            '[FEN "garbage"]\n\n1. e4 {a\n\nb} e5\n\n1. d4 *\n',
            [("?", [], ["expected 8 rows in position part of fen: 'garbage'"])],
            id = "unreadable-fen-leaves-the-rest-tagless"
        )
    ]
)
def test_each_set_of_tags_opens_one_game_where_python_chess_reads_otherwise(
    read_as : list[tuple[str, list[str], list[str]]],
    text    : str
):
    """
    Asserts that the crate reads one game for each set of tags where
    python-chess's reader reads the text otherwise, so a game's moves end
    at its result, blank lines after its tags leave it whole, and text past
    the first game holding no tag pair yields no game, each game read as its
    `Event` tag, its moves in UCI, and its errors.
    """
    assert [
        (dict(tags).get("Event"), moves, errors) for tags, moves, _, errors in read(
            text
        )
    ] == read_as


@mark.parametrize(
    ("text", "trailing"),
    [
        param("1. e4 *\n\n\n", False, id="blank-lines"),
        param("1. e4\n\ne5\n", True, id="tagless-moves"),
        param('1. e4 *\n\n[Event "B"]\n1. d4 *\n', True, id="another-game"),
        param("", False, id="no-game")
    ]
)
def test_trails_reads_whether_more_than_blank_lines_follow_the_first_game(
    text     : str,
    trailing : bool
):
    """
    Asserts that `trails` reads a text as holding more past its first game
    where another game or tagless text follows it, and not where only blank
    lines or no game at all follow.
    """
    assert trails(text) is trailing
