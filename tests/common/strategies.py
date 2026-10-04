"""
Holds the Hypothesis strategies a property test draws its games from, as
boards python-chess plays out or as the `Game` records built from them.
"""

from chess                 import Board
from chess.pgn             import Headers
from hypothesis.strategies import DrawFn, SearchStrategy, composite, integers, sampled_from

from scotch.games.schemas import Game


@composite
def played(draw: DrawFn, plies: int = 60, width: int | None = None) -> Board:
    """
    Draws a board holding up to `plies` legal moves played from the starting
    position, stopping early once no move is legal.

    Each move is drawn from the first `width` legal moves python-chess
    generates, or from every legal move where `width` is `None`, so a
    narrow `width` draws games that share and transpose into one another's
    positions.
    """
    board = Board()

    for _ in range(draw(integers(0, plies))):
        if legal := list(board.legal_moves)[:width]:
            board.push(draw(sampled_from(legal)))

    return board


def games(plies: int = 60, width: int | None = None) -> SearchStrategy[Game]:
    """
    Draws the `Game` record of a board `played` draws, under the Seven Tag
    Roster python-chess fills with its placeholders.
    """
    return played(plies, width).map(
        lambda board: Game(errors=(), moves=board.move_stack, tags=dict(Headers()))
    )
