"""
Holds `Tie`, the stored games sharing one opening line in full as
`Census.tie` finds them, in the order a match shows them, beside the `Tied`
record of each, which the Tags page draws to show how a match orders games
sharing a run of one length.
"""

from chess.pgn import TAG_ROSTER
from pydantic  import BaseModel, NonNegativeInt
from typing    import Self

from scotch.docs.tallies  import markdown, numbered
from scotch.index.schemas import Match


class Tied(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One stored game sharing the tie's line, beside the moves it plays once
    the line ends.
    """

    file: str
    """
    The path of the file holding the game on the provider's site.
    """

    game: NonNegativeInt
    """
    The game's place in the index's order, from 0.
    """

    next: list[str]
    """
    The game's moves from the end of the line in Standard Algebraic Notation
    (SAN), at most `Tie.plies` of them.
    """

    placements: list[str]
    """
    The piece placement of each position from the end of the line, one more
    than the moves `next` holds.
    """

    tags: dict[str, str]
    """
    The value of each tag of the Seven Tag Roster and of the two ratings,
    keyed by its name, an empty value where the game carries none.
    """

    @property
    def title(self) -> str:
        """
        Names the game by its players and the year it was played.
        """
        return f"{self.tags['White']} – {self.tags['Black']}, {self.tags['Date'][:4]}"

    @classmethod
    def from_match(cls, match: Match, number: int, plies: int) -> Self:
        """
        Reads the stored game of `match`, which the index holds at `number`,
        and at most `plies` of its moves from the last position the match's
        run holds.
        """
        game = match.game
        end  = match.span.stored[-1]

        return cls(
            file       = game.origin.file,
            game       = number,
            next       = list(game.sans[end : end + plies]),
            placements = list(game.placements[end : end + plies + 1]),
            tags       = {
                name: game.tags.get(name, "")
                for name in (*TAG_ROSTER, "WhiteElo", "BlackElo")
            }
        )


class Tie(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The stored games sharing every position of one opening line, in the
    order a match shows them.
    """

    games: list[Tied]
    """
    The games, in the order a match shows them.
    """

    line: list[str]
    """
    The line's moves in Standard Algebraic Notation (SAN).
    """

    plies: NonNegativeInt
    """
    The most moves of each game `Tied.next` holds.
    """

    @property
    def after(self) -> str:
        """
        Writes the number of the move played once the line ends, behind a
        period for White's move or an ellipsis for Black's reply.
        """
        return f"{len(self.line) // 2 + 1}{'…' if len(self.line) % 2 else '.'}"

    @property
    def figures(self) -> dict[str, str]:
        """
        Writes each figure the Tags page sets inside its sentences about the
        tie, meaning the line in numbered moves and the games it ties.
        """
        return {
            "tie-games" : str(len(self.games)),
            "tie-line"  : f"`{numbered(self.line)}`"
        }

    @property
    def order(self) -> str:
        """
        Writes a table of the games in the order a match shows them, each
        beside its players, its ratings, and the move it plays once the
        line ends.
        """
        return markdown(
            headers = ("Place", "Game", "White Rated", "Black Rated", "Next"),
            rows    = (
                (
                    str(place),
                    tied.title,
                    tied.tags["WhiteElo"] or "–",
                    tied.tags["BlackElo"] or "–",
                    f"{self.after}{tied.next[0]}" if tied.next else "–"
                )
                for place, tied in enumerate(self.games, start=1)
            )
        )
