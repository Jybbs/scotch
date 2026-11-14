"""
Pins what the `scotch show` commands print, meaning the stored game `game`
prints as Portable Game Notation (PGN), the moves and the games `position`
prints for one position, and the report `store` prints of the files and the
index, each against a data directory the `SCOTCH_DATA` variable names, and
the problem each names where it exits nonzero.
"""

from chess.pgn        import read_game
from collections.abc  import Callable
from common.app       import invoke
from common.games     import line
from io               import StringIO
from pathlib          import Path
from pytest           import CaptureFixture, MonkeyPatch, mark, param
from syrupy.assertion import SnapshotAssertion

from scotch.games.schemas   import Game
from scotch.index.tables    import PositionIndex
from scotch.sources.schemas import Download, Manifest, Source

POSITIONS = [
    param("1. e4 e5 2. Nf3", id="line-of-moves"),
    param(
        "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
        id = "fen"
    )
]


def recorded(body: bytes, data: Path, folder: str, source: Source):
    """
    Records `source` in the manifest of `folder` under `data` as a download
    of `body`.
    """
    (data / "body").write_bytes(body)
    Manifest.read(data / folder).recording(
        source.address,
        Download.from_file(data / "body", etag=None)
    ).write(data / folder)


@mark.usefixtures("indexed")
@mark.parametrize(
    "reference",
    [
        param("White.zip:2", id="place-past-the-file"),
        param("Black.zip:1", id="another-file"),
        param("White.zip", id="no-place"),
        param("White.zip:nonsense", id="place-not-a-number")
    ]
)
def test_game_naming_no_stored_game_exits_naming_the_reference(reference: str):
    """
    Asserts that a reference naming no game the index holds exits nonzero
    naming the reference.
    """
    assert invoke("show", "game", reference) == f"No stored game is named {reference}"


def test_game_prints_the_stored_game_a_reference_names(
    capsys  : CaptureFixture[str],
    indexed : Game
):
    """
    Asserts that `scotch show game` prints the stored game a reference names
    as PGN python-chess reads back with the game's tags and moves.
    """
    assert invoke("show", "game", "players/White.zip:1") == 0

    read = read_game(StringIO(capsys.readouterr().out))

    assert list(read.mainline_moves()) == list(indexed.moves)
    assert dict(read.headers) == dict(indexed.tags)


@mark.usefixtures("indexed")
@mark.parametrize("position", POSITIONS)
def test_position_prints_each_move_and_each_game(
    capsys   : CaptureFixture[str],
    position : str,
    snapshot : SnapshotAssertion
):
    """
    Asserts that `scotch show position` prints how many stored games reach
    the position, each move they played from it with how those games ended,
    and the games, reading a position from a line of moves and from a FEN
    alike.
    """
    assert invoke("show", "position", position) == 0
    assert capsys.readouterr().out == snapshot(name="position")


@mark.usefixtures("indexed")
def test_position_reads_the_moves_past_blank_lines_after_the_tags(
    capsys: CaptureFixture[str]
):
    """
    Asserts that `scotch show position` reads a line of moves its tags and
    blank lines open on as it reads the moves alone, since blank lines after
    the tags leave the game whole.
    """
    first, second = (
        (invoke("show", "position", position), capsys.readouterr().out)
        for position in ("1. e4 e5 2. Nf3", '[Event "A"]\n\n\n1. e4 e5 2. Nf3')
    )

    assert first == second
    assert first[0] == 0


@mark.usefixtures("indexed")
@mark.parametrize("position", POSITIONS)
def test_position_reads_one_argument_per_field(
    capsys   : CaptureFixture[str],
    position : str
):
    """
    Asserts that `scotch show position` reads a position the shell passes as
    one argument per field as it reads one argument, a FEN's `-` among them,
    with an option after the last field still read as the option.
    """
    assert invoke("show", "position", *position.split(), "--top", "20") == 0
    assert capsys.readouterr().out.startswith(
        "1 stored game reaches this position\nNc6 "
    )


