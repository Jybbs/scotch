"""
Defines the fixtures the tests of `scotch.cli` share, each described where
it is defined.
"""

from common.games  import line
from common.sample import Sample
from pathlib       import Path
from pytest        import MonkeyPatch, fixture

from scotch.games.schemas import Game
from scotch.index.tables  import PositionIndex


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
    Builds an index holding one stored game under the data directory.
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
