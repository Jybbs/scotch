"""
Holds what a test of the store's sources builds:

- `serve`, which registers on a `responses.RequestsMock` the answers a
  server gives for one file
- `declare`, which builds the `Source` a test fetches or reads
- `fill`, which stands a full disk in for the files written after it
- `land`, which writes a file where its source lands
- `zipped`, which writes the bytes of a zip archive a test serves or lands
"""

from collections.abc import Iterable
from dataclasses     import dataclass
from errno           import ENOSPC
from hashlib         import sha256
from http            import HTTPStatus
from io              import BytesIO
from os              import strerror
from pathlib         import Path
from pytest          import MonkeyPatch
from requests        import PreparedRequest
from responses       import CallbackResponse, GET, RequestsMock
from typing          import Any, IO, Self
from zipfile         import ZipFile

from scotch.sources.schemas import Source


def declare(path: str, section: str = "Players") -> Source:
    """
    Builds the `Source` of the file at `path` on `example.com`, a domain RFC
    2606 reserves for documentation, listed under `section` and named for
    its path.
    """
    return Source(
        address  = f"https://example.com/{path}",
        home     = "https://example.com/",
        provider = "Example",
        section  = section,
        title    = path
    )


FULL = OSError(ENOSPC, strerror(ENOSPC))
"""
The error a write to a full disk raises.
"""


@dataclass(frozen=True)
class Full:
    """
    A file opened for writing on a disk with room for one more byte or
    character, which `handle` writes through.
    """

    handle: IO[Any]

    def __enter__(self) -> Self:
        """
        Opens the block writing to the file.
        """
        return self

    def __exit__(self, *_: object):
        """
        Closes the file once the block ends.
        """
        self.handle.close()

    def write(self, data: bytes | str):
        """
        Writes the first byte or character of `data`, then raises `FULL`.
        """
        self.handle.write(data[:1])
        raise FULL

    def writelines(self, lines: Iterable[bytes | str]):
        """
        Writes the first of `lines` as `write` does.
        """
        for line in lines:
            self.write(line)


def fill(monkeypatch: MonkeyPatch, named: str = ""):
    """
    Makes each file opened for writing from here on whose name opens on
    `named` a `Full` one, so its first write stops partway through raising
    `FULL`, while every other file writes as it does on a disk with room.
    """
    opened = Path.open

    def opening(path: Path, mode: str = "r", *args: Any, **kwargs: Any) -> Any:
        """
        Opens `path` as `Path.open` does, wrapped in `Full` where `mode`
        writes to a file `named` names.
        """
        handle = opened(path, mode, *args, **kwargs)

        return Full(handle) if "w" in mode and path.name.startswith(named) else handle

    monkeypatch.setattr(Path, "open", opening)


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
