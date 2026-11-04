"""
Holds the records a command reads a match or a position through:

- `Span`, the positions two games share
- `Match`, what a `PositionIndex` finds for a submitted game
- `Export`, what `scotch match game --json` writes for the Viewer
- `Answer`, what `scotch show position` prints for a position

The Polars schemas sit beside them, meaning `GAMES`, the index's Parquet
table of stored games, `ROWS`, the games `PositionIndex.rows` lays out
before the index numbers them, and `RUNS`, the runs `PositionIndex.runs`
finds.
"""

from base64   import urlsafe_b64encode
from polars   import Binary, Int64, List, Schema, String, Struct, UInt16, UInt32
from pydantic import BaseModel, NonNegativeInt, PositiveInt
from typing   import Self
from zlib     import compress

from scotch.docs.project  import Project
from scotch.games.schemas import Game

GAMES = Schema(
    [
        # The game's place in the index's order, from 0
        ("game", UInt32),
        # Each error the reader recorded
        ("errors", List(String)),
        # The file the game was read from and its place there, as `Origin` holds it
        ("origin", Struct({"address": String, "place": UInt32})),
        # The moves of the mainline, whose positions the index keys
        ("plies", UInt16),
        # The `Result` tag
        ("result", String),
        # Every other tag pair, each as a `name` and a `value`
        ("tags", List(Struct({"name": String, "value": String})))
    ]
)
ROWS = Schema(
    {
        **{name: dtype for name, dtype in GAMES.items() if name != "game"},
        # The `Date` tag as `Game.dated` reads it
        "dated": UInt32,
        # The `FEN` tag
        "fen": String,
        # The mainline as `Game.encoded` writes it
        "moves": Binary,
        # The values of the Seven Tag Roster, as `Game.roster` reads them
        "roster": List(String),
        # The rank `Game.standing` gives the game
        "standing": UInt16,
        # The `Variant` tag
        "variant": String
    }
)
RUNS = Schema(
    [
        ("game", GAMES["game"]),
        ("offset", Int64),
        ("start", Int64),
        ("length", UInt32)
    ]
)
# The order `readers.Positions` counts outcomes in.
RESULTS = ("1-0", "1/2-1/2", "0-1", "*")


