"""
Defines the fixtures the tests of `scotch.cli` share, each described where
it is defined.
"""

from collections.abc import Callable
from common.games    import line
from common.sample   import Sample
from common.sources  import declare, land
from pathlib         import Path
from pytest          import MonkeyPatch, fixture

from scotch.games.schemas   import Game, Origin
from scotch.index.tables    import PositionIndex
from scotch.sources.schemas import Download, Manifest, Source, Sources


@fixture
def data(monkeypatch: MonkeyPatch, tmp_path: Path) -> Path:
    """
    Points `SCOTCH_DATA` at an empty directory, leaving no index built.
    """
    monkeypatch.setenv("SCOTCH_DATA", str(tmp_path))

    return tmp_path


@fixture
def indexed(data: Path) -> Game:
    """
    Builds an index holding one stored game under the data directory, read
    as the first game of a file on `example.com`.
    """
    game = line(
        "e4",
        "e5",
        "Nf3",
        "Nc6",
        "Bb5",
        Black  = "Black, B",
        Date   = "2000.01.02",
        Event  = "Event",
        Result = "1-0",
        Round  = "1",
        Site   = "Site",
        White  = "White, W"
    ).model_copy(
        update = {
            "origin": Origin(address="https://example.com/players/White.zip", place=1)
        }
    )
    PositionIndex.build([game]).write(data / "index")

    return game


@fixture
def inside(monkeypatch: MonkeyPatch, sample: Sample) -> Sample:
    """
    Points the project's root `scotch audit repo` reads at the sample
    checkout.
    """
    monkeypatch.setattr("scotch.cli.audit.root", lambda: sample.root)

    return sample


@fixture
def project(monkeypatch: MonkeyPatch, tmp_path: Path) -> Path:
    """
    Points the project's root at an empty directory holding a
    `pyproject.toml` whose `[tool.scotch]` table moves the data to `table`.
    """
    (tmp_path / "pyproject.toml").write_text('[tool.scotch]\ndata = "table"\n')
    monkeypatch.setattr("scotch.cli.settings.root", lambda: tmp_path)

    return tmp_path


@fixture
def declared(monkeypatch: MonkeyPatch) -> Callable[..., tuple[Source, ...]]:
    """
    Builds a function that makes `Sources.read` return the sources of the
    files at the paths it is given on `example.com`, in that order, in place
    of the declarations `sources.toml` ships.
    """

    def declare_all(*paths: str) -> tuple[Source, ...]:
        """
        Makes `Sources.read` return the sources of `paths`, and returns
        them.
        """
        sources = tuple(map(declare, paths))
        monkeypatch.setattr(
            Sources,
            "read",
            classmethod(lambda cls: cls(sources=sources))
        )

        return sources

    return declare_all


@fixture
def fetched(
    data     : Path,
    declared : Callable[..., tuple[Source, ...]]
) -> Callable[..., tuple[Source, ...]]:
    """
    Builds a function that lands each file it is given, a path on
    `example.com` paired with its bytes, under the `downloads` folder of the
    data directory, records each in the manifest beside them, and declares
    them in that order, as `scotch fetch games` would leave them.
    """

    def fetch_all(*files: tuple[str, bytes]) -> tuple[Source, ...]:
        """
        Lands, records, and declares `files`, returning their sources.
        """
        downloads = data / "downloads"
        manifest  = Manifest()

        for path, body in files:
            source   = land(downloads, path, body=body)
            manifest = manifest.recording(
                source.address,
                Download.from_file(source.path(downloads), etag=None)
            )

        manifest.write(downloads)

        return declared(*(path for path, _ in files))

    return fetch_all
