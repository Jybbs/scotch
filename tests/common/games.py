"""
Holds `line`, which builds a `Game` record from a line of moves in Standard
Algebraic Notation (SAN) for a test to read, and `KNOWN`, the games a
parametrized case replays.
"""

from chess.pgn import Headers, read_game
from functools import partial
from pathlib   import Path

from scotch.games.schemas import Game, Origin

FIXTURES = Path(__file__).parents[1] / "index" / "fixtures"


def fixtured() -> dict[str, Game]:
    """
    Reads each game of the PGN files under `FIXTURES` through python-chess,
    keyed by the file's stem and the game's place in it counting from 1.
    """
    games = {}

    for path in sorted(FIXTURES.glob("*.pgn")):
        with path.open() as handle:
            for place, game in enumerate(iter(partial(read_game, handle), None), 1):
                games[f"{path.stem}-{place}"] = Game(
                    errors = (),
                    moves  = tuple(game.mainline_moves()),
                    tags   = dict(game.headers)
                )

    return games


def line(*sans: str, origin: Origin | None = None, **tags: str) -> Game:
    """
    Builds a game of the moves `sans` names in SAN, played from the
    position a `FEN` tag sets up or from the standard starting position.
    The game carries the tag pairs `tags` names beside the Seven Tag Roster
    python-chess fills in, and `origin` names the file it was read from.
    """
    headers = Headers(**tags)
    board   = headers.board()

    return Game(
        errors = (),
        moves  = [board.push_san(san) for san in sans],
        origin = origin,
        tags   = dict(headers)
    )


KNOWN = frozendict(
    fixtured() | {
        "en-passant"         : line("e4", "a6", "e5", "d5", "exd6"),
        "no-moves"           : line(),
        "queenside-castling" : line(
            *"d4 d5 Nc3 Nc6 Bf4 Bf5 Qd2 Qd7 O-O-O O-O-O".split()
        ),
        "underpromotion"     : line(*"a4 b5 axb5 a6 bxa6 Bb7 axb7 Nc6 bxa8=N".split())
    }
)
"""
Every game a parametrized case replays, keyed by the id the case runs
under:

- `stored-1` to `stored-3`, `demo-1`, and `viewer-1`, read from `FIXTURES`
- `en-passant`, `queenside-castling`, and `underpromotion`, each playing a
  move none of those games plays
- `no-moves`, a game holding the starting position alone
"""
