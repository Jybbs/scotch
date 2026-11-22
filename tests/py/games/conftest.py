"""
Defines the fixtures the tests of `scotch.games` share, each described where
it is defined.
"""

from collections.abc import Callable
from common.games    import KNOWN
from pathlib         import Path
from pytest          import FixtureRequest, fixture

from scotch.games.schemas import Game


@fixture
def read(pgn: Callable[..., Path]) -> Callable[..., list[Game]]:
    """
    Builds a reader that writes PGN text through `pgn` and reads back every
    game the file holds.
    """

    def games(text: str, encoding: str = "utf-8") -> list[Game]:
        """
        Reads every game `text` holds once `pgn` writes it in `encoding`.
        """
        return list(Game.read(pgn(text, encoding)))

    return games


@fixture(ids=list(KNOWN), params=KNOWN.values())
def replayed(request: FixtureRequest) -> Game:
    """
    Passes each game `KNOWN` holds to a case of its own, run under the
    game's key in `KNOWN`.
    """
    return request.param