@mark.usefixtures("indexed")
def test_position_with_no_argument_reports_the_starting_position(
    capsys: CaptureFixture[str]
):
    """
    Asserts that `scotch show position` with no argument reports the
    position every game starts from.
    """
    assert invoke("show", "position") == 0
    assert capsys.readouterr().out.startswith("1 stored game reaches this position\n")


@mark.parametrize(
    "argv",
    [
        param(("game", "players/White.zip:1"), id="game"),
        param(("position",), id="position")
    ]
)
def test_a_missing_index_exits_naming_where_it_was_looked_for(
    argv : tuple[str, ...],
    data : Path
):
    """
    Asserts that `scotch show game` and `scotch show position` with no index
    built under the data directory exit nonzero naming the directory they
    read.
    """
    assert invoke("show", *argv) == f"No index has been built under {data / 'index'}"


@mark.parametrize(
    "argv",
    [
        param(("game", "players/White.zip:1"), id="game"),
        param(("position",), id="position")
    ]
)
def test_an_index_holding_another_layout_exits_naming_where_it_was_read(
    argv   : tuple[str, ...],
    relaid : Path
):
    """
    Asserts that `scotch show game` and `scotch show position` against an
    index whose games table lacks a column exit nonzero naming the directory
    they read.
    """
    assert invoke("show", *argv) == f"The index under {relaid} holds another layout"


@mark.usefixtures("indexed")
@mark.parametrize(
    "position",
    [
        param(("1.e4 1...e5 2 Nf3",), id="move-numbers"),
        param(("1. e4 {a note} e5 2. Nf3 ; a rest",), id="comments"),
        param(("1. e4! e5?! $1 2. Nf3 $14",), id="annotations"),
        param(("1. e4 (1. d4) e5 2. Nf3 *",), id="variation-and-result"),
        param(("1. e4 e5 2. Nf3x",), id="a-letter-past-the-move-the-reader-takes"),
        param(("1.", "e4", "e5", "2.", "Nf3x", "1-0"), id="one-argument-per-word"),
        param(("1. e4 1…e5 2. Nf3",), id="ellipsis-in-a-move-number"),
        param(("1. e4+ e5# 2. Nf3",), id="marks-running-off-a-move"),
        param(("1. e4 e5 2. Nf3\n\n\n",), id="blank-lines-past-the-moves"),
        param(("1. e4 e5\n% an escape\n2. Nf3",), id="percent-line-among-the-moves"),
        param(("1. e4 e5 2. Nf3\n\n% an escape\n",), id="percent-line-past-the-moves"),
        param(("1. e4 ( c5 ) e5 2. Nf3",), id="variation-closing-where-one-is-open")
    ]
)
def test_position_reads_what_a_line_of_moves_holds_beside_its_moves(
    capsys   : CaptureFixture[str],
    position : tuple[str, ...]
):
    """
    Asserts that `scotch show position` reports the position the moves
    alone reach for a line holding move numbers, comments, annotations,
    a variation, a result, a move the PGN reader takes short of its last
    letter, or a blank line or a `%` line with no move past it.
    """
    assert invoke("show", "position", *position) == 0
    assert capsys.readouterr().out.startswith(
        "1 stored game reaches this position\nNc6 "
    )


@mark.usefixtures("indexed")
def test_position_names_each_word_naming_no_move_and_each_illegal_move(
    capsys: CaptureFixture[str]
):
    """
    Asserts that `scotch show position` exits nonzero naming each word
    the PGN reader skips beside the illegal move it stopped at, printing
    no report.
    """
    assert invoke("show", "position", "1. e4 hello e4 Qh9") == (
        "Found problems in 1. e4 hello e4 Qh9:\nillegal san: 'e4' in"
        " rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1\n"
        "names no move: 'hello'\nnames no move: 'Qh9'"
    )
    assert capsys.readouterr().out == ""