class Reply(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One move the stored games played from a position, beside how the games
    playing it ended.
    """

    outcomes: tuple[NonNegativeInt, ...]
    """
    The count of games ending in each result `RESULTS` names, in that order.
    """

    san: str
    """
    The move in Standard Algebraic Notation (SAN).
    """

    @property
    def games(self) -> int:
        """
        Counts the games playing the move.
        """
        return sum(self.outcomes)

    @property
    def line(self) -> str:
        """
        Writes the move, how many games played it, and how those games
        ended.
        """
        ended = "  ".join(
            f"{result} {count:,}"
            for result, count in zip(RESULTS, self.outcomes, strict=True)
        )

        return f"{self.san:<8}{self.games:>9,}  {ended}"


class Side(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One game of a match as the Viewer reads it.
    """

    headers: frozendict[str, str]
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


class Answer(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    What the stored games did from one position, each game reaching it
    counted once.
    """

    ended: Reply
    """
    The games ending at the position, under the name `end`.
    """

    games: tuple[Game, ...]
    """
    The newest games reaching the position, the newest first.
    """

    replies: tuple[Reply, ...]
    """
    Each move the games played from the position, the most played first.
    """

    @property
    def summary(self) -> str:
        """
        Writes the count of games reaching the position, each move with how
        those games ended, and then the newest games, one to a line.
        """
        count = sum(reply.games for reply in (*self.replies, self.ended))

        return "\n".join(
            (
                f"{count:,} stored {'game reaches' if count == 1 else 'games reach'}"
                " this position",
                *(reply.line for reply in self.replies),
                *([self.ended.line] if self.ended.games else []),
                *(["Newest first:"] if self.games else []),
                *(game.title for game in self.games)
            )
        )


class Match(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    A stored game beside the longest unbroken run of positions it shares
    with a submitted game.
    """

    game: Game
    """
    The stored game.
    """

    span: Span
    """
    The run of positions the stored game shares with the submitted game.
    """

    submitted: Game
    """
    The submitted game.
    """

    ties: NonNegativeInt
    """
    The number of stored games, past the first the index ranks for the
    submitted game, sharing a run as long as that first game's.
    """

    @property
    def before(self) -> str:
        """
        Writes the last position the two games share in Forsyth–Edwards
        Notation (FEN), as the submitted game reached it.
        """
        return self.submitted.at(self.span.submitted[-1]).fen()

    @property
    def line(self) -> str:
        """
        Writes the stored game's title beside the positions the run holds,
        on one line.
        """
        count = self.span.length

        return f"{self.game.title}, {count} {'position' if count == 1 else 'positions'}"

    @property
    def parting(self) -> str | None:
        """
        Writes the move the stored game played from the last position the
        two games share behind its move number, or `None` where the stored
        game ends there.
        """
        return self.game.numbered(self.span.stored[-1]) or None

    @property
    def played(self) -> str | None:
        """
        Writes the move the submitted game played from the last position
        the two games share behind its move number, or `None` where the
        submitted game ends there.
        """
        return self.submitted.numbered(self.span.submitted[-1]) or None

    def continuation(self, plies: int | None = None) -> str:
        """
        Writes the stored game's moves from the last position the two games
        share, at most `plies` of them, behind the game's result where they
        reach its end.
        """
        ply = self.span.stored[-1]

        return " ".join(
            filter(
                None,
                (
                    self.game.numbered(ply, plies),
                    self.game.tags["Result"]
                    if plies is None or ply + plies >= len(self.game.moves)
                    else None
                )
            )
        )

    def report(self, plies: int | None = None) -> str:
        """
        Writes the stored game's title, the plies the two games share, the
        position where they part with the move each played from it, the
        stored game's moves from there, at most `plies` of them, and the
        count of other stored games sharing a run as long, one to a line.
        """
        span  = self.span
        count = self.ties

        return "\n".join(
            (
                self.game.title,
                (
                    f"Shares {span.length} positions, plies {span.submitted[0]} to"
                    f" {span.submitted[-1]} of the submitted game and plies"
                    f" {span.stored[0]} to {span.stored[-1]} of the stored game"
                )
                if span.length > 1
                else (
                    f"Shares 1 position, ply {span.submitted[0]} of the submitted"
                    f" game and ply {span.stored[0]} of the stored game"
                ),
                f"Parts at {self.before}, where "
                + " and ".join(
                    f"the {name} game {f'played {move}' if move else 'ends'}"
                    for name, move in (
                        ("submitted", self.played),
                        ("stored", self.parting)
                    )
                ),
                f"Continues {self.continuation(plies)}",
                (
                    f"{count:,} other stored"
                    f" {'game shares' if count == 1 else 'games share'} a run as long"
                )
            )
        )


class Export(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    A submitted game beside the stored game it matched, as the Viewer reads
    it from JSON.
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

    ties: NonNegativeInt = 0
    """
    The count of other stored games sharing a run as long as the stored
    game's, 0 where none does or where no stored game shares a position.
    """

    @property
    def link(self) -> str:
        """
        Writes the address of the Viewer with the export in its fragment,
        as the JSON deflated into a ZLIB stream and encoded in unpadded
        base64url, so a browser opens the match without a file and sends a
        server none of it.
        """
        packed = urlsafe_b64encode(
            compress(self.model_dump_json().encode()),
            padded = False
        )

        return f"{Project.installed().homepage}/viewer#match={packed.decode()}"

    @classmethod
    def from_match(cls, match: Match | None, submitted: Game) -> Self:
        """
        Reads `submitted` and the stored game `match` holds beside the games
        tied with it, leaving the stored side and the span empty and the
        ties at 0 where `match` is `None`.
        """
        if match is None:
            return cls(submitted=Side.from_game(submitted))

        return cls(
            span      = match.span,
            stored    = Side.from_game(match.game),
            submitted = Side.from_game(submitted),
            ties      = match.ties
        )
