"""
Defines the fixtures the tests of `scotch.index` share, each described where
it is defined, reading the games in `fixtures/`.

`fixtures/stored.pgn` holds Kasparov–Sosonko (Tilburg 1981) and two of
Pachman–Cobo Arteaga's games (Havana 1965 and 1963), and `fixtures/demo.pgn`
plays Kasparov–Sosonko move for move through `21...b6` and then departs with
`22. c6`.
"""

from pytest  import FixtureRequest, TempPathFactory, fixture

from scotch.games.schemas import Game
from scotch.index.tables  import PositionIndex


@fixture(scope="module")
def demo(request: FixtureRequest) -> Game:
    """
    Reads the demo game.
    """
    [demo] = Game.read(request.path.parent / "fixtures" / "demo.pgn")

    return demo


@fixture(scope="module")
def index(stored: list[Game], tmp_path_factory: TempPathFactory) -> PositionIndex:
    """
    Builds the index of the stored games, writes it, and scans it back.
    """
    directory = tmp_path_factory.mktemp("store") / "index"
    PositionIndex.build(stored).write(directory)

    return PositionIndex.read(directory)


@fixture(scope="module")
def stored(request: FixtureRequest) -> list[Game]:
    """
    Reads the three stored games, Kasparov–Sosonko first.
    """
    return list(Game.read(request.path.parent / "fixtures" / "stored.pgn"))
