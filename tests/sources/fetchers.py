"""
Pins what `Fetcher` downloads and records for a file of the store's sources
against the answers `responses` registers in place of the network, meaning
when it sends `If-None-Match` and what it keeps on a 304, which faults its
session retries and how many, and the user agent it names.
"""

from collections.abc     import Iterator
from common.sources      import declare, serve
from hashlib             import sha256
from http                import HTTPStatus
from importlib.metadata  import version
from pytest              import MonkeyPatch, mark, param, raises
from requests            import HTTPError, Response
from requests.exceptions import ChunkedEncodingError, RetryError
from responses           import RequestsMock

from scotch.sources.fetchers import Fetcher
from scotch.sources.schemas  import Source


def test_a_download_cut_off_partway_leaves_the_earlier_download_as_it_stood(
    fetcher     : Fetcher,
    monkeypatch : MonkeyPatch,
    served      : Source,
    web         : RequestsMock
):
    """
    Asserts that a download whose connection drops partway through raises
    `ChunkedEncodingError` and leaves the file an earlier fetch wrote at its
    path holding the bytes it held.
    """
    fetcher.fetch(served, known=None)
    serve(str(served.address), b"more games", web=web)

    def cut(*_: object) -> Iterator[bytes]:
        """
        Yields the first bytes of the body, then raises as a dropped
        connection does.
        """
        yield b"more"
        raise ChunkedEncodingError("connection dropped")

    monkeypatch.setattr(Response, "iter_content", cut)

    with raises(ChunkedEncodingError):
        fetcher.fetch(served, known=None)

    assert served.path(fetcher.directory).read_bytes() == b"games"


def test_a_file_the_server_changed_is_fetched_again(
    fetcher : Fetcher,
    served  : Source,
    web     : RequestsMock
):
    """
    Asserts that a file whose bytes the server changed since its recorded
    fetch is written again and recorded under its new entity tag and digest.
    """
    known = fetcher.fetch(served, known=None)
    serve(str(served.address), b"more games", web=web)

    download = fetcher.fetch(served, known=known)

    assert download.etag != known.etag
    assert download.sha256 == sha256(b"more games").hexdigest()
    assert served.path(fetcher.directory).read_bytes() == b"more games"


def test_a_file_the_server_lacks_raises_at_once_and_writes_nothing(
    fetcher : Fetcher,
    web     : RequestsMock
):
    """
    Asserts that a file the server answers 404 Not Found for raises
    `HTTPError` after one request, retrying nothing, and leaves nothing
    under the downloads directory.
    """
    web.get("https://example.com/players/Adams.zip", status=HTTPStatus.NOT_FOUND)

    with raises(HTTPError) as error:
        fetcher.fetch(declare("players/Adams.zip"), known=None)

    assert error.value.response.status_code == HTTPStatus.NOT_FOUND
    assert len(web.calls) == 1
    assert not any(fetcher.directory.iterdir())


def test_a_file_the_server_reports_unchanged_keeps_its_download(
    fetcher : Fetcher,
    served  : Source,
    web     : RequestsMock
):
    """
    Asserts that fetching a file the manifest records under an entity
    tag sends that tag through `If-None-Match` and, on a 304, returns the
    recorded download itself and leaves the file as it stands.
    """
    known = fetcher.fetch(served, known=None)

    assert fetcher.fetch(served, known=known) is known
    assert web.calls[-1].request.headers["If-None-Match"] == known.etag
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
    tagged  : bool,
    web     : RequestsMock
):
    """
    Asserts that a file whose copy on disk was edited or removed since its
    recorded fetch, or which the server sent with no entity tag, is fetched
    again with no `If-None-Match`, so a 304 never stands in for bytes the
    disk no longer holds.
    """
    serve(str(served.address), b"games", tagged=tagged, web=web)
    known = fetcher.fetch(served, known=None)
    path  = served.path(fetcher.directory)

    if local is None:
        path.unlink()
    else:
        path.write_bytes(local)

    assert fetcher.fetch(served, known=known) is not known
    assert "If-None-Match" not in web.calls[-1].request.headers
    assert path.read_bytes() == b"games"


def test_a_first_fetch_writes_the_file_and_records_it(
    fetcher : Fetcher,
    served  : Source,
    web     : RequestsMock
):
    """
    Asserts that fetching a file no manifest records sends no
    `If-None-Match` under the fetcher's timeout, writes the file where its
    source lands, leaves no partial file beside it, and records its entity
    tag, size, and digest.
    """
    download = fetcher.fetch(served, known=None)

    [call] = web.calls
    assert "If-None-Match" not in call.request.headers
    assert call.request.req_kwargs["timeout"] == 7
    assert [path.name for path in served.path(fetcher.directory).parent.iterdir()] == [
        "Adams.zip"
    ]
    assert served.path(fetcher.directory).read_bytes() == b"games"
    assert download.etag == f'"{sha256(b"games").hexdigest()[:16]}"'
    assert (download.sha256, download.size_bytes) == (sha256(b"games").hexdigest(), 5)


@mark.parametrize("status", [429, 500, 502, 503, 504])
def test_a_passing_fault_is_sent_again_until_the_file_lands(
    fetcher : Fetcher,
    queued  : RequestsMock,
    status  : int
):
    """
    Asserts that a request the server first answers with a status naming a
    passing fault is sent again and lands the file the next answer carries.
    """
    queued.get("https://example.com/players/Adams.zip", status=status)
    queued.get("https://example.com/players/Adams.zip", body=b"games")
    source = declare("players/Adams.zip")

    fetcher.fetch(source, known=None)

    assert len(queued.calls) == 2
    assert source.path(fetcher.directory).read_bytes() == b"games"


@mark.parametrize(
    ("faults", "lands"),
    [
        param(3, True, id="as-many-as-the-retries"),
        param(4, False, id="one-more-than-the-retries")
    ]
)
def test_a_fetch_lands_the_file_only_where_its_faults_stay_within_the_retries(
    faults  : int,
    fetcher : Fetcher,
    lands   : bool,
    queued  : RequestsMock
):
    """
    Asserts that a fetcher retrying 3 times lands a file the server answers
    503 for 3 times before sending it, and raises `RetryError` after 4
    requests where it answers 503 a fourth time, writing nothing.
    """
    for _ in range(faults):
        queued.get("https://example.com/players/Adams.zip", status=503)

    queued.get("https://example.com/players/Adams.zip", body=b"games")
    source = declare("players/Adams.zip")

    if lands:
        fetcher.fetch(source, known=None)
    else:
        with raises(RetryError):
            fetcher.fetch(source, known=None)

    assert len(queued.calls) == 4
    assert source.path(fetcher.directory).is_file() is lands


def test_the_session_waits_more_before_each_retry_and_names_scotch(fetcher: Fetcher):
    """
    Asserts that the session's adapter doubles its wait before each retry
    from a factor of 1, which `responses` never sleeps for, and sends
    `scotch` and its version as its user agent.
    """
    assert fetcher.session.get_adapter(
        "https://example.com/"
    ).max_retries.backoff_factor == 1
    assert fetcher.session.headers["User-Agent"] == f"scotch/{version('scotch')}"
