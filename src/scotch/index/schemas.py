"""
Holds the records a match travels in, meaning the `Span` of positions two
games share, the `Match` a `PositionIndex` finds for a submitted game, and
the `Export` that `scotch match game --json` writes for the site's viewer,
beside the `Table` each of the index's Parquet tables is declared as, the
declarations `GAMES` and `POSITIONS` that `TABLES` lists, `ROWS`, the schema
of the games `PositionIndex.rows` lays out before the index numbers them,
and `RUNS`, the schema of the runs `PositionIndex.runs` finds.
"""

from dataclasses import dataclass
from pathlib     import Path
from polars            import (
    Int64,
    LazyFrame,
    List,
    Schema,
    String,
    Struct,
    UInt16,
    UInt32,
    UInt64,
    read_parquet_schema,
    scan_parquet
)
from polars.exceptions import SchemaError
from pydantic          import BaseModel, NonNegativeInt, PositiveInt
from typing            import Self

from scotch.games.schemas import Game


@dataclass(frozen=True, kw_only=True)
class Table:
    """
    One Parquet table of the index, meaning the name of the file `scan`
    reads and `sink` writes in a directory, the columns it holds, and the
    number of rows to each row group it is written in.
    """

    name           : str
    schema         : Schema
    row_group_size : int | None = None

    def path(self, directory: Path) -> Path:
        """
        Names the table's Parquet file in `directory`.
        """
        return directory / f"{self.name}.parquet"

    def scan(self, directory: Path) -> LazyFrame:
        """
        Scans the table from its file in `directory` under `schema`, which
        the file's own columns are held to first.

        Raises:
            FileNotFoundError : Where the file is missing.
            SchemaError       : Where the file's columns differ from
                                `schema`.
        """
        path = self.path(directory)

        if (found := read_parquet_schema(path)) != self.schema:
            raise SchemaError(f"{path} holds {found} rather than {self.schema}")

        return scan_parquet(path, schema=self.schema)

    def sink(self, directory: Path, frame: LazyFrame):
        """
        Writes `frame` to the table's file in `directory`, creating the
        directory where it is missing, with `row_group_size` rows to a
        group.
        """
        frame.sink_parquet(
            self.path(directory),
            mkdir          = True,
            row_group_size = self.row_group_size
        )


GAMES = Table(
    name           = "games",
    row_group_size = 4096,  # A filter on `game` then decodes one row group alone.
    schema         = Schema(
        [
            # The game's place in the index's order, from 0
            ("game", UInt32),
            # Each error python-chess's reader recorded
            ("errors", List(String)),
            # The mainline in Universal Chess Interface (UCI) notation
            ("moves", List(String)),
            # The file the game was read from and its place there, as `Origin` holds it
            ("origin", Struct({"address": String, "place": UInt32})),
            # The `Result` tag
            ("result", String),
            # Every other tag pair, each as a `name` and a `value`
            ("tags", List(Struct({"name": String, "value": String})))
        ]
    )
)
POSITIONS = Table(
    name   = "positions",
    schema = Schema(
        [
            # The stored game reaching the position
            ("game", GAMES.schema["game"]),
            # The position's Zobrist hash, as `Game.keys` reads it
            ("key", UInt64),
            # The move in UCI played from the position, null at the game's last position
            ("move", String),
            # The position's place in the mainline, 0 being the starting position
            ("ply", UInt16)
        ]
    )
)
ROWS = Schema(
    {
        **{name: dtype for name, dtype in GAMES.schema.items() if name != "game"},
        # The keys of the mainline's positions, as `Game.keys` reads them
        "keys": List(POSITIONS.schema["key"]),
        # The values of the Seven Tag Roster, as `Game.roster` reads them
        "roster": List(String)
    }
)
RUNS = Schema(
    [
        ("game", GAMES.schema["game"]),
        ("offset", Int64),
        ("start", Int64),
        ("length", UInt32)
    ]
)
TABLES = (GAMES, POSITIONS)


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
        two games share behind its move number, or `None` where the stored
        game ends there.
        """
        if (ply := self.span.stored[-1]) < len(self.game.moves):
            return self.game.numbered(ply)

        return None

    @property
    def summary(self) -> str:
        """
        Writes the stored game's players, event, and date, its place in the
        file it was read from where the index records one, the plies the two
        games share, and the move where they part, one to a line.
        """
        tags = self.game.tags

        return "\n".join(
            (
                f"{self.game.players}, {tags['Event']}, {tags['Date']}",
                *(
                    [f"Game {origin.place:,} of {origin.address}"]
                    if (origin := self.game.origin)
                    else []
                ),
                (
                    f"Shares {self.span.length} positions, plies"
                    f" {self.span.submitted[0]} to {self.span.submitted[-1]} of the"
                    f" submitted game and plies {self.span.stored[0]} to"
                    f" {self.span.stored[-1]} of the stored game"
                )
                if self.span.length > 1
                else (
                    f"Shares 1 position, ply {self.span.submitted[0]} of the submitted"
                    f" game and ply {self.span.stored[0]} of the stored game"
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
