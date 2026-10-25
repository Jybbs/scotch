"""
Defines the fixtures the tests of `scotch.docs` share, each described where
it is defined.
"""

from collections.abc import Callable, Iterable
from common.games    import line
from pathlib         import Path
from pytest          import fixture
from pytest_subprocess.fake_process import FakeProcess
from shutil import copyfile

from scotch.docs.census   import Census
from scotch.docs.project  import Project
from scotch.docs.tallies  import Archive, Era, Tally
from scotch.games.schemas import Game, Origin
from scotch.index.tables  import PositionIndex


@fixture
def archive() -> Callable[..., Archive]:
    """
    Builds a function that makes the archive record of a file holding the
    count of games it is given, fetched from a PGN Mentor address ending on
    the name it is given.
    """

    def build(games: int, name: str, decades: dict[str, int] | None = None) -> Archive:
        """
        Builds an archive of `games` games named `name`, counted in each
        decade `decades` holds.
        """
        return Archive(
            address = f"https://www.pgnmentor.com/players/{name}.zip",
            decades = decades or {},
            games   = games,
            undated = 0
        )

    return build


@fixture
def census(counted: tuple[list[Game], PositionIndex]) -> Census:
    """
    Builds the census of the five games `counted` indexes, sampling every
    one of them and counting a position crowded where more than two other
    stored games reach it.
    """
    return Census(crowd=2, index=counted[1])


@fixture(scope="module")
def counted(
    scanned: Callable[[Iterable[Game]], PositionIndex]
) -> tuple[list[Game], PositionIndex]:
    """
    Builds five short games whose counts a reader checks by hand beside the
    index of them, each read as a place in one of three files, the first
    file holding the first two games, the second the next two, and the third
    the last.

    The first, second, and fourth games open 1. Nf3 d5 2. d4 Nf6 and part
    on their fifth ply, whereas the third reaches the first game's last
    position by 1. d4 d5 2. c4 Nf6 3. Nf3, and the fifth plays 1. Ke2 from
    a position holding the two kings alone. The fourth game's `Date` tag
    carries no year.
    """
    games = [
        line(
            *sans,
            Date   = date,
            Result = result,
            origin = Origin(address=f"https://example.com/{file}.zip", place=place),
            **tags
        )
        for sans, date, result, file, place, tags in (
            (("Nf3", "d5", "d4", "Nf6", "c4"), "1985.01.01", "1-0", "X", 1, {}),
            (("Nf3", "d5", "d4", "Nf6", "Bf4"), "1987.??.??", "1/2-1/2", "X", 2, {}),
            (("d4", "d5", "c4", "Nf6", "Nf3"), "1992.03.04", "0-1", "Y", 1, {}),
            (("Nf3", "d5", "d4", "Nf6", "g3"), "????.??.??", "1-0", "Y", 2, {}),
            (
                ("Ke2",),
                "1879.05.06", "1-0", "Z", 1,
                {"FEN": "4k3/8/8/8/8/8/8/4K3 w - - 0 1", "SetUp": "1"}
            )
        )
    ]

    return games, scanned(games)


@fixture
def checkout(fp: FakeProcess, known: Path, tmp_path: Path) -> Callable[..., Path]:
    """
    Builds a writer that lays out a checkout under `tmp_path` holding the
    mark and the lockup, the bibliography, a README holding the markers
    of its badges and its install steps, each page it is given, and every
    example line, each the demo game but the Viewer's, which takes the game
    it opens on, and registers the answer git gives for the Markdown files
    it tracks, the pages the writer was given.
    """

    def write(pages: dict[str, str]) -> Path:
        """
        Writes the checkout with the text `pages` holds for each page under
        its path relative to `docs/pages/`.
        """
        docs = tmp_path / "docs"
        (docs / "assets").mkdir(parents=True)
        for asset in ("lockup", "mark"):
            (docs / "assets" / f"{asset}.svg").write_text(
                '<svg viewBox="0 0 1 1"><path fill="currentColor" d="M0 0"/></svg>'
            )
        (tmp_path / ".github").mkdir()
        (tmp_path / ".github" / "README.md").write_text(
            "<!-- badges -->\n<!-- /badges -->\n\n<!-- install -->\n<!-- /install -->\n"
        )
        (docs / "references.bib").write_text("")
        (docs / "public" / "games").mkdir(parents=True)

        for name in ("demo", "front", "methods", "viewer"):
            copyfile(
                known / ("viewer.pgn" if name == "viewer" else "demo.pgn"),
                docs / "public" / "games" / f"{name}.pgn"
            )

        for name, text in pages.items():
            (path := docs / "pages" / name).parent.mkdir(
                exist_ok = True,
                parents  = True
            )
            path.write_text(text)

        fp.register(
            ["git", "grep", fp.any()],
            occurrences = 3,
            stdout      = "\0".join(f"docs/pages/{name}" for name in pages)
        )

        return tmp_path

    return write


@fixture
def project() -> Project:
    """
    Builds the facts of a package named `scotch` that requires Python 3.14,
    served at `https://example.org` from a repository under `owner`.
    """
    return Project(
        floor      = "3.14",
        homepage   = "https://example.org",
        name       = "scotch",
        repository = "https://github.com/owner/scotch"
    )


@fixture
def tally(archive: Callable[..., Archive]) -> Tally:
    """
    Builds a tally of ten games over two decades holding 640 positions,
    the moves counted up to move 3, in the order `Census.store` lists the
    results.
    """
    return Tally(
        eras = [
            Era(decade=1850, moves=[0, 2, 1, 1]),
            Era(decade=1990, moves=[1, 1, 2, 2])
        ],
        files = [
            archive(4, "Morphy", {"1850": 4}),
            archive(6, "Kasparov", {"1990": 6})
        ],
        games     = 10,
        moves     = [[0, 0, 1, 0], [0, 1, 0, 1], [0, 1, 1, 1], [0, 0, 1, 3]],
        positions = 640,
        results   = ["*", "0-1", "1-0", "1/2-1/2"]
    )
