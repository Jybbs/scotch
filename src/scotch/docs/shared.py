"""
Holds `Shared`, how far the stored games share their positions with one
another as `Census.shared` counts them from the index, beside the `Parting`
of one group of games, the `Crowd` of positions some range of games reaches,
and the `Line` of opening moves the Shared Positions page draws as a tree,
whose properties write the tables that page sets beneath its figures and the
figures it sets inside its sentences.
"""

from chess           import Board, Move
from collections.abc import Sequence
from pydantic        import BaseModel, NonNegativeInt, computed_field
from typing          import Self

from scotch.docs.tallies import ended, markdown, notated


class Crowd(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The positions the index holds that from `low` to `high` stored games
    reach.
    """

    high: NonNegativeInt
    """
    The most stored games reaching a position the row counts.
    """

    keys: NonNegativeInt
    """
    The count of distinct positions so many games reach.
    """

    low: NonNegativeInt
    """
    The fewest stored games reaching a position the row counts.
    """

    stood: NonNegativeInt
    """
    The count of the positions the stored games stand in that the row's
    positions make up, a position reached by 12 games counting 12 times.
    """

    @property
    def name(self) -> str:
        """
        Names the range of games, such as `11 to 20` or `1`.
        """
        return (
            f"{self.low:,}"
            if self.low == self.high
            else f"{self.low:,} to {self.high:,}"
        )

    def crowded(self, crowd: int) -> bool:
        """
        Reports whether more than `crowd` stored games besides any one of
        them reach every position the row counts.
        """
        return self.low > crowd + 1


class Line(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One line of opening moves from the standard starting position, beside
    the stored games playing it.
    """

    games: NonNegativeInt
    """
    The count of the stored games playing the line's moves in its order.
    """

    reach: NonNegativeInt
    """
    The count of the stored games reaching that position by any order of
    moves.
    """

    sans: list[str]
    """
    The line's moves in Standard Algebraic Notation (SAN).
    """

    @classmethod
    def from_uci(cls, games: int, moves: Sequence[str], reach: int) -> Self:
        """
        Plays `moves`, each in UCI notation, from the standard starting
        position, beside the `games` playing them in order and the `reach`
        reaching their position by any order.
        """
        board = Board()

        return cls(
            games = games,
            reach = reach,
            sans  = [board.san_and_push(Move.from_uci(uci)) for uci in moves]
        )

    @computed_field
    @property
    def placement(self) -> str:
        """
        Plays the line from the standard starting position.

        Returns:
            The piece placement of the position the line reaches, the first
            field of its Forsyth–Edwards Notation (FEN).
        """
        board = Board()

        for san in self.sans:
            board.push_san(san)

        return board.board_fen()


class Parting(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The games of one decade, of the decades before the first one named, or
    of the whole store, counted by the move each first stands in a position
    no stored game reaches save its copies, a copy of a game being a stored
    game that plays its whole mainline, the game itself among them.
    """

    alone: list[NonNegativeInt]
    """
    The count of the games first standing alone at each move from 0, a
    move counting White's and Black's reply as one, so ply 7 falls in move
    4.
    """

    games: NonNegativeInt
    """
    The count of the games, those never standing alone among them.
    """

    name: str
    """
    The name of the group, such as `1980s`.
    """

    playing: list[NonNegativeInt]
    """
    The count of the games still standing in a position at each move from
    0, reading the position once Black has replied.
    """

    sharing: list[NonNegativeInt]
    """
    The count of the games standing at each move from 0 in a position a
    stored game other than their copies reaches.
    """

    def by(self, share: float) -> int | None:
        """
        Finds the fewest moves by which at least `share` of the games stand
        alone, or `None` where the games standing alone by any move fall
        short of it.
        """
        found = ended([*self.alone, self.games - sum(self.alone)], share)

        return found if found < len(self.alone) else None

    @computed_field
    @property
    def half(self) -> int | None:
        """
        Finds the move by which half the games stand alone.
        """
        return self.by(0.5)

    def shares(self, move: int) -> float | None:
        """
        Finds the share of the games still playing at `move` that stand in a
        position another stored game reaches, or `None` where no game plays
        to `move`.
        """
        if move < len(self.playing) and self.playing[move]:
            return self.sharing[move] / self.playing[move]

        return None


class Shared(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    How far the stored games share their positions with one another, for
    the whole store and for each decade, beside the positions counted by the
    stored games reaching each and the opening lines the most games play.
    """

    crowd: NonNegativeInt
    """
    The count of other stored games past which a position counts as
    crowded.
    """

    decades: list[Parting]
    """
    The games of the decades before the first one named together, then of
    each decade, the earliest first, leaving out the undated games.
    """

    every: Parting
    """
    Every stored game, dated or not.
    """

    lines: list[Line]
    """
    The opening lines the most games play, each listed after the line one
    move shorter it extends.
    """

    reach: list[Crowd]
    """
    The positions the index holds by how many stored games reach each, in
    ranges of 1, 2, and 5 times a power of ten split one past the crowd,
    the fewest first.
    """

    @property
    def crowding(self) -> str:
        """
        Writes a table of the positions by how many stored games reach each,
        each range beside its share of the distinct positions and of the
        positions the stored games stand in, marking each range past the
        crowd, then a table of each opening line the tree draws beside the
        games playing it and the games reaching its position.
        """
        return "\n\n".join(
            (
                markdown(
                    headers = (
                        "Games Reaching", "Positions", "Share", "Stood In", "Crowded"
                    ),
                    rows = (
                        (
                            crowd.name,
                            f"{crowd.keys:,}",
                            f"{crowd.keys / self.positions:.2%}",
                            f"{crowd.stood / self.stood:.1%}",
                            "Yes" if crowd.crowded(self.crowd) else "No"
                        )
                        for crowd in self.reach
                    )
                ),
                markdown(
                    headers = ("Line", "Playing It", "Reaching It"),
                    rows    = (
                        (
                            f"`{notated(line.sans)}`",
                            f"{line.games:,}",
                            f"{line.reach:,}"
                        )
                        for line in self.lines
                    )
                )
            )
        )

    @property
    def figures(self) -> dict[str, str]:
        """
        Writes each figure the Shared Positions page sets inside its
        sentences, meaning the move by which half of every stored game
        stands alone, the shares of the games still playing that share a
        position at moves 10 and 20, the share of the distinct positions a
        single game reaches, and the share of the positions the stored games
        stand in that lie past the crowd.
        """
        once = next((crowd.keys for crowd in self.reach if crowd.high == 1), 0)

        return {
            "alone-half"    : "" if self.every.half is None else str(self.every.half),
            "crowded-stood" : f"{
                sum(crowd.stood for crowd in self.reach if crowd.crowded(self.crowd))
                / self.stood:.0%}",
            "once"          : f"{once / self.positions:.0%}",
            **{
                f"sharing-{move}": "" if share is None else f"{share:.0%}"
                for move in (10, 20)
                for share in (self.every.shares(move),)
            }
        }

    @property
    def parting(self) -> str:
        """
        Writes a table of every fifth move each stored game still plays,
        each beside the games still playing, the share of them that share
        a position there, and the share of every stored game first standing
        alone there.
        """
        every = self.every

        return markdown(
            headers = ("Move", "Still Playing", "Sharing", "Parting There"),
            rows    = (
                (
                    str(move),
                    f"{every.playing[move]:,}",
                    f"{every.shares(move):.1%}",
                    f"{every.alone[move] / every.games:.1%}"
                )
                for move in range(0, len(every.alone), 5)
                if every.playing[move]
            )
        )

    @property
    def partings(self) -> str:
        """
        Writes a table of the games of each decade beside the move by which
        half of them stand alone and the moves the middle half of them part
        between, a move no share reaches written as a dash.
        """
        said = lambda move: "–" if move is None else str(move)

        return markdown(
            headers = ("Decade", "Games", "Half Alone By", "Middle Half"),
            rows    = (
                (
                    parting.name,
                    f"{parting.games:,}",
                    said(parting.half),
                    f"{said(parting.by(0.25))} to {said(parting.by(0.75))}"
                )
                for parting in self.decades
            )
        )

    @property
    def positions(self) -> int:
        """
        Counts the distinct positions the index holds.
        """
        return sum(crowd.keys for crowd in self.reach)

    @property
    def stood(self) -> int:
        """
        Counts the positions the stored games stand in, a position reached
        by 12 games counting 12 times.
        """
        return sum(crowd.stood for crowd in self.reach)
