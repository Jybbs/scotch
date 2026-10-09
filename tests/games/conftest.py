"""
Defines the fixtures the tests of `scotch.games` share, each described where
it is defined.
"""

from collections.abc import Callable
from pathlib         import Path
from pytest          import fixture

from scotch.games.schemas import Game


@fixture(scope="session")
def read(pgn: Callable[..., Path]) -> Callable[..., list[Game]]:
    """
    Builds a reader that writes PGN text through `pgn` and reads back every
    game the file holds, spanning the session as `pgn` does.
    """

    def games(text: str, encoding: str = "utf-8") -> list[Game]:
        """
        Reads every game `text` holds once `pgn` writes it in `encoding`.
        """
        return list(Game.read(pgn(text, encoding)))

    return games
