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
from pathlib             import Path
from pydantic            import AwareDatetime, BaseModel, Field, HttpUrl, NonNegativeInt, PositiveInt, model_validator
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

    @property
    def summary(self) -> str:
        """
        Writes the file's size and the day it was fetched.
        """
        return f"{self.size_bytes:,} bytes, fetched {self.fetched:%Y-%m-%d}"

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
    The heading the provider's site lists the file under within its
    section, such as `World Championships`, or `None` where the section
    holds no headings.
    """

    provider: str
    """
    The home page of the site providing the file.
    """

    section: str
    """
    The moves opening every game of an archive of one opening, as the
    provider's site writes them, such as `1.e4 c5 2.Nf3 d6`, or `None` for
    a file of any other kind.
    """

    title: str
    """
    The name of the site providing the file.
    """

    group: str | None = None
    """
    The section of the provider's site listing the file.
    """

    moves: str | None = None
    """
    The name the provider's site gives the file, such as `Magnus Carlsen`,
    `World Championship 2018`, or `Sicilian, Najdorf`.
    """

    @property
    def file(self) -> str:
        """
        Reads the path the file's address names under its host without its
        percent-encoding, such as `players/Carlsen.zip`.
        """
        return Origin(address=str(self.address), place=1).file

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
                *Game.read(ZipPath(archive, name))
                for name in archive.namelist()
                if name.casefold().endswith(".pgn")
            )

    def path(self, directory: Path) -> Path:
        """
        Names where the file lands under `directory`, in a folder named for
        the host of its address that holds the path the address names.
        """
        return directory / self.address.host / self.address.path.removeprefix("/")

    def placed(self, games: Iterable[Game]) -> Iterator[Game]:
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
    The rating a game of a section's files reaches the store at, keyed by
    the section, read as the higher of its `WhiteElo` and `BlackElo` tags,
    and a section left out keeping every game.
    """

    floors: dict[str, PositiveInt] = {}
    """
    The files, each declared once.
    """

    @property
    def figures(self) -> dict[str, str]:
        """
        Names the figures a page sets from the sources, meaning the files
        declared, the files each section declares under `<section>-files`,
        and each section's floor under `<section>-floor`, each count written
        with a comma between each three digits and each floor as a rating is
        written, with none.
        """
        sections = Counter(row.section.lower() for row in self.sources)

        return {
            "files": f"{len(self.sources):,}",
            **{f"{section}-files": f"{count:,}" for section, count in sections.items()},
            **{
                f"{section.lower()}-floor": str(floor)
                for section, floor in self.floors.items()
            }
        }

    def floor(self, source: Source) -> int:
        """
        Reads the rating a game of `source` reaches the store at, 0 where
        the floors leave its section out.
        """
        return self.floors.get(source.section, 0)

    @model_validator(mode="after")
    def once(self) -> Self:
        """
        Refuses an address two rows declare, a provider two rows give
        different home pages, since each row restates its provider's, and a
        floor naming a section no row declares.
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

        if unknown := self.floors.keys() - {row.section for row in self.sources}:
            raise ValueError(
                f"floors name {', '.join(sorted(unknown))}, which no row declares"
            )

        return self

    @classmethod
    def read(cls) -> Self:
        """
        Reads every row of the `sources.toml` the `scotch.sources` package
        ships.
        """
        return cls.model_validate(loads(cls.text()))

    @staticmethod
    def text() -> str:
        """
        Reads the text of the `sources.toml` the `scotch.sources` package
        ships, as the file writes it.
        """
        return read_text("scotch.sources", "sources.toml")
