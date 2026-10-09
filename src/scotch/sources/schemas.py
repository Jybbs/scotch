"""
Holds the records the store's sources travel in, meaning each `Source` the
`sources.toml` beside this module declares, the `Sources` that file reads
into, and the `Manifest` of every `Download` that `scotch fetch games`
writes beside the fetched files and `scotch index games` reads.
"""

from collections         import Counter
from collections.abc     import Iterable, Iterator
from datetime            import UTC, datetime
from functools           import partial
from hashlib             import file_digest
from importlib.resources import read_text
from itertools           import chain
from pathlib             import Path
from pydantic            import AwareDatetime, BaseModel, Field, HttpUrl, NonNegativeInt, model_validator
from tomllib             import loads
from typing              import Self
from zipfile             import Path as ZipPath, ZipFile, is_zipfile

from scotch.games.schemas import Game, Origin


class Download(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One fetched file, as the manifest beside it records it under its
    address.
    """

    etag: str | None
    """
    The entity tag the server sent with the file, which a later fetch sends
    back through `If-None-Match`, or `None` where it sent none.
    """

    sha256: str
    """
    The SHA-256 digest of the file's bytes, in hexadecimal.
    """

    size_bytes: NonNegativeInt
    """
    The size of the file.
    """

    fetched: AwareDatetime = Field(default_factory=partial(datetime.now, UTC))
    """
    The instant the file was fetched, in UTC.
    """

    @classmethod
    def from_file(cls, path: Path, *, etag: str | None) -> Self:
        """
        Reads the size and the SHA-256 digest of the file at `path`, fetched
        now under the entity tag `etag`.
        """
        with path.open("rb") as handle:
            return cls(
                etag       = etag,
                sha256     = file_digest(handle, "sha256").hexdigest(),
                size_bytes = path.stat().st_size
            )

    def matches(self, path: Path) -> bool:
        """
        Checks whether a file sits at `path` holding the bytes this download
        records.
        """
        return path.is_file() and self.from_file(
            path,
            etag = self.etag
        ).sha256 == self.sha256


class Source(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One file the store draws its games from, a zip archive of Portable Game
    Notation (PGN) files or a single PGN file.
    """

    address: HttpUrl
    """
    The address the file is fetched from.
    """

    home: HttpUrl
    """
    The home page of the site providing the file.
    """

    provider: str
    """
    The name of the site providing the file.
    """

    section: str
    """
    The section of the provider's site listing the file.
    """

    def games(self, directory: Path) -> Iterator[Game]:
        """
        Reads every game the file fetched under `directory` holds, reading
        an archive in place, member by member in the order it lists them,
        and leaving out every member whose name does not end in `.pgn` in
        any case. Each game carries the `Origin` naming this file's address
        and the game's place in it.
        """
        path = self.path(directory)

        if not is_zipfile(path):
            yield from self.placed(Game.read(path))
            return

        with ZipFile(path) as archive:
            yield from self.placed(
                chain.from_iterable(
                    Game.read(ZipPath(archive, name))
                    for name in archive.namelist()
                    if name.casefold().endswith(".pgn")
                )
            )

    def path(self, directory: Path) -> Path:
        """
        Names where the file lands under `directory`, in a folder named for
        the host of its address that holds the path the address names.
        """
        return directory / self.address.host / self.address.path.removeprefix("/")

    def placed(self, games: Iterator[Game]) -> Iterator[Game]:
        """
        Gives each game of `games` the `Origin` naming this file's address
        and the game's place in the order `games` yields them.
        """
        for place, game in enumerate(games, start=1):
            yield game.model_copy(
                update = {"origin": Origin(address=str(self.address), place=place)}
            )


class Manifest(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The files `scotch fetch games` has fetched, as `manifest.json` records
    them in the directory holding them, which `scotch index games` copies
    into the index it builds from them.
    """

    downloads: dict[HttpUrl, Download] = {}
    """
    Each fetched file keyed by the address it was fetched from.
    """

    @property
    def digests(self) -> dict[HttpUrl, str]:
        """
        Reads the SHA-256 digest of each fetched file, keyed by its address.
        """
        return {address: entry.sha256 for address, entry in self.downloads.items()}

    @classmethod
    def read(cls, directory: Path) -> Self:
        """
        Reads the `manifest.json` in `directory`, or an empty manifest where
        none was written there.
        """
        if not (path := directory / "manifest.json").is_file():
            return cls()

        return cls.model_validate_json(path.read_bytes())

    def recording(self, address: HttpUrl, download: Download) -> Self:
        """
        Copies the manifest with `download` recorded under `address`, in the
        place an earlier download of that address held.
        """
        return self.model_copy(
            update = {"downloads": {**self.downloads, address: download}}
        )

    def stale(self, directory: Path, sources: Iterable[Source]) -> list[HttpUrl]:
        """
        Lists the address of each of `sources` whose file under `directory`
        no longer holds the bytes the manifest records for it.
        """
        return [
            source.address
            for source in sources
            if not self.downloads[source.address].matches(source.path(directory))
        ]

    def write(self, directory: Path):
        """
        Writes the manifest to `manifest.json` in `directory`, creating the
        directory where it is missing.
        """
        directory.mkdir(exist_ok=True, parents=True)
        (directory / "manifest.json").write_text(
            self.model_dump_json(indent=2) + "\n",
            encoding = "utf-8"
        )


class Sources(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    Every file the store draws its games from, in the order a game several
    files repeat is indexed under the first of them.
    """

    sources: tuple[Source, ...]
    """
    The files, each declared once.
    """

    @model_validator(mode="after")
    def once(self) -> Self:
        """
        Refuses an address two rows declare and a provider two rows give
        different home pages, since each row restates its provider's.
        """
        addresses = Counter(row.address for row in self.sources)
        homes     = Counter(
            provider
            for provider, _ in {(row.provider, row.home) for row in self.sources}
        )

        if repeated := [address for address, count in addresses.items() if count > 1]:
            raise ValueError(f"rows repeat {', '.join(map(str, repeated))}")

        if split := [provider for provider, count in homes.items() if count > 1]:
            raise ValueError(f"rows give {', '.join(split)} more than one home page")

        return self

    @classmethod
    def read(cls) -> Self:
        """
        Reads the `sources.toml` the `scotch.sources` package ships.
        """
        return cls.model_validate(loads(read_text("scotch.sources", "sources.toml")))
