"""
Pins what `Game` reads out of a PGN file through python-chess's reader,
meaning each game's tags, the moves of its mainline, the errors the reader
recorded without logging them, and the problems those errors and a `Variant`
tag add up to, along with the keys, placements, and SAN moves each position
of the mainline yields.
"""

from chess             import Board, Move
from chess.pgn         import Game as PgnGame
from collections.abc   import Callable
from common.games      import line
from common.strategies import games, played
from hypothesis        import given
from pydantic          import ValidationError
from pytest            import LogCaptureFixture, mark, param, raises

from scotch.games.schemas import Game


def moves(*uci: str) -> tuple[Move, ...]:
    """
    Builds the moves `uci` names in Universal Chess Interface notation.
    """
    return tuple(map(Move.from_uci, uci))


@given(board=played())
def test_a_game_python_chess_writes_reads_back_whole(
    board : Board,
    read  : Callable[..., list[Game]]
):
    """
    Asserts that any legal game python-chess exports reads back with the
    same tags and the same moves and with no error.
    """
    game        = PgnGame.from_board(board)
    [read_back] = read(str(game))

    assert read_back.errors == ()
    assert read_back.moves == tuple(game.mainline_moves())
    assert read_back.tags == dict(game.headers)


def test_a_byte_order_mark_leaves_the_first_tag_readable(
    read: Callable[..., list[Game]]
):
    """
    Asserts that a file opening on a UTF-8 byte order mark still reads its
    first tag, since python-chess's reader skips the mark.
    """
    [game] = read('[Event "Marked"]\n\n1. e4 *\n', encoding="utf-8-sig")

    assert game.tags["Event"] == "Marked"


def test_a_byte_utf8_cannot_decode_reads_as_the_replacement_character(
    read: Callable[..., list[Game]]
):
    """
    Asserts that a tag holding a byte another code page wrote, such as
    `0x82` for `é` in code page 437, reads as U+FFFD while every move still
    reads.
    """
    [game] = read('[Black "André"]\n\n1. e4 e5 *\n', encoding="cp437")

    assert game.tags["Black"] == "Andr\N{REPLACEMENT CHARACTER}"
    assert game.moves == moves("e2e4", "e7e5")


def test_a_fen_tag_sets_the_first_position():
    """
    Asserts that a game whose `FEN` tag sets up a position yields that
    position's placement first and reads its first move against it.
    """
    game = line("O-O", FEN="4k3/8/8/8/8/8/8/4K2R w K - 0 1")

    assert game.placements == ("4k3/8/8/8/8/8/8/4K2R", "4k3/8/8/8/8/8/8/5RK1")
    assert game.sans == ("O-O",)


def test_a_fen_tag_sets_the_position_the_moves_are_read_from(
    read: Callable[..., list[Game]]
):
    """
    Asserts that a game whose `FEN` tag sets a position reads its moves from
    that position, so a castle legal only there reads with no error.
    """
    [game] = read('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/8/4K2R w K - 0 1"]\n\n1. O-O *\n')

    assert game.errors == ()
    assert game.moves == moves("e1g1")


def test_a_fen_tag_the_reader_cannot_read_leaves_no_move(
    read: Callable[..., list[Game]]
):
    """
    Asserts that a `FEN` tag naming no position python-chess can set up
    records an error naming the tag's value and keeps no move, since the
    reader skips the movetext of a game it has no position for.
    """
    [game]  = read('[FEN "garbage"]\n\n1. e4 *\n')
    [error] = game.errors

    assert "garbage" in error
    assert game.moves == ()


def test_a_game_refuses_a_field_it_does_not_declare():
    """
    Asserts that building a game with a keyword its record does not declare
    raises `ValidationError`, so a misspelled field never reads as unset.
    """
    with raises(ValidationError):
        Game(
            errors  = (),
            moves   = (),
            tags    = {},
            unknown = 1
        )


def test_a_game_refuses_a_new_value_for_a_field(read: Callable[..., list[Game]]):
    """
    Asserts that a game read from a file is frozen, so assigning its moves
    raises `ValidationError` rather than replacing them.
    """
    [game] = read("1. e4 *\n")

    with raises(ValidationError):
        game.moves = ()


