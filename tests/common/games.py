"""
Holds `line`, which builds the `Game` record a test reads from a line of
moves in Standard Algebraic Notation (SAN).
"""

from chess.pgn import Headers

from scotch.games.schemas import Game


def line(*sans: str, **tags: str) -> Game:
    """
    Builds a game of the moves `sans` names in SAN under the tag pairs
    `tags` names beside the Seven Tag Roster python-chess fills in, played
    from the position a `FEN` tag sets up or the standard starting position.
    """
    headers = Headers(**tags)
    board   = headers.board()

    return Game(
        errors = (),
        moves  = [board.push_san(san) for san in sans],
        tags   = dict(headers)
    )

