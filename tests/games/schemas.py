"""
Pins what `Game` reads out of a PGN file through python-chess's reader,
meaning each game's tags, the moves of its mainline, the errors the reader
recorded, and the problems those errors and a `Variant` tag add up to.
"""

from chess                 import Board, Move
from chess.pgn             import Game as PgnGame
from hypothesis            import given
from hypothesis.strategies import DrawFn, composite, integers, sampled_from
from pathlib               import Path
from pytest                import TempPathFactory, mark

from scotch.games.schemas import Game


def moves(*uci: str) -> tuple[Move, ...]:
    """
    Builds the moves `uci` names in Universal Chess Interface notation.
    """
    return tuple(map(Move.from_uci, uci))


def read(directory: Path, text: str, encoding: str = "utf-8") -> list[Game]:
    """
    Writes `text` in `encoding` to a PGN file in `directory` and reads back
    every game it holds.
    """
    path = directory / "games.pgn"
    path.write_text(text, encoding=encoding)

    return list(Game.read(path))


@composite
def played(draw: DrawFn) -> PgnGame:
    """
    Draws a game python-chess builds from up to sixty legal moves played
    from the starting position, stopping early where a move ends the game.
    """
    board = Board()

    for _ in range(draw(integers(0, 60))):
        if legal := list(board.legal_moves):
            board.push(draw(sampled_from(legal)))

    return PgnGame.from_board(board)


@given(game=played())
def test_a_game_python_chess_writes_reads_back_whole(
    game             : PgnGame,
    tmp_path_factory : TempPathFactory
):
    """
    Asserts that any legal game python-chess exports reads back with the
    same tags and the same moves and with no error.
    """
    [read_back] = read(tmp_path_factory.getbasetemp(), str(game))

    assert read_back.errors == ()
    assert read_back.moves == tuple(game.mainline_moves())
    assert read_back.tags == dict(game.headers)


def test_a_byte_order_mark_leaves_the_first_tag_readable(tmp_path: Path):
    """
    Asserts that a file opening on a UTF-8 byte order mark still reads its
    first tag, since python-chess's reader skips the mark.
    """
    [game] = read(tmp_path, '[Event "Marked"]\n\n1. e4 *\n', encoding="utf-8-sig")

    assert game.tags["Event"] == "Marked"


def test_a_byte_utf8_cannot_decode_reads_as_the_replacement_character(tmp_path: Path):
    """
    Asserts that a tag holding a byte another code page wrote, such as
    `0x82` for `é` in code page 437, reads as U+FFFD while every move still
    reads.
    """
    [game] = read(tmp_path, '[Black "André"]\n\n1. e4 e5 *\n', encoding="cp437")

    assert game.tags["Black"] == "Andr\N{REPLACEMENT CHARACTER}"
    assert game.moves == moves("e2e4", "e7e5")


def test_a_fen_tag_sets_the_position_the_moves_are_read_from(tmp_path: Path):
    """
    Asserts that a game whose `FEN` tag sets a position reads its moves from
    that position, so a castle legal only there reads with no error.
    """
    [game] = read(
        directory = tmp_path,
        text      = '[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/8/4K2R w K - 0 1"]\n\n1. O-O *\n'
    )

    assert game.errors == ()
    assert game.moves == moves("e1g1")


def test_a_fen_tag_the_reader_cannot_read_leaves_no_move(tmp_path: Path):
    """
    Asserts that a `FEN` tag naming no position python-chess can set up
    records an error naming the tag's value and keeps no move, since the
    reader skips the movetext of a game it has no position for.
    """
    [game]  = read(tmp_path, '[FEN "garbage"]\n\n1. e4 *\n')
    [error] = game.errors

    assert "garbage" in error
    assert game.moves == ()


def test_an_empty_file_holds_no_game(tmp_path: Path):
    """
    Asserts that a file holding no text yields no game.
    """
    assert read(tmp_path, "") == []


