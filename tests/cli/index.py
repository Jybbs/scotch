"""
Pins what `scotch index games` prints and writes for the files a fetch left
under the data directory, read across a pool of processes, and the problem
it names where it exits nonzero.
"""

from collections.abc  import Callable
from common.app       import invoke
from common.sources   import zipped
from pathlib          import Path
from pytest           import CaptureFixture, MonkeyPatch
from syrupy.assertion import SnapshotAssertion

from scotch.index.tables    import PositionIndex
from scotch.sources.schemas import Manifest, Source


def test_a_declared_file_not_yet_fetched_is_left_out_of_the_build(
    capsys   : CaptureFixture[str],
    data     : Path,
    declared : Callable[..., tuple[Source, ...]],
    fetched  : Callable[..., tuple[Source, ...]]
):
    """
    Asserts that a build reads only the declared files the manifest records,
    leaving out a file declared since the last fetch.
    """
    fetched(("players/A.pgn", b"1. e4 *\n"))
    declared("players/A.pgn", "players/B.pgn")

    assert invoke("index", "games") == 0
    assert capsys.readouterr().out.splitlines() == [
        "Read 1 game from https://example.com/players/A.pgn",
        f"Indexed 1 games into {data / 'index'}"
    ]


def test_a_file_changed_on_disk_since_its_fetch_exits_naming_it(
    data    : Path,
    fetched : Callable[..., tuple[Source, ...]]
):
    """
    Asserts that a build where one fetched file was edited and another
    removed since the fetch exits nonzero naming both, so the index never
    records a manifest the bytes it read disagree with.
    """
    edited, _, removed = fetched(
        ("players/A.pgn", b"1. e4 *\n"),
        ("players/B.pgn", b"1. d4 *\n"),
        ("players/C.pgn", b"1. c4 *\n")
    )
    edited.path(data / "downloads").write_bytes(b"1. f4 *\n")
    removed.path(data / "downloads").unlink()

    assert invoke("index", "games") == (
        "These files changed on disk since their fetch, which `scotch fetch games`"
        " downloads again:\nhttps://example.com/players/A.pgn"
        "\nhttps://example.com/players/C.pgn"
    )


def test_an_index_build_reports_each_file_and_each_game_left_out(
    capsys  : CaptureFixture[str],
    data    : Path,
    fetched : Callable[..., tuple[Source, ...]]
):
    """
    Asserts that a build reads every fetched file in the order declared and
    prints, for each, the games read and a line per problem of a game left
    out naming its file, its place, and its players, then the games indexed.
    A game the second file repeats is indexed once, under the first.
    """
    fetched(
        ("players/A.zip", zipped(("A.pgn", '[White "A"]\n\n1. e4 *\n'))),
        (
            "players/B.pgn",
            b'[White "A"]\n\n1. e4 *\n\n[White "B"]\n\n1. e4 e5 2. Qxf7 *\n\n1. d4 *\n'
        )
    )

    assert invoke("index", "games") == 0
    assert capsys.readouterr().out.splitlines() == [
        "Read 1 game from https://example.com/players/A.zip",
        "Read 3 games from https://example.com/players/B.pgn",
        "Left out game 2 of https://example.com/players/B.pgn, B vs. ?: illegal san:"
        " 'Qxf7' in rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        f"Indexed 2 games into {data / 'index'}"
    ]

    index = PositionIndex.read(data / "index")

    assert [index.game(number).origin.address for number in range(2)] == [
        "https://example.com/players/A.zip", "https://example.com/players/B.pgn"
    ]
    assert Manifest.read(data / "index") == Manifest.read(data / "downloads")


def test_an_index_build_with_nothing_fetched_exits_naming_the_folder(data: Path):
    """
    Asserts that a build where no file has been fetched exits nonzero naming
    the `downloads` folder it read.
    """
    assert invoke("index", "games") == (
        f"No file has been fetched under {data / 'downloads'}"
    )


def test_index_games_help_text(
    capsys      : CaptureFixture[str],
    monkeypatch : MonkeyPatch,
    snapshot    : SnapshotAssertion
):
    """
    Asserts that `--help` exits zero and prints the help text its snapshot
    holds at eighty columns.
    """
    monkeypatch.setenv("COLUMNS", "80")

    assert invoke("index", "games", "--help") == 0
    assert capsys.readouterr().out == snapshot
