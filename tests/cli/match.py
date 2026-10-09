"""
Pins what `scotch match game` prints and writes for a game read from a
PGN file, against an index of one stored game built under a directory
the `SCOTCH_DATA` variable names, and the problem it names where it exits
nonzero.
"""

from collections.abc  import Callable
from common.app       import invoke
from pathlib          import Path
from polars           import read_parquet
from pytest           import CaptureFixture, MonkeyPatch, mark, param
from syrupy.assertion import SnapshotAssertion

from scotch.games.schemas import Game
from scotch.index.schemas import Export
from scotch.index.tables  import PositionIndex


def test_a_file_holding_no_game_exits_naming_it(data: Path, pgn: Callable[..., Path]):
    """
    Asserts that a file holding no game exits nonzero naming the file.
    """
    path = pgn("")

    assert invoke("match", "game", str(path)) == f"Found no game in {path}"


def test_a_file_holding_several_games_matches_its_first(
    capsys   : CaptureFixture[str],
    indexed  : Game,
    pgn      : Callable[..., Path],
    snapshot : SnapshotAssertion
):
    """
    Asserts that a file holding two games matches the first, which shares
    four positions with the stored game, rather than the second, which
    shares five.
    """
    path = pgn("1. e4 e5 2. Nf3 d6 *\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 *\n")

    assert invoke("match", "game", str(path)) == 0
    assert capsys.readouterr().out == snapshot


@mark.parametrize(
    ("text", "problem"),
    [
        param(
            "1. e4 e5 2. Qxf7 *",
            (
                "illegal san: 'Qxf7' in "
                "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
            ),
            id = "illegal-move"
        ),
        param(
            '[Variant "Atomic"]\n\n1. e4 *',
            "unsupported variant: Atomic",
            id = "variant"
        )
    ]
)
def test_a_game_that_cannot_be_matched_exits_naming_its_problem(
    data    : Path,
    pgn     : Callable[..., Path],
    problem : str,
    text    : str
):
    """
    Asserts that a game python-chess recorded an error reading, or one whose
    `Variant` tag names a variant other than standard chess, exits nonzero
    naming the file and the problem.
    """
    path = pgn(text)

    assert invoke(
        "match",
        "game",
        str(path)
    ) == f"Cannot match the game in {path}:\n{problem}"


def test_a_game_sharing_no_position_prints_a_line_saying_so(
    capsys   : CaptureFixture[str],
    indexed  : Game,
    pgn      : Callable[..., Path],
    snapshot : SnapshotAssertion
):
    """
    Asserts that a game set up from a position the stored game never reaches
    prints one line saying no stored game shares a position with it.
    """
    path = pgn('[FEN "4k3/8/8/8/8/8/8/4K2R w K - 0 1"]\n\n1. O-O *')

    assert invoke("match", "game", str(path)) == 0
    assert capsys.readouterr().out == snapshot


def test_a_match_prints_the_stored_game_the_span_and_the_parting(
    capsys   : CaptureFixture[str],
    indexed  : Game,
    pgn      : Callable[..., Path],
    snapshot : SnapshotAssertion
):
    """
    Asserts that a game sharing its first four positions with the stored
    game prints the stored game's players, event, and date, the plies the
    two share, and the move the stored game played where they part.
    """
    assert invoke(
        "match",
        "game",
        str(pgn("1. e4 e5 2. Nf3 d6 *"))
    ) == 0
    assert capsys.readouterr().out == snapshot


def test_a_missing_index_exits_naming_where_it_was_looked_for(
    data : Path,
    pgn  : Callable[..., Path]
):
    """
    Asserts that a run with no index built under the data directory exits
    nonzero naming the directory it read.
    """
    assert invoke(
        "match",
        "game",
        str(pgn("1. e4 *"))
    ) == f"No index has been built under {data / 'index'}"


@mark.usefixtures("indexed")
def test_an_index_holding_another_layout_exits_naming_where_it_was_read(
    data : Path,
    pgn  : Callable[..., Path]
):
    """
    Asserts that a run against an index whose games table lacks a column
    exits nonzero naming the directory it read.
    """
    games = data / "index" / "games.parquet"
    read_parquet(games).drop("errors").write_parquet(games)

    assert invoke(
        "match",
        "game",
        str(pgn("1. e4 *"))
    ) == f"The index under {data / 'index'} holds another layout"


def test_json_writes_the_export_of_the_match(indexed: Game, pgn: Callable[..., Path]):
    """
    Asserts that `--json` writes the export of the match to the file it
    names, creating the folder that holds it, with the submitted game beside
    the stored game.
    """
    path     = pgn("1. e4 e5 2. Nf3 d6 *")
    exported = path.parent / "missing" / "match.json"

    assert invoke("match", "game", str(path), "--json", str(exported)) == 0

    export = Export.model_validate_json(exported.read_text())
    [game] = Game.read(path)

    assert export == Export.from_match(PositionIndex.build([indexed]).match(game), game)


def test_match_game_help_text(
    capsys      : CaptureFixture[str],
    monkeypatch : MonkeyPatch,
    snapshot    : SnapshotAssertion
):
    """
    Asserts that `--help` exits zero and prints the help text its snapshot
    holds at eighty columns.
    """
    monkeypatch.setenv("COLUMNS", "80")

    assert invoke("match", "game", "--help") == 0
    assert capsys.readouterr().out == snapshot