def test_a_move_from_a_fen_position_reads_behind_the_fen_move_number():
    """
    Asserts that a game a `FEN` tag starts numbers its moves from the move
    number that tag carries.
    """
    assert line("Kd7", FEN="4k3/8/8/8/8/8/8/4K3 b - - 0 40").numbered(
        0
    ) == "40...Kd7"


@mark.parametrize(
    ("variant", "errors", "problems"),
    [
        param("Standard", (), (), id="standard"),
        param("standard", (), (), id="lowercase"),
        param("From Position", (), (), id="from-position"),
        param("Atomic", (), ("unsupported variant: Atomic",), id="atomic"),
        param("Chess960", (), ("unsupported variant: Chess960",), id="chess960"),
        param(
            "Bughouse",
            ("unsupported variant: Bughouse",),
            ("unsupported variant: Bughouse",),
            id = "bughouse"
        ),
        param("", ("unsupported variant: ",), ("unsupported variant: ",), id="empty")
    ]
)
def test_a_variant_tag_naming_anything_but_standard_chess_is_a_problem(
    errors   : tuple[str, ...],
    problems : tuple[str, ...],
    read     : Callable[..., list[Game]],
    variant  : str
):
    """
    Asserts what a `Variant` tag adds to the problems:

    - Nothing where it names standard chess under any alias python-chess
      gives it
    - One problem where it names a variant python-chess reads under its own
      rules
    - The error the reader already recorded, once rather than twice, where
      it names a variant python-chess cannot read
    """
    [game] = read(f'[Variant "{variant}"]\n\n1. e4 *\n')

    assert game.errors == errors
    assert game.problems == problems


def test_an_empty_file_holds_no_game(read: Callable[..., list[Game]]):
    """
    Asserts that a file holding no text yields no game.
    """
    assert read("") == []


def test_an_en_passant_capture_that_would_be_illegal_still_changes_the_key():
    """
    Asserts that a position where a pawn stands ready to capture en passant
    but the capture would leave its own king in check carries a key of its
    own, although FIDE's Laws of Chess, Article 9.2.3, count it as the same
    position as the one holding the same pieces with no en passant square.
    """
    pushed = line("c5", FEN="8/2p5/8/KP5r/8/8/8/7k b - - 0 1")
    placed = line(FEN="8/8/8/KPp4r/8/8/8/7k w - - 0 2")

    assert pushed.placements[-1] == placed.placements[-1]
    assert pushed.keys[-1] != placed.keys[-1]


def test_an_illegal_move_ends_the_mainline_and_records_an_error(
    read: Callable[..., list[Game]]
):
    """
    Asserts that a move illegal in the position it was played from ends the
    mainline before it and leaves the error the reader recorded naming it.
    """
    [game] = read("1. e4 e5 2. Qxf7 Nc6 *\n")

    assert game.moves == moves("e2e4", "e7e5")
    assert game.problems == game.errors
    [error] = game.errors

    assert error.startswith("illegal san: 'Qxf7'")


def test_an_illegal_move_is_recorded_without_being_logged(
    caplog : LogCaptureFixture,
    read   : Callable[..., list[Game]]
):
    """
    Asserts that reading a game holding an illegal move records the error on
    the game and writes nothing to any logger, so the error reaches a caller
    through `errors` alone.
    """
    [game] = read("1. e4 e5 2. Qxf7 *\n")

    assert len(game.errors) == 1
    assert caplog.records == []


def test_boards_yields_each_position_on_one_board():
    """
    Asserts that `boards` yields one board per position, pushing each move
    onto the board it yielded last.
    """
    boards = list(line("e4", "e5").boards())

    assert len(boards) == 3
    assert all(board is boards[0] for board in boards)
    assert boards[0].move_stack == list(moves("e2e4", "e7e5"))


def test_every_game_reads_in_file_order(read: Callable[..., list[Game]]):
    """
    Asserts that a file holding two games yields both, in the order the file
    holds them, each with its own tags and moves.
    """
    games = read('[Event "First"]\n\n1. e4 e5 *\n\n[Event "Second"]\n\n1. d4 *\n')

    assert [game.tags["Event"] for game in games] == ["First", "Second"]
    assert [game.moves for game in games] == [moves("e2e4", "e7e5"), moves("d2d4")]


