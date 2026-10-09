"""
Holds what a test of the store's sources builds:

- `Server`, which answers each request a `requests` session sends once the
  `server` fixture puts its `send` in place of `HTTPAdapter.send`
- `answer`, which builds each response `Server` sends
- `declare`, which builds the `Source` a test fetches or reads
- `land`, which writes a file where its source lands
- `zipped`, which writes the bytes of a zip archive a test serves or lands
"""

from dataclasses import dataclass, field
from hashlib     import sha256
from http        import HTTPStatus
from io          import BytesIO
from pathlib     import Path
from requests    import PreparedRequest, Response
from requests.structures import CaseInsensitiveDict
from zipfile             import ZipFile

from scotch.sources.schemas import Source


@dataclass(kw_only=True)
class Server:
    """
    Serves the bytes `files` holds under each address, tagging each answer
    with an entity tag drawn from the bytes' digest where `tagged` is set,
    and logging each request it answers with the timeout it was sent with.
    """

    files  : dict[str, bytes] = field(default_factory=dict)
    sent   : list[tuple[PreparedRequest, float]] = field(default_factory=list)
    tagged : bool = True

    def send(
        self,
        request : PreparedRequest,
        *,
        timeout : float,
        **_     : object
    ) -> Response:
        """
        Answers `request` with 404 Not Found where `files` holds nothing at
        its address, with 304 Not Modified where its `If-None-Match` header
        names the entity tag of the bytes held there, and with those bytes
        otherwise.
        """
        self.sent.append((request, timeout))

        if (body := self.files.get(request.url)) is None:
            return answer(request, HTTPStatus.NOT_FOUND)

        if not self.tagged:
            return answer(request, HTTPStatus.OK, body)

        if request.headers.get(
            "If-None-Match"
        ) == (tag := f'"{sha256(body).hexdigest()[:16]}"'):
            return answer(request, HTTPStatus.NOT_MODIFIED, ETag=tag)

        return answer(
            ETag    = tag,
            body    = body,
            request = request,
            status  = HTTPStatus.OK
        )


def answer(
    request   : PreparedRequest,
    status    : HTTPStatus,
    body      : bytes = b"",
    **headers : str
) -> Response:
    """
    Builds the response a server sends to `request` with `status`, `body`,
    and `headers`.
    """
    response             = Response()
    response.headers     = CaseInsensitiveDict(headers)
    response.raw         = BytesIO(body)
    response.reason      = status.phrase
    response.request     = request
    response.status_code = status
    response.url         = request.url

    return response


def declare(path: str) -> Source:
    """
    Builds the `Source` of the file at `path` on `example.com`, a domain RFC
    2606 reserves for documentation.
    """
    return Source(
        address  = f"https://example.com/{path}",
        home     = "https://example.com/",
        provider = "Example",
        section  = "Players"
    )


def land(directory: Path, path: str, *, body: bytes) -> Source:
    """
    Writes `body` where the source of the file at `path` lands under
    `directory`, as a fetch would, and returns that source.
    """
    source = declare(path)
    (target := source.path(directory)).parent.mkdir(exist_ok=True, parents=True)
    target.write_bytes(body)

    return source


def zipped(*members: tuple[str, str]) -> bytes:
    """
    Writes a zip archive holding each member `members` pairs a name with the
    text of, in the order `members` lists them.
    """
    archive = BytesIO()

    with ZipFile(archive, "w") as handle:
        for name, text in members:
            handle.writestr(name, text)

    return archive.getvalue()
