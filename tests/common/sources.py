"""
Holds what a test of the store's sources builds:

- `serve`, which registers on a `responses.RequestsMock` the answers a
  server gives for one file
- `declare`, which builds the `Source` a test fetches or reads
- `land`, which writes a file where its source lands
- `zipped`, which writes the bytes of a zip archive a test serves or lands
"""

from hashlib   import sha256
from http      import HTTPStatus
from io        import BytesIO
from pathlib   import Path
from requests  import PreparedRequest
from responses import CallbackResponse, GET, RequestsMock
from zipfile   import ZipFile

from scotch.sources.schemas import Source


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


def serve(address: str, body: bytes, *, web: RequestsMock, tagged: bool = True):
    """
    Registers on `web` the answer to each request for `address`, replacing
    any answer registered there before. Where `tagged` is set, a request
    whose `If-None-Match` header names the entity tag drawn from the digest
    of `body` is answered 304 Not Modified and any other with `body` under
    that tag, whereas an untagged answer is always `body` with no tag.
    """
    tag = f'"{sha256(body).hexdigest()[:16]}"'

    def answer(request: PreparedRequest) -> tuple[int, dict[str, str], bytes]:
        """
        Answers `request` with 304 Not Modified where it names the tag, and
        with the file's bytes otherwise.
        """
        if tagged and request.headers.get("If-None-Match") == tag:
            return HTTPStatus.NOT_MODIFIED, {"ETag": tag}, b""

        return HTTPStatus.OK, {"ETag": tag} if tagged else {}, body

    web.upsert(CallbackResponse(GET, address, callback=answer))


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
