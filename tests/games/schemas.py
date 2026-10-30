"""
Pins what `Game` reads out of a PGN file through the `readers` extension
module, which reads as python-chess's reader does, and what it derives
from that:

- The tags, the mainline's moves, the errors the reader recorded without
  logging them, and the problems those errors and a `Variant` tag add up to
- The first game of a file, or the error naming a file with none to read
- The key, placement, and SAN each position yields, each move behind its
  number, and the `Frame` each position is drawn as, every piece under the
  number it keeps from the first
- The players a game names and its Seven Tag Roster
- The hash a game takes from every one of its fields, and the tags it holds
  frozen
"""

from chess             import Board, Move
from chess.pgn         import Game as PgnGame
from chess.variant     import VARIANTS
from collections.abc   import Callable
from common.games      import line
from common.sources    import zipped
from common.strategies import games, played
from hypothesis        import given
from pathlib           import Path
from pydantic          import ValidationError
from pytest            import LogCaptureFixture, mark, param, raises
from zipfile           import Path as ZipPath, ZipFile

from scotch.games.schemas import Frame, Game


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


def test_a_frame_lists_its_pieces_in_the_order_of_their_numbers():
    """
    Asserts that `Frame.drawn` lists the pieces in the order of their
    numbers, which here matches neither the order of their squares nor the
    order `piece_map` lists them in, so a drawing that reads the list in
    order finds each piece at the same index in every frame.
    """
    assert Frame.drawn(
        Board("8/8/8/8/8/8/8/k2Q3K w - - 0 1"),
        {0: 5, 3: 9, 7: 1}
    ).pieces == ((1, 7, "K"), (5, 0, "k"), (9, 3, "Q"))


@mark.parametrize(
    ("sans", "tags", "landed"),
    [
        param((), {}, None, id="start"),
        param(("Nf3",), {}, "N", id="knight"),
        param(
            ("O-O",),
            {"FEN": "4k3/8/8/8/8/8/8/4K2R w K - 0 1", "SetUp": "1"},
            "K",
            id = "castling"
        ),
        param(
            ("b8=Q",),
            {"FEN": "8/1P6/8/8/8/8/8/k6K w - - 0 1", "SetUp": "1"},
            "Q",
            id = "promotion"
        )
    ]
)
def test_a_frame_names_the_piece_its_move_sets_down(
    landed : str | None,
    sans   : tuple[str, ...],
    tags   : dict[str, str]
):
    """
    Asserts that the last frame names the piece the move reaching it sets
    down, the king where the move castles and the new piece where a pawn
    promotes, and none at the position the mainline starts at.
    """
    assert line(*sans, **tags).frames[-1].landed == landed


def test_a_frame_numbers_each_piece_by_the_square_it_starts_on():
    """
    Asserts that the first frame numbers each of the 32 pieces by the square
    it stands on and names no move, and that the next frame carries a moved
    piece's number to its new square beside the move and its SAN.
    """
    first, second = line("e4").frames

    assert first.pieces == tuple(
        (spot, spot, piece.symbol()) for spot, piece in sorted(
            Board().piece_map().items()
        )
    )
    assert (first.move, first.san) == (None, None)
    assert (12, 28, "P") in second.pieces
    assert (second.move, second.san) == ((12, 28), "e4")


def test_a_game_hashes_by_its_fields(read: Callable[..., list[Game]]):
    """
    Asserts that a game hashes, so a set holds two reads of one game once
    and holds apart a game differing from them in one tag alone and one
    differing in its moves alone.
    """
    first, second, retagged, replayed = (
        *read(text)
        for text in (
            '[Event "Hashed"]\n\n1. e4 *\n', '[Event "Hashed"]\n\n1. e4 *\n',
            '[Event "Other"]\n\n1. e4 *\n', '[Event "Hashed"]\n\n1. d4 *\n'
        )
    )

    assert len({first, second}) == 1
    assert len({first, replayed, retagged}) == 3


