"""
Holds `Fetcher`, which `scotch fetch games` downloads each file of the
store's sources through.
"""

from functools          import cached_property
from http               import HTTPStatus
from importlib.metadata import version
from io                 import DEFAULT_BUFFER_SIZE
from pathlib            import Path
from pydantic           import BaseModel
from requests           import Session
from requests.adapters  import HTTPAdapter
from urllib3.util       import Retry

from scotch.sources.schemas import Download, Source


class Fetcher(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    Downloads files into `directory` through one `requests` session, sending
    a request again up to `retries` times and failing one that waits longer
    than `timeout_s` seconds to connect or for its next read.
    """

    directory: Path
    """
    The directory each file lands under, in the place `Source.path` names.
    """

    retries: int
    """
    The number of times a request is sent again after a passing fault.
    """

    timeout_s: float
    """
    The seconds a request waits to connect, and then for each read.
    """

    @cached_property
    def session(self) -> Session:
        """
        Opens the session every request goes through, whose adapter sends
        a request again where it fails to connect or the server answers
        429, 500, 502, 503, or 504, waiting 2 seconds before the second
        retry and doubling the wait before each one after it, or the time
        a `Retry-After` header names. Each request names `scotch` and
        its version as its user agent, since PGN Mentor answers the one
        `requests` sends by default with status 465.
        """
        session = Session()
        adapter = HTTPAdapter(
            max_retries = Retry(
                backoff_factor   = 1,
                status_forcelist = (
                    HTTPStatus.TOO_MANY_REQUESTS, HTTPStatus.INTERNAL_SERVER_ERROR,
                    HTTPStatus.BAD_GATEWAY, HTTPStatus.SERVICE_UNAVAILABLE,
                    HTTPStatus.GATEWAY_TIMEOUT
                ),
                total = self.retries
            )
        )
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        session.headers["User-Agent"] = f"scotch/{version('scotch')}"

        return session

    def fetch(self, source: Source, *, known: Download | None) -> Download:
        """
        Downloads the file `source` declares to the path `Source.path` names
        under `directory`, writing it beside that path first and moving
        it into place once whole. Where `known` records the file sitting
        there under an entity tag, the request sends that tag through
        `If-None-Match`, and a server answering 304 Not Modified leaves the
        file as it stands.

        Returns:
            The download the manifest records for the file, which is `known`
            itself where the server reported the file unchanged.

        Raises:
            requests.RequestException: Where the request fails once every
                                       retry has, or the server answers with
                                       an error status.
        """
        path    = source.path(self.directory)
        current = known is not None and known.etag is not None and known.matches(path)

        with self.session.get(
            str(source.address),
            headers = {"If-None-Match": known.etag} if current else {},
            stream  = True,
            timeout = self.timeout_s
        ) as response:
            response.raise_for_status()

            if response.status_code == HTTPStatus.NOT_MODIFIED:
                return known

            part = path.with_name(f"{path.name}.part")
            part.parent.mkdir(exist_ok=True, parents=True)

            with part.open("wb") as handle:
                handle.writelines(response.iter_content(DEFAULT_BUFFER_SIZE))

        return Download.from_file(part.replace(path), etag=response.headers.get("ETag"))
