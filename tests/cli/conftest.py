"""
Defines the fixtures the tests of `scotch.cli` share, each described where
it is defined.
"""

from collections.abc import Callable, Collection, Iterable
from common.games    import line
from common.sample   import Sample
from common.sources  import declare, land
from cyclopts        import App
from datetime        import date
from pathlib         import Path
from pytest          import MonkeyPatch, fixture
from shutil          import copyfile
from types           import SimpleNamespace
from typing          import Self

from scotch.docs.inventory  import Outputs
from scotch.docs.outputs    import Document
from scotch.games.schemas   import Game, Origin
from scotch.index.tables    import PositionIndex
from scotch.pins.schemas    import Lift
from scotch.pins.trees      import Tree
from scotch.sources.schemas import Download, Manifest, Source, Sources


@fixture
def bibliography(bibtex: Path, monkeypatch: MonkeyPatch, tmp_path: Path) -> Path:
    """
    Points the project's root `scotch cite source` reads at a directory
    whose `docs/references.bib` holds the three sources of `bibtex`.
    """
    (tmp_path / "docs").mkdir()
    copyfile(bibtex, tmp_path / "docs" / "references.bib")
    monkeypatch.setattr("scotch.cli.cite.root", lambda: tmp_path)

    return tmp_path


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
        White  = "White, W",
        origin = Origin(address="https://example.com/players/White.zip", place=1)
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
    Points the project's root at a directory holding only a `pyproject.toml`
    whose `[tool.scotch]` table moves the data to `table`.
    """
    (tmp_path / "pyproject.toml").write_text('[tool.scotch]\ndata = "table"\n')
    monkeypatch.setattr("scotch.cli.settings.root", lambda: tmp_path)

    return tmp_path


@fixture
def shipped(
    monkeypatch : MonkeyPatch,
    tmp_path    : Path
) -> list[tuple[Path, Path, PositionIndex | None]]:
    """
    Points the project's root `scotch render docs` reads at a copy of the
    sample checkout and makes `Outputs.shipped` declare one file written
    from the declarations and one written from the index where one is given,
    recording the README, the root, and the index each call was given.
    """
    given = []
    root  = Sample.copy(tmp_path / "root").root

    def record(
        cls    : type[Outputs],
        app    : App,
        readme : Path,
        root   : Path,
        index  : PositionIndex | None = None
    ) -> Self:
        """
        Records the README, the root, and the index it is given, and
        declares `declared.txt`, beside `measured.txt` where an index is
        given.
        """
        given.append((readme, root, index))

        return cls(
            [
                Document(path=Path("declared.txt"), render=lambda: "declared\n"),
                *(
                    [Document(path=Path("measured.txt"), render=lambda: "m\n")]
                    if index
                    else []
                )
            ]
        )

    monkeypatch.setattr("scotch.cli.render.root", lambda: root)
    monkeypatch.setattr(Outputs, "shipped", classmethod(record))

    return given


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


@fixture
def lagging(
    monkeypatch : MonkeyPatch,
    sample      : Sample
) -> Callable[..., tuple[list[tuple[tuple[str, ...], str, bool]], list[bytes]]]:
    """
    Builds a function that points the project's root `scotch lift pins`
    reads at the sample checkout, makes the command read the lifts it is
    given on 2026-10-23, and stands in for each attempt at a lift, which
    fails where it lifts a pin `breaking` names and otherwise returns the
    names it lifts as its diff. The function returns the attempts made, each
    as the names lifted, the log's name, and whether it was checked, beside
    each diff applied to the checkout.
    """

    def lag(
        lifts    : Iterable[Lift],
        breaking : Collection[str] = ()
    ) -> tuple[list[tuple[tuple[str, ...], str, bool]], list[bytes]]:
        """
        Makes the command read `lifts`, every attempt lifting a pin
        `breaking` names failing.
        """
        attempts, applied = [], []

        def attempt(
            self    : Tree,
            lifted  : Collection[Lift],
            log     : Path,
            *,
            checked : bool
        ) -> bytes | None:
            """
            Records the attempt and returns the names it lifts as its diff,
            or `None` where it lifts a breaking pin.
            """
            names = tuple(lift.name for lift in lifted)
            attempts.append((names, log.name, checked))

            return None if set(names) & set(breaking) else ",".join(names).encode()

        def apply(self: Tree, patch: bytes) -> tuple[str, ...]:
            """
            Records the diff and names the one file it changes.
            """
            applied.append(patch)

            return ("pyproject.toml",)

        listed = tuple(lifts)
        monkeypatch.setattr("scotch.cli.lift.root", lambda: sample.root)
        monkeypatch.setattr(
            "scotch.cli.lift.Pins",
            SimpleNamespace(
                __subclasses__ = lambda: [
                    lambda tree: SimpleNamespace(lifts=lambda: iter(listed))
                ]
            )
        )
        monkeypatch.setattr(
            "scotch.cli.lift.date",
            SimpleNamespace(today=lambda: date(2026, 10, 23))
        )
        monkeypatch.setattr(Tree, "apply", apply)
        monkeypatch.setattr(Tree, "attempt", attempt)

        return attempts, applied

    return lag
