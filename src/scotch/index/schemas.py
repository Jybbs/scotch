"""
Holds the records a match travels in, meaning the `Span` of positions two
games share, the `Match` a `PositionIndex` finds for a submitted game, and
the `Export` that `scotch match game --json` writes for the site's viewer.
"""

from pydantic import BaseModel, NonNegativeInt, PositiveInt
from typing   import Self

from scotch.games.schemas import Game


class Side(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One game of a match as the site's viewer reads it.
    """

    headers: dict[str, str]
    """
    The value of each tag pair keyed by its name.
    """

    moves: tuple[str, ...]
    """
    The moves of the mainline in Standard Algebraic Notation (SAN).
    """

    placements: tuple[str, ...]
    """
    The piece placement of each position from the start, one more than the
    moves.
    """

    @classmethod
    def from_game(cls, game: Game) -> Self:
        """
        Reads the headers, the moves, and the placements of `game`.
        """
        return cls(headers=game.tags, moves=game.sans, placements=game.placements)


class Span(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The unbroken run of positions two games share, along which the submitted
    game's ply and the stored game's ply advance together.
    """

    length: PositiveInt
    """
    The number of positions the run holds.
    """

    offset: int
    """
    The stored game's ply minus the submitted game's ply, the same at every
    position of the run.
    """

    start: NonNegativeInt
    """
    The submitted game's ply at the first position of the run.
    """

    @property
    def stored(self) -> range:
        """
        Lists the stored game's plies along the run.
        """
        return range(self.start + self.offset, self.start + self.offset + self.length)

    @property
    def submitted(self) -> range:
        """
        Lists the submitted game's plies along the run.
        """
        return range(self.start, self.start + self.length)


class Match(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The stored game sharing the longest unbroken run of positions with a
    submitted game.
    """

    game: Game
    """
    The stored game.
    """

    span: Span
    """
    The run of positions the stored game shares with the submitted game.
    """

    ties: NonNegativeInt
    """
    The number of other stored games sharing a run as long.
    """

    @property
    def parting(self) -> str | None:
        """
        Writes the move the stored game played from the last position the
        two games share, behind its move number, or `None` where the stored
        game ends at that position.
        """
        if (ply := self.span.stored[-1]) < len(self.game.moves):
            return self.game.numbered(ply)

        return None

    @property
    def summary(self) -> str:
        """
        Writes the stored game's players, event, and date, the plies the two
        games share, and the move where they part, one to a line.
        """
        tags = self.game.tags

        return "\n".join(
            (
                f"{tags['White']} vs. {tags['Black']}, {tags['Event']}, {tags['Date']}",
                (
                    f"Shares {self.span.length} positions, plies"
                    f" {self.span.submitted[0]} to {self.span.submitted[-1]} of the"
                    f" submitted game and plies {self.span.stored[0]} to"
                    f" {self.span.stored[-1]} of the stored game"
                ),
                f"Parts where the stored game played {parting}"
                if (parting := self.parting)
                else "Parts where the stored game ends"
            )
        )


class Export(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    A submitted game beside the stored game it matched, as the site's viewer
    reads it from JSON.
    """

    submitted: Side
    """
    The submitted game.
    """

    span: Span | None = None
    """
    The run of positions the two games share, or `None` where no stored game
    shares a position with the submitted game.
    """

    stored: Side | None = None
    """
    The stored game, or `None` where no stored game shares a position with
    the submitted game.
    """

    @classmethod
    def from_match(cls, match: Match | None, submitted: Game) -> Self:
        """
        Reads `submitted` and the stored game `match` holds, leaving the
        stored side and the span empty where `match` is `None`.
        """
        if match is None:
            return cls(submitted=Side.from_game(submitted))

        return cls(
            span      = match.span,
            stored    = Side.from_game(match.game),
            submitted = Side.from_game(submitted)
        )
