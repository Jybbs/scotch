"""
Holds `line`, which builds a `Game` record from a line of moves in Standard
Algebraic Notation (SAN) for a test to read.
"""

from chess.pgn import Headers

from scotch.games.schemas import Game, Origin


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

