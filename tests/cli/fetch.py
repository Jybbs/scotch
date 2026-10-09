"""
Pins what `scotch fetch games` prints and records for the files it is
declared, against the `Server` the `server` fixture puts in place of the
network, and the problem it names where it exits nonzero.
"""

from collections.abc  import Callable
from common.app       import invoke
from common.sources   import Server
from pathlib          import Path
from pytest           import CaptureFixture, MonkeyPatch
from syrupy.assertion import SnapshotAssertion

from scotch.sources.schemas import Manifest, Source


def test_a_failed_request_exits_naming_the_file_and_keeps_the_ones_before(
    data     : Path,
    declared : Callable[..., tuple[Source, ...]],
    server   : Server
):
    """
    Asserts that a file the server answers 404 Not Found for exits nonzero
    naming its address and the error, while the manifest keeps each file
    fetched before it.
    """
    server.files["https://example.com/players/A.zip"] = b"a"
    first, _ = declared("players/A.zip", "players/B.zip")

    assert invoke("fetch", "games") == (
        "Could not fetch https://example.com/players/B.zip: 404 Client Error:"
        " Not Found for url: https://example.com/players/B.zip"
    )
    assert list(Manifest.read(data / "downloads").downloads) == [first.address]


def test_a_fetch_prints_each_file_and_records_it_beside_them(
    capsys   : CaptureFixture[str],
    data     : Path,
    declared : Callable[..., tuple[Source, ...]],
    server   : Server
):
    """
    Asserts that a fetch downloads each declared file under the `downloads`
    folder of the data directory, prints one line naming each as fetched,
    and records each in the manifest beside them in the order declared.
    """
    server.files |= {
        "https://example.com/players/A.zip" : b"a",
        "https://example.com/players/B.zip" : b"b"
    }
    sources = declared("players/A.zip", "players/B.zip")

    assert invoke("fetch", "games") == 0
    assert capsys.readouterr().out == (
        "Fetched https://example.com/players/A.zip\n"
        "Fetched https://example.com/players/B.zip\n"
    )
    assert list(Manifest.read(data / "downloads").downloads) == [
        source.address for source in sources
    ]
    assert [source.path(data / "downloads").read_bytes() for source in sources] == [
        b"a", b"b"
    ]


def test_a_fetch_sends_each_request_under_the_timeout_the_settings_name(
    declared    : Callable[..., tuple[Source, ...]],
    monkeypatch : MonkeyPatch,
    server      : Server
):
    """
    Asserts that each request a fetch sends waits the seconds the
    `SCOTCH_TIMEOUT_S` variable names.
    """
    server.files["https://example.com/players/A.zip"] = b"a"
    declared("players/A.zip")
    monkeypatch.setenv("SCOTCH_TIMEOUT_S", "5")

    assert invoke("fetch", "games") == 0
    assert [timeout for _, timeout in server.sent] == [5]


def test_a_second_fetch_prints_each_file_the_server_reports_unchanged(
    capsys   : CaptureFixture[str],
    data     : Path,
    declared : Callable[..., tuple[Source, ...]],
    server   : Server
):
    """
    Asserts that fetching again prints each file the server reports
    unchanged as such and leaves the manifest as the first fetch wrote it.
    """
    server.files["https://example.com/players/A.zip"] = b"a"
    [source] = declared("players/A.zip")
    invoke("fetch", "games")
    manifest = Manifest.read(data / "downloads")
    capsys.readouterr()

    assert list(manifest.downloads) == [source.address]
    assert invoke("fetch", "games") == 0
    assert capsys.readouterr().out == "Unchanged https://example.com/players/A.zip\n"
    assert Manifest.read(data / "downloads") == manifest


def test_fetch_games_help_text(
    capsys      : CaptureFixture[str],
    monkeypatch : MonkeyPatch,
    snapshot    : SnapshotAssertion
):
    """
    Asserts that `--help` exits zero and prints the help text its snapshot
    holds at eighty columns.
    """
    monkeypatch.setenv("COLUMNS", "80")

    assert invoke("fetch", "games", "--help") == 0
    assert capsys.readouterr().out == snapshot
