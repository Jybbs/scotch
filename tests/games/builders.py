"""
Pins what `MainlineBuilder` builds out of a game python-chess's reader
reads, meaning the mainline alone, every variation left out of the game.
"""

from chess.pgn import Game, read_game
from io        import StringIO

from scotch.games.builders import MainlineBuilder


def build(text: str) -> Game:
    """
    Reads the first game `text` holds through `MainlineBuilder`.
    """
    return read_game(StringIO(text), Visitor=MainlineBuilder)


def test_an_illegal_move_inside_a_variation_leaves_the_mainline_whole():
    """
    Asserts that a move illegal inside a variation leaves every move of the
    mainline after that variation read from the mainline's own position,
    with no error recorded.
    """
    game = build("1. e4 (1. d4 Qxf7) 1... e5 2. Qh5 Nc6 *\n")

    assert game.errors == []
    assert [move.uci() for move in game.mainline_moves()] == [
        "e2e4", "e7e5", "d1h5", "b8c6"
    ]


def test_variations_stay_out_of_the_game():
    """
    Asserts that the game holds the mainline alone, so the starting position
    leads to the mainline's first move and never to the variation the file
    records beside it.
    """
    game = build("1. e4 (1. d4 d5) 1... e5 *\n")

    assert [node.move.uci() for node in game.variations] == ["e2e4"]