@mark.usefixtures("indexed")
@mark.parametrize(
    ("position", "problem"),
    [
        param(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
            "The FEN rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR stops short of"
                " its first four fields, the placement, the side to move, the"
                " castling rights, and the en passant square, which together name"
                " a position",
            id = "fen-short-of-its-fields"
        ),
        param("--tpo", "Unknown option: --tpo", id="long-option-undeclared"),
        param("-t", "Unknown option: -t", id="short-option-undeclared"),
        param(
            "1. e4 e4",
            (
                "Found problems in 1. e4 e4:\nillegal san: 'e4' in"
                " rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
            ),
            id = "illegal-move"
        ),
        param(
            "1. e4 hello",
            "Found problems in 1. e4 hello:\nnames no move: 'hello'",
            id = "word-naming-no-move"
        ),
        param(
            "1. e4 e5 Qh9",
            "Found problems in 1. e4 e5 Qh9:\nnames no move: 'Qh9'",
            id = "square-off-the-board"
        ),
        param(
            "1. e4 e5 Qh9!",
            "Found problems in 1. e4 e5 Qh9!:\nnames no move: 'Qh9'",
            id = "word-running-into-an-annotation"
        ),
        param(
            "1. e4 helloe5",
            "Found problems in 1. e4 helloe5:\nnames no move: 'hello'",
            id = "word-running-into-the-move-after-it"
        ),
        param(
            "1. e4 e5 2. Sf3",
            "Found problems in 1. e4 e5 2. Sf3:\nnames no move: 'S'",
            id = "piece-letter-the-reader-passes-over"
        ),
        param(
            "1. Pe4",
            "Found problems in 1. Pe4:\nnames no move: 'P'",
            id = "pawn-letter-the-reader-passes-over"
        ),
        param(
            "1. e4hello",
            "Found problems in 1. e4hello:\nnames no move: 'hello'",
            id = "word-running-into-the-move-before-it"
        ),
        param(
            "1. e4\n\ne5",
            "Found problems in 1. e4\n\ne5:\nholds more past the end of its moves",
            id = "move-past-a-blank-line"
        ),
        param(
            "1. e4 ( e5",
            "Found problems in 1. e4 ( e5:\nnames no move: '('",
            id = "variation-left-open"
        ),
        param(
            "1. e4 {a note e5",
            "Found problems in 1. e4 {a note e5:\nnames no move: '{'",
            id = "comment-left-open"
        ),
        param(
            "1. e41 e5",
            "Found problems in 1. e41 e5:\nnames no move: '1'",
            id = "digit-running-into-the-move-before-it"
        ),
        param(
            "( e4",
            "Found problems in ( e4:\nnames no move: '('",
            id = "variation-opening-before-any-move"
        ),
        param(
            "1. e4 ) e5",
            "Found problems in 1. e4 ) e5:\nnames no move: ')'",
            id = "variation-closing-with-none-open"
        ),
        param(
            "1. e4 ( c5 ) ) e5",
            "Found problems in 1. e4 ( c5 ) ) e5:\nnames no move: ')'",
            id = "variation-closed-twice"
        )
    ]
)
def test_position_it_cannot_read_exits_naming_the_problem(position: str, problem: str):
    """
    Asserts that a FEN short of its first four fields and a line holding an
    illegal move, a word naming no move, a variation or a comment left open,
    a `(` before any move, a `)` with none open, or more past the blank line
    or the result ending its moves each exit nonzero naming the problem.
    """
    assert invoke("show", "position", position) == problem


def test_store_prints_each_source_the_index_and_whether_it_is_current(
    capsys   : CaptureFixture[str],
    data     : Path,
    declared : Callable[..., tuple[Source, ...]],
    snapshot : SnapshotAssertion
):
    """
    Asserts that `scotch show store` prints each declared file with its
    size and fetch date or as not fetched, the games and positions the index
    holds, and whether the files have changed since the index was built.
    """
    first, second = declared("players/A.pgn", "players/B%20C.pgn")

    (data / "downloads").mkdir()
    recorded(
        body   = bytes(1234),
        data   = data,
        folder = "downloads",
        source = first
    )
    recorded(
        body   = bytes(1234),
        data   = data,
        folder = "index",
        source = first
    )

    download = Manifest.read(data / "downloads").downloads[first.address]
    PositionIndex.build([line("e4"), line("d4", "d5")]).write(data / "index")

    assert invoke("show", "store") == 0
    assert capsys.readouterr().out.replace(
        str(data),
        "<data>"
    ).replace(f"{download.fetched:%Y-%m-%d}", "<date>") == snapshot


