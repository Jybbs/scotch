"""
Pins what `Fetcher` downloads and records for a file of the store's sources
against the `Server` the `server` fixture puts in place of the network,
meaning when it sends `If-None-Match` and what it keeps on a 304, and the
session each request goes through.
"""

from common.sources     import Server, declare
from hashlib            import sha256
from http               import HTTPStatus
from importlib.metadata import version
from pytest             import mark, param, raises
from requests           import HTTPError

from scotch.sources.fetchers import Fetcher
from scotch.sources.schemas  import Source


def test_a_file_the_server_changed_is_fetched_again(
    fetcher : Fetcher,
    served  : Source,
    server  : Server
):
    """
    Asserts that a file whose bytes the server changed since its recorded
    fetch is written again and recorded under its new entity tag and digest.
    """
    known = fetcher.fetch(served, known=None)
    server.files[str(served.address)] = b"more games"

    download = fetcher.fetch(served, known=known)

    assert download.etag != known.etag
    assert download.sha256 == sha256(b"more games").hexdigest()
    assert served.path(fetcher.directory).read_bytes() == b"more games"


def test_a_file_the_server_lacks_raises_and_writes_nothing(
    fetcher : Fetcher,
    server  : Server
):
    """
    Asserts that a file the server answers 404 Not Found for raises
    `HTTPError` and leaves nothing under the downloads directory.
    """
    with raises(HTTPError) as error:
        fetcher.fetch(declare("players/Adams.zip"), known=None)

    assert error.value.response.status_code == HTTPStatus.NOT_FOUND
    assert not any(fetcher.directory.iterdir())


def test_a_file_the_server_reports_unchanged_keeps_its_download(
    fetcher : Fetcher,
    served  : Source,
    server  : Server
):
    """
    Asserts that fetching a file the manifest records under an entity
    tag sends that tag through `If-None-Match` and, on a 304, returns the
    recorded download itself and leaves the file as it stands.
    """
    known = fetcher.fetch(served, known=None)

    assert fetcher.fetch(served, known=known) is known

    request, _ = server.sent[-1]
    assert request.headers["If-None-Match"] == known.etag
    assert served.path(fetcher.directory).read_bytes() == b"games"


@mark.parametrize(
    ("tagged", "local"),
    [
        param(True, b"edited", id="file-edited"),
        param(True, None, id="file-missing"),
        param(False, b"games", id="no-entity-tag")
    ]
)
def test_a_fetch_sends_no_condition_unless_the_recorded_file_stands(
    fetcher : Fetcher,
    local   : bytes | None,
    served  : Source,
    server  : Server,
    tagged  : bool
):
    """
    Asserts that a file whose copy on disk was edited or removed since its
    recorded fetch, or which the server sent with no entity tag, is fetched
    again with no `If-None-Match`, so a 304 never stands in for bytes the
    disk no longer holds.
    """
    server.tagged = tagged
    known         = fetcher.fetch(served, known=None)
    path          = served.path(fetcher.directory)

    if local is None:
        path.unlink()
    else:
        path.write_bytes(local)

    assert fetcher.fetch(served, known=known) is not known

    request, _ = server.sent[-1]
    assert "If-None-Match" not in request.headers
    assert path.read_bytes() == b"games"


def test_a_first_fetch_writes_the_file_and_records_it(
    fetcher : Fetcher,
    served  : Source,
    server  : Server
):
    """
    Asserts that fetching a file no manifest records sends no
    `If-None-Match`, writes the file where its source lands, leaves no
    partial file beside it, and records its entity tag, size, and digest.
    """
    download = fetcher.fetch(served, known=None)

    [(request, timeout)] = server.sent
    assert "If-None-Match" not in request.headers
    assert timeout == 7
    assert [path.name for path in served.path(fetcher.directory).parent.iterdir()] == [
        "Adams.zip"
    ]
    assert served.path(fetcher.directory).read_bytes() == b"games"
    assert download.etag == f'"{sha256(b"games").hexdigest()[:16]}"'
    assert (download.sha256, download.size_bytes) == (sha256(b"games").hexdigest(), 5)


def test_the_session_retries_passing_faults_and_names_scotch(fetcher: Fetcher):
    """
    Asserts that the session retries a request the fetcher's number of times
    on a failed connection or on a 429, 500, 502, 503, or 504, waiting more
    before each retry, and sends `scotch` and its version as its user agent.
    """
    retry = fetcher.session.get_adapter("https://example.com/").max_retries

    assert retry.total == 3
    assert retry.backoff_factor == 1
    assert set(retry.status_forcelist) == {429, 500, 502, 503, 504}
    assert fetcher.session.headers["User-Agent"] == f"scotch/{version('scotch')}"