def test_an_illegal_move_ends_the_mainline_and_records_an_error(tmp_path: Path):
    """
    Asserts that a move illegal in the position it was played from ends the
    mainline before it and leaves the error the reader recorded naming it.
    """
    [game] = read(tmp_path, "1. e4 e5 2. Qxf7 Nc6 *\n")

    assert game.moves == moves("e2e4", "e7e5")
    assert game.problems == game.errors
    [error] = game.errors

    assert error.startswith("illegal san: 'Qxf7'")


def test_every_game_reads_in_file_order(tmp_path: Path):
    """
    Asserts that a file holding two games yields both, in the order the file
    holds them, each with its own tags and moves.
    """
    games = read(
        directory = tmp_path,
        text      = '[Event "First"]\n\n1. e4 e5 *\n\n[Event "Second"]\n\n1. d4 *\n'
    )

    assert [game.tags["Event"] for game in games] == ["First", "Second"]
    assert [game.moves for game in games] == [moves("e2e4", "e7e5"), moves("d2d4")]


@mark.parametrize(
    ("variant", "errors", "problems"),
    [
        ("Standard", (), ()),
        ("standard", (), ()),
        ("From Position", (), ()),
        ("Atomic", (), ("unsupported variant: Atomic",)),
        ("Chess960", (), ("unsupported variant: Chess960",)),
        (
            "Bughouse",
            ("unsupported variant: Bughouse",),
            ("unsupported variant: Bughouse",)
        ),
        ("", ("unsupported variant: ",), ("unsupported variant: ",))
    ],
    ids = [
        "standard", "lowercase", "from-position", "atomic",
        "chess960", "bughouse", "empty"
    ]
)
def test_a_variant_tag_naming_anything_but_standard_chess_is_a_problem(
    errors   : tuple[str, ...],
    problems : tuple[str, ...],
    tmp_path : Path,
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
    [game] = read(tmp_path, f'[Variant "{variant}"]\n\n1. e4 *\n')

    assert game.errors == errors
    assert game.problems == problems


def test_no_variant_tag_adds_no_problem(tmp_path: Path):
    """
    Asserts that a game carrying no `Variant` tag reads as standard chess.
    """
    [game] = read(tmp_path, "1. e4 *\n")

    assert game.problems == ()


def test_tags_fill_the_seven_tag_roster(tmp_path: Path):
    """
    Asserts that a game carrying no tag reads with each tag of the Seven Tag
    Roster set to the placeholder python-chess fills it with.
    """
    [game] = read(tmp_path, "1. e4 *\n")

    assert game.tags == {
        "Black"  : "?",
        "Date"   : "????.??.??",
        "Event"  : "?",
        "Result" : "*",
        "Round"  : "?",
        "Site"   : "?",
        "White"  : "?"
    }


def test_text_holding_no_movetext_reads_as_one_game_without_moves(tmp_path: Path):
    """
    Asserts that a file holding text python-chess finds neither a tag nor
    a move in reads as one game with no move and no error, since the reader
    skips every token it cannot parse.
    """
    [game] = read(tmp_path, "hello world\n")

    assert game.moves == ()
    assert game.problems == ()


def test_the_variant_problem_follows_the_errors_the_reader_recorded(tmp_path: Path):
    """
    Asserts that a game whose reader recorded an error and whose `Variant`
    tag names a variant lists the reader's error first and the variant's
    message last.
    """
    [game]  = read(tmp_path, '[Variant "Atomic"]\n\n1. e4 e5 2. Qxf7 *\n')
    [error] = game.errors

    assert error.startswith("illegal san: 'Qxf7'")
    assert game.problems == (error, "unsupported variant: Atomic")


def test_variations_stay_out_of_the_moves(tmp_path: Path):
    """
    Asserts that the moves hold the mainline alone, leaving out a variation
    the file records beside it.
    """
    [game] = read(tmp_path, "1. e4 (1. d4 d5) 1... e5 *\n")

    assert game.moves == moves("e2e4", "e7e5")