@given(game=games())
def test_every_position_yields_a_key_and_a_placement_and_every_move_a_san(game: Game):
    """
    Asserts that a game carries one key and one placement for each position
    of its mainline, the starting position included, and that its moves
    in SAN replay from the starting position to the moves it holds and the
    placement it ends on.
    """
    replay = Board()

    assert len(game.keys) == len(game.placements) == len(game.moves) + 1
    assert [replay.push_san(san) for san in game.sans] == list(game.moves)
    assert game.placements[-1] == replay.board_fen()


@mark.parametrize(
    ("sans", "key"),
    [
        param("", 0x463B96181691FC9C, id="start"),
        param("e4", 0x823C9B50FD114196, id="e4"),
        param("e4 d5", 0x0756B94461C50FB0, id="d5"),
        param("e4 d5 e5", 0x662FAFB965DB29D4, id="e5"),
        param("e4 d5 e5 f5", 0x22A48B5A8E47FF78, id="f5-en-passant"),
        param("e4 d5 e5 f5 Ke2", 0x652A607CA3F242C1, id="ke2-castling"),
        param("e4 d5 e5 f5 Ke2 Kf7", 0x00FDD303C946BDD9, id="kf7-castling"),
        param("a4 b5 h4 b4 c4", 0x3C8123EA7B067637, id="c4-en-passant"),
        param(
            "a4 b5 h4 b4 c4 bxc3 Ra3",
            0x5C3F9B829B279560,
            id = "ra3-castling"
        )
    ]
)
def test_a_key_is_the_polyglot_hash_the_book_format_lists(key: int, sans: str):
    """
    Asserts that the key of the position each line of moves
    reaches is the one the Polyglot book format lists for it, at
    https://hgm.nubati.net/book_format.html.
    """
    assert line(*sans.split()).keys[-1] == key


def test_no_variant_tag_adds_no_problem(read: Callable[..., list[Game]]):
    """
    Asserts that a game carrying no `Variant` tag reads as standard chess.
    """
    [game] = read("1. e4 *\n")

    assert game.problems == ()


def test_tags_fill_the_seven_tag_roster(read: Callable[..., list[Game]]):
    """
    Asserts that a game carrying no tag reads with each tag of the Seven Tag
    Roster set to the placeholder python-chess fills it with.
    """
    [game] = read("1. e4 *\n")

    assert game.tags == {
        "Black"  : "?",
        "Date"   : "????.??.??",
        "Event"  : "?",
        "Result" : "*",
        "Round"  : "?",
        "Site"   : "?",
        "White"  : "?"
    }


def test_text_holding_no_movetext_reads_as_one_game_without_moves(
    read: Callable[..., list[Game]]
):
    """
    Asserts that a file holding text python-chess finds neither a tag nor
    a move in reads as one game with no move and no error, since the reader
    skips text matching none of the tokens movetext holds.
    """
    [game] = read("hello world\n")

    assert game.moves == ()
    assert game.problems == ()


@mark.parametrize(
    ("ply", "numbered"),
    [
        param(0, "1. e4", id="white"),
        param(1, "1...e5", id="black"),
        param(2, "2. Nf3", id="second-move")
    ]
)
def test_a_move_reads_behind_its_number(numbered: str, ply: int):
    """
    Asserts that the move played from the position at a ply reads in SAN
    behind its move number, with three dots before a move of Black's.
    """
    assert line("e4", "e5", "Nf3").numbered(ply) == numbered


def test_the_variant_problem_follows_the_errors_the_reader_recorded(
    read: Callable[..., list[Game]]
):
    """
    Asserts that a game whose reader recorded an error and whose `Variant`
    tag names a variant lists the reader's error first and the variant's
    message last.
    """
    [game]  = read('[Variant "Atomic"]\n\n1. e4 e5 2. Qxf7 *\n')
    [error] = game.errors

    assert error.startswith("illegal san: 'Qxf7'")
    assert game.problems == (error, "unsupported variant: Atomic")
