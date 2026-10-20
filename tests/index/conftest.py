"""
Defines `demo`, the game the tests of `scotch.index` match against the
stored games, whereas the suite's root `conftest.py` holds `known`,
`stored`, and `index`, which locate, read, and index the games in
`fixtures/`.
"""

from pathlib import Path
from pytest  import fixture

from scotch.games.schemas import Game


@fixture(scope="module")
def demo(known: Path) -> Game:
    """
    Reads the one game `demo.pgn` holds, failing where it holds another
    count.
    """
    [demo] = Game.read(known / "demo.pgn")

    return demo


