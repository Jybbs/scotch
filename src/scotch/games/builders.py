"""
Holds `MainlineBuilder`, the python-chess visitor `Game.read` builds each
game through.
"""

from chess.pgn import GameBuilder, SKIP, SkipType


class MainlineBuilder(GameBuilder):
    """
    Builds a game from its mainline alone, skipping every variation, since
    `read_game` in python-chess 1.11.2 keeps the board of a variation
    holding an illegal move once that variation closes and reads every later
    move of the mainline against that board.
    """

    def begin_variation(self) -> SkipType:
        """
        Skips the variation opening here, so the reader pushes no board
        for it.
        """
        return SKIP

    def end_variation(self):
        """
        Leaves the game as it stands, since the builder entered no
        variation.
        """

    def handle_error(self, error: Exception):
        """
        Appends `error` to the errors of the game being built, leaving
        out the entry python-chess's own builder writes to the `chess.pgn`
        logger for each one.
        """
        self.game.errors.append(error)