@mark.parametrize(
    ("fetched", "built", "body", "last"),
    [
        param(False, False, b"a", "Next: scotch fetch games", id="nothing-fetched"),
        param(True, False, b"a", "Next: scotch index games", id="no-index"),
        param(True, True, b"b", "Next: scotch index games", id="files-changed"),
        param(True, True, b"a", "Next: scotch match game <pgn>", id="ready")
    ]
)
def test_store_names_the_command_to_run_next(
    body     : bytes,
    built    : bool,
    capsys   : CaptureFixture[str],
    data     : Path,
    declared : Callable[..., tuple[Source, ...]],
    fetched  : bool,
    last     : str
):
    """
    Asserts that `scotch show store` ends on the fetch where a declared file
    is missing from the manifest, on the build where no index has been built
    or a later fetch recorded other bytes, and otherwise on a match.
    """
    [source] = declared("players/A.pgn")

    (data / "downloads").mkdir()

    if fetched:
        recorded(
            body   = body,
            data   = data,
            folder = "downloads",
            source = source
        )

    if built:
        PositionIndex.build([line("e4")]).write(data / "index")
        recorded(
            body   = b"a",
            data   = data,
            folder = "index",
            source = source
        )

    assert invoke("show", "store") == 0
    assert capsys.readouterr().out.splitlines()[-1] == last


def test_store_reads_an_index_under_another_layout_as_none_built(
    capsys   : CaptureFixture[str],
    data     : Path,
    declared : Callable[..., tuple[Source, ...]]
):
    """
    Asserts that `scotch show store` reports a positions file another layout
    wrote as no index, naming the build as the command to run next.
    """
    [source] = declared("players/A.pgn")

    (data / "downloads").mkdir()
    recorded(
        body   = b"a",
        data   = data,
        folder = "downloads",
        source = source
    )
    PositionIndex.build([line("e4")]).write(data / "index")
    PositionIndex.path(data / "index").write_bytes(b"")

    assert invoke("show", "store") == 0
    assert capsys.readouterr().out.splitlines()[-2:] == [
        f"No index in this layout has been built under {data / 'index'}",
        "Next: scotch index games"
    ]


@mark.parametrize(
    "argv",
    [
        param(("game", "players/White.zip:1"), id="game"),
        param(("position",), id="position")
    ]
)
@mark.usefixtures("indexed")
def test_a_command_opening_the_index_warns_where_the_files_changed(
    argv        : tuple[str, ...],
    data        : Path,
    declared    : Callable[..., tuple[Source, ...]],
    monkeypatch : MonkeyPatch
):
    """
    Asserts that `scotch show game` and `scotch show position` each write a
    line to stderr where a fetch recorded other bytes than the index's copy
    of the manifest records.
    """
    [source] = declared("players/A.pgn")

    (data / "downloads").mkdir()

    for folder, body in (("index", b"a"), ("downloads", b"b")):
        recorded(
            body   = body,
            data   = data,
            folder = folder,
            source = source
        )

    monkeypatch.setattr("scotch.cli.settings.stderr", stderr := StringIO())

    assert invoke("show", *argv) == 0
    assert "have changed since the index" in stderr.getvalue()


def test_top_caps_the_games_position_lists(capsys: CaptureFixture[str], data: Path):
    """
    Asserts that `--top 1` lists the newest game alone while the count still
    reads every game.
    """
    PositionIndex.build(
        [
            line("e4", Date="2000.01.01", White="Older"),
            line("e4", Date="2010.01.01", White="Newer")
        ]
    ).write(data / "index")

    assert invoke("show", "position", "--top", "1") == 0

    printed = capsys.readouterr().out

    assert "2 stored games reach this position" in printed
    assert "Newer" in printed
    assert "Older" not in printed
