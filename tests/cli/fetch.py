"""
Pins what `scotch fetch games` prints and records for the files it is
declared, against the answers `responses` registers in place of the network,
the settings its requests run under, and the problem it names where it exits
nonzero.
"""

from collections.abc  import Callable
from common.app       import invoke
from common.sources   import serve
from pathlib          import Path
from pytest           import CaptureFixture, MonkeyPatch
from responses        import RequestsMock
from syrupy.assertion import SnapshotAssertion

from scotch.sources.schemas import Manifest, Source


def test_a_failed_request_exits_naming_the_file_and_keeps_the_ones_before(
    data     : Path,
    declared : Callable[..., tuple[Source, ...]],
    web      : RequestsMock
):
    """
    Asserts that a file the server answers 404 Not Found for exits nonzero
    naming its address and the error, while the manifest keeps each file
    fetched before it.
    """
    serve("https://example.com/players/A.zip", b"a", web=web)
    web.get("https://example.com/players/B.zip", status=404)
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
    web      : RequestsMock
):
    """
    Asserts that a fetch downloads each declared file under the `downloads`
    folder of the data directory, prints one line naming each as fetched,
    and records each in the manifest beside them in the order declared.
    """
    serve("https://example.com/players/A.zip", b"a", web=web)
    serve("https://example.com/players/B.zip", b"b", web=web)
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


def test_a_fetch_retries_each_request_the_times_the_settings_name(
    declared    : Callable[..., tuple[Source, ...]],
    monkeypatch : MonkeyPatch,
    queued      : RequestsMock
):
    """
    Asserts that a fetch under a `SCOTCH_RETRIES` of 1 sends a request the
    server answers 503 twice no more than twice, exiting nonzero naming the
    file, although a third answer would have carried it.
    """
    for status in (503, 503, 200):
        queued.get("https://example.com/players/A.zip", status=status)

    declared("players/A.zip")
    monkeypatch.setenv("SCOTCH_RETRIES", "1")

    message = invoke("fetch", "games")

    assert message != 0
    assert message.startswith("Could not fetch https://example.com/players/A.zip:")
    assert "too many 503 error responses" in message
    assert len(queued.calls) == 2


def test_a_fetch_sends_each_request_under_the_timeout_the_settings_name(
    declared    : Callable[..., tuple[Source, ...]],
    monkeypatch : MonkeyPatch,
    web         : RequestsMock
):
    """
    Asserts that each request a fetch sends waits the seconds the
    `SCOTCH_TIMEOUT_S` variable names.
    """
    serve("https://example.com/players/A.zip", b"a", web=web)
    declared("players/A.zip")
    monkeypatch.setenv("SCOTCH_TIMEOUT_S", "5")

    assert invoke("fetch", "games") == 0
    assert [call.request.req_kwargs["timeout"] for call in web.calls] == [5]


def test_a_second_fetch_prints_each_file_the_server_reports_unchanged(
    capsys   : CaptureFixture[str],
    data     : Path,
    declared : Callable[..., tuple[Source, ...]],
    web      : RequestsMock
):
    """
    Asserts that fetching again prints each file the server reports
    unchanged as such and leaves the manifest as the first fetch wrote it.
    """
    serve("https://example.com/players/A.zip", b"a", web=web)
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
