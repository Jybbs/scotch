"""
Holds `PositionIndex`, the two Apache Parquet tables a match reads, one of
the stored games and one of every position they reach keyed by its Zobrist
hash.
"""

from chess           import Move
from collections.abc import Iterable
from dataclasses     import dataclass, field, fields
from pathlib         import Path
from polars          import (
    DataFrame,
    Int64,
    LazyFrame,
    List,
    String,
    Struct,
    UInt16,
    UInt32,
    UInt64,
    col,
    concat_list,
    int_ranges,
    lit,
    scan_parquet
)
from typing          import Self

from scotch.games.schemas import Game
from scotch.index.schemas import Match, Span


@dataclass(frozen=True, kw_only=True)
class PositionIndex:
    """
    Holds the stored games and every position they reach, each table a
    Polars `LazyFrame` that `read` scans from a Parquet file of the same
    name.

    `games` holds one row per stored game, in the order the index
    holds them:

    - `game`, the game's place in that order, from 0
    - `errors`, each error python-chess's reader recorded
    - `moves`, the mainline in Universal Chess Interface (UCI) notation
    - `result`, the `Result` tag
    - `tags`, every tag pair but `Result`, each as a `name` and a `value`

    `positions` holds one row per position each game reaches:

    - `game`, the stored game reaching it
    - `key`, the position's Zobrist hash, as `Game.keys` reads it
    - `move`, the move in UCI played from it, null at the game's last position
    - `ply`, its place in that game's mainline, 0 being the starting position
    """

    positions: LazyFrame
    # `4096` games to a row group, so a filter on `game` decodes one group alone.
    games: LazyFrame = field(metadata={"row_group_size": 4096})

    @classmethod
    def build(cls, games: Iterable[Game]) -> Self:
        """
        Builds both tables from `games`, holding them in the order `games`
        yields them, each game carrying the `Result` tag python-chess's
        reader fills where a file leaves it out. A game whose `boards`
        yields no board keeps its row in `games`, its errors included, and
        holds no row in `positions`.
        """
        frame = DataFrame(
            [
                {
                    "errors" : game.errors,
                    "keys"   : game.keys,
                    "moves"  : [move.uci() for move in game.moves],
                    "result" : game.tags["Result"],
                    "tags"   : [
                        {"name": name, "value": value}
                        for name, value in game.tags.items()
                        if name != "Result"
                    ]
                }
                for game in games
            ],
            schema = {
                "errors" : List(String),
                "keys"   : List(UInt64),
                "moves"  : List(String),
                "result" : String,
                "tags"   : List(Struct({"name": String, "value": String}))
            }
        ).with_row_index("game")

        return cls(
            games     = frame.drop("keys").lazy(),
            positions = frame.lazy().select(
                "game",
                key  = col("keys"),
                move = concat_list("moves", lit(None, dtype=String)).list.head(
                    col("keys").list.len()
                ),
                ply = int_ranges(0, col("keys").list.len(), dtype=UInt16)
            ).explode("key", "move", "ply", empty_as_null=False)
        )

    def game(self, number: int) -> Game:
        """
        Reads back the stored game at `number` in the order the index holds
        them.
        """
        row = (
            self.games.filter(col("game") == lit(number, dtype=UInt32))
                .collect()
                .row(0, named=True)
        )

        return Game(
            errors = row["errors"],
            moves  = map(Move.from_uci, row["moves"]),
            tags   = {pair["name"]: pair["value"] for pair in row["tags"]} | {
                "Result": row["result"]
            }
        )

    def match(self, submitted: Game) -> Match | None:
        """
        Finds the stored game sharing the longest unbroken run of positions
        with `submitted`, reading the first of the runs `runs` ranks and
        counting the other stored games sharing a run as long.

        Returns:
            The match, or `None` where no stored game holds any position
            `submitted` reaches.
        """
        if (runs := self.runs(submitted)).is_empty():
            return None

        best = runs.row(0, named=True)

        return Match(
            game = self.game(best["game"]),
            span = Span(
                length = best["length"],
                offset = best["offset"],
                start  = best["start"]
            ),
            ties = (
                runs.filter(col("length") == best["length"])
                    .get_column("game")
                    .n_unique()
            ) - 1
        )

    @classmethod
    def read(cls, directory: Path) -> Self:
        """
        Scans each table from the Parquet file in `directory` named for it.

        Raises:
            FileNotFoundError: Where either file is missing.
        """
        tables = {
            table.name: scan_parquet(directory / f"{table.name}.parquet")
            for table in fields(cls)
        }

        for table in tables.values():
            table.collect_schema()

        return cls(**tables)

    def runs(self, submitted: Game) -> DataFrame:
        """
        Finds every unbroken run of positions a stored game shares with
        `submitted`, meaning a run along which the submitted game's ply and
        the stored game's ply advance together, so their difference stays
        the same and the run never leaves one stored game.

        Sorting the shared positions by game, offset, and the submitted
        game's ply leaves each run on consecutive rows, where that ply less
        the row's place stays the same along the run.

        Returns:
            One row per run, holding its `game`, its `offset`, its `start`,
            and its `length`, the longest first, then the one starting
            earliest in `submitted`, then the one in the stored game the index
            holds first, then the one starting earliest in that game.
        """
        keys = DataFrame(
            {"key": submitted.keys},
            schema = {"key": UInt64}
        ).with_row_index("start")

        return (
            self.positions
            .filter(col("key").is_in(keys.get_column("key").implode()))
            .join(keys.lazy(), on="key")
            .with_columns(
                col("start").cast(Int64),
                offset = col("ply").cast(Int64) - col("start")
            )
            .sort("game", "offset", "start")
            .with_row_index("row")
            .group_by("game", "offset", run=col("start") - col("row"))
            .agg(col("start").first(), length=col("start").len())
            .drop("run")
            .sort(
                "length",
                "start",
                "game",
                "offset",
                descending = [True, False, False, False]
            )
            .collect()
        )

    def write(self, directory: Path):
        """
        Writes each table to a Parquet file in `directory` named for it,
        creating `directory` where it is missing.
        """
        for table in fields(self):
            getattr(self, table.name).sink_parquet(
                directory / f"{table.name}.parquet",
                mkdir          = True,
                row_group_size = table.metadata.get("row_group_size")
            )