@mark.parametrize(
    ("variant", "errors", "problems"),
    [
        param(None, (), (), id="no-variant-tag"),
        *(
            param(
                board.aliases[0],
                (),
                (f"unsupported variant: {board.aliases[0]}",),
                id = board.uci_variant
            )
            for board in VARIANTS
            if board is not Board
        ),
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
def test_a_variant_tag_adds_one_problem_for_any_variant_but_standard(
    errors   : tuple[str, ...],
    problems : tuple[str, ...],
    read     : Callable[..., list[Game]],
    variant  : str | None
):
    """
    Asserts that a `Variant` tag adds no problem where the game carries
    no such tag, one problem where it names a variant python-chess reads
    under its own rules, and the error the reader recorded, once rather than
    twice, where it names a variant python-chess cannot read.
    """
    [game] = read(("" if variant is None else f'[Variant "{variant}"]\n\n') + "*\n")

    assert game.errors == errors
    assert game.problems == problems


@mark.parametrize(
    "casing",
    [
        param(str, id="as-declared"),
        param(str.lower, id="lower"),
        param(str.upper, id="upper")
    ]
)
@mark.parametrize("alias", [param(alias, id=alias) for alias in Board.aliases])
def test_a_variant_tag_naming_standard_chess_adds_no_problem(
    alias  : str,
    casing : Callable[[str], str],
    read   : Callable[..., list[Game]]
):
    """
    Asserts that a `Variant` tag naming standard chess under any alias
    python-chess's `Board` declares, in any casing, adds no problem.
    """
    [game] = read(f'[Variant "{casing(alias)}"]\n\n1. e4 *\n')

    assert game.problems == ()


def test_a_game_reads_from_a_member_of_a_zip_archive(tmp_path: Path):
    """
    Asserts that a PGN file read in place from inside a zip archive, as
    `zipfile.Path` opens it, yields every game it holds with no origin set.
    """
    (tmp_path / "games.zip").write_bytes(zipped(("games.pgn", "1. e4 *\n\n1. d4 *\n")))

    with ZipFile(tmp_path / "games.zip") as archive:
        games = list(Game.read(ZipPath(archive, "games.pgn")))

    assert [game.moves for game in games] == [moves("e2e4"), moves("d2d4")]
    assert {game.origin for game in games} == {None}


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


def test_a_game_refuses_a_new_value_for_a_tag(read: Callable[..., list[Game]]):
    """
    Asserts that a game's tags are frozen with it, so assigning a tag raises
    `TypeError` rather than changing the game.
    """
    [game] = read("1. e4 *\n")

    with raises(TypeError):
        game.tags["Event"] = "Changed"


def test_a_game_whose_position_cannot_be_set_up_draws_no_frame():
    """
    Asserts that a game whose `FEN` tag python-chess cannot set up draws no
    frame, as it yields no board.
    """
    game = Game(errors=(), moves=(), tags={"FEN": "not a position", "SetUp": "1"})

    assert game.frames == ()


def test_a_move_from_a_fen_position_reads_behind_the_fen_move_number():
    """
    Asserts that a game a `FEN` tag starts numbers its moves from the move
    number that tag carries.
    """
    assert line("Kd7", FEN="4k3/8/8/8/8/8/8/4K3 b - - 0 40").numbered(
        0
    ) == "40...Kd7"


def test_a_move_illegal_inside_a_variation_leaves_the_mainline_whole(
    read: Callable[..., list[Game]]
):
    """
    Asserts that a move illegal inside a variation leaves every move of the
    mainline after that variation read from the mainline's own position,
    with no error recorded, since the reader reads no move a variation
    holds.
    """
    [game] = read("1. e4 (1. d4 Qxf7) 1... e5 2. Qh5 Nc6 *\n")

    assert game.errors == ()
    assert game.moves == moves("e2e4", "e7e5", "d1h5", "b8c6")


@mark.parametrize(
    ("text", "problem"),
    [
        param("", "Found no game in .*games.pgn$", id="empty"),
        param(
            "1. e4 e5 2. Qxh7 *\n",
            "Found problems in the game in .*games.pgn:\nillegal san",
            id = "illegal"
        )
    ]
)
def test_first_raises_naming_a_file_whose_first_game_cannot_be_read(
    pgn     : Callable[..., Path],
    problem : str,
    text    : str
):
    """
    Asserts that reading the first game of a file holding none, or of
    one whose first game carries a move python-chess cannot read, raises
    `ValueError` naming the file and each problem.
    """
    with raises(ValueError, match=problem):
        Game.first(pgn(text))


def test_a_null_move_leaves_every_piece_under_its_number():
    """
    Asserts that a null move draws the frame before it again, every piece on
    its square under its number, with no move landing anywhere.
    """
    before, after = line("e4", "--").frames[1:]

    assert after.pieces == before.pieces
    assert (after.move, after.san, after.landed) == (None, "--", None)


def test_a_variant_read_under_rules_of_its_own_leaves_its_moves_unread(
    read: Callable[..., list[Game]]
):
    """
    Asserts that a game whose `Variant` tag names a variant python-chess
    reads under rules of its own, such as Atomic, holds no move, no key, and
    no error, leaving the variant's message its one problem.
    """
    [game] = read('[Variant "Atomic"]\n\n1. e4 e5 2. Qxf7 *\n')

    assert (game.moves, game.keys, game.errors) == ((), (), ())
    assert game.problems == ("unsupported variant: Atomic",)


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


def test_an_empty_file_holds_no_game(read: Callable[..., list[Game]]):
    """
    Asserts that a file holding no text yields no game.
    """
    assert read("") == []


def test_an_en_passant_capture_that_would_be_illegal_still_changes_the_key():
    """
    Asserts that a position whose en passant capture would leave its own
    king in check carries a key of its own, although FIDE's Laws of Chess,
    Article 9.2.3, count it as the same position as the one with no en
    passant square.
    """
    pushed = line("c5", FEN="8/2p5/8/KP5r/8/8/8/7k b - - 0 1")
    placed = line(FEN="8/8/8/KPp4r/8/8/8/7k w - - 0 2")

    assert pushed.placements[-1] == placed.placements[-1]
    assert pushed.keys[-1] != placed.keys[-1]


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
    the game and writes nothing to any logger.
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


def test_first_reads_the_first_game_a_file_holds(pgn: Callable[..., Path]):
    """
    Asserts that the first game of a file holding two is the one it opens
    on.
    """
    assert Game.first(pgn("1. e4 *\n\n1. d4 *\n")).moves == moves("e2e4")


def test_follow_leaves_no_number_on_the_square_of_a_pawn_taken_en_passant():
    """
    Asserts that the numbers `Game.follow` carries past an en passant
    capture sit on exactly the squares the board then holds a piece on, the
    taken pawn's square dropped beside the square its taker left.
    """
    board   = Board("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1")
    move    = Move.from_uci("e5d6")
    numbers = Game.follow(board, move, {spot: spot for spot in board.piece_map()})
    board.push(move)

    assert numbers.keys() == board.piece_map().keys()


@mark.parametrize(
    ("sans", "tags", "kept"),
    [
        param(("e4", "d5", "exd5"), {}, {(12, 35, "P")}, id="capture"),
        param(("e4", "a6", "e5", "d5", "exd6"), {}, {(12, 43, "P")}, id="en-passant"),
        param(
            ("e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O"),
            {},
            {(4, 6, "K"), (7, 5, "R")},
            id = "white-castles-kingside"
        ),
        param(
            ("d4", "d5", "Nc3", "Nc6", "Bf4", "Bf5", "Qd2", "Qd7", "e3", "O-O-O"),
            {},
            {(56, 59, "r"), (60, 58, "k")},
            id = "black-castles-queenside"
        ),
        param(
            ("b8=Q",),
            {"FEN": "8/1P6/8/8/8/8/8/k6K w - - 0 1", "SetUp": "1"},
            {(49, 57, "Q")},
            id = "promotion"
        )
    ]
)
def test_a_piece_keeps_its_number_through_each_kind_of_move(
    kept : set[tuple[int, int, str]],
    sans : tuple[str, ...],
    tags : dict[str, str]
):
    """
    Asserts that the last frame carries each moved piece under the number it
    started with, a castling rook's beside its king's and a promoted pawn's
    under its new symbol.
    """
    assert kept <= set(line(*sans, **tags).frames[-1].pieces)


def test_players_name_white_then_black():
    """
    Asserts that a game names its players as the `White` tag, then `vs.`,
    then the `Black` tag.
    """
    assert line(Black="Short, Nigel D", White="Adams, Michael").players == (
        "Adams, Michael vs. Short, Nigel D"
    )


@given(game=games())
def test_every_frame_draws_its_position_under_numbers_kept_from_the_first(game: Game):
    """
    Asserts that each frame holds the pieces of its position on their
    squares, each under a number of its own that the first frame already
    gave out, whatever legal moves the game plays.
    """
    numbers = {number for number, _, _ in game.frames[0].pieces}

    assert [
        {(spot, symbol) for _, spot, symbol in frame.pieces} for frame in game.frames
    ] == [
        {(spot, piece.symbol()) for spot, piece in board.piece_map().items()}
        for board in game.boards()
    ]
    assert all(
        len(numbered := {number for number, _, _ in frame.pieces}) == len(frame.pieces)
        and numbered <= numbers
        for frame in game.frames
    )


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


def test_the_roster_reads_the_seven_tags_in_the_standards_order():
    """
    Asserts that a game's roster holds the values of the Seven Tag Roster in
    the order the PGN standard lists them, leaving out every other tag.
    """
    game = line(
        "e4",
        Black  = "B",
        Date   = "2000.01.02",
        ECO    = "B00",
        Event  = "E",
        Result = "1-0",
        Round  = "3",
        Site   = "S",
        White  = "W"
    )

    assert game.roster == ("E", "S", "2000.01.02", "3", "W", "B", "1-0")


def test_the_variant_problem_follows_the_errors_the_reader_recorded(
    read: Callable[..., list[Game]]
):
    """
    Asserts that a game whose reader recorded an error and whose `Variant`
    tag names Chess960, whose moves the reader reads, lists the reader's
    error first and the variant's message last.
    """
    [game]  = read('[Variant "Chess960"]\n\n1. e4 e5 2. Qxf7 *\n')
    [error] = game.errors

    assert error.startswith("illegal san: 'Qxf7'")
    assert game.problems == (error, "unsupported variant: Chess960")
