"""
Holds `PositionIndex`, the two Apache Parquet tables a match reads, one of
the stored games and one of every position they reach keyed by its Zobrist
hash.
"""

from chess           import Move
from collections.abc import Iterable
from dataclasses     import dataclass
from pathlib         import Path
from polars          import DataFrame, LazyFrame, List, col, concat_list, int_ranges, lit
from typing          import Self

from scotch.games.schemas import Game
from scotch.index.schemas import GAMES, Match, POSITIONS, RUNS, Span, TABLES


@dataclass(frozen=True, kw_only=True)
class PositionIndex:
    """
    Holds the stored games and every position they reach, one Polars
    `LazyFrame` per `Table` in `TABLES`, each field named for its table.
    """

    games     : LazyFrame
    positions : LazyFrame

    @classmethod
    def build(cls, games: Iterable[Game]) -> Self:
        """
        Builds both tables from `games` in the order it yields them, reading
        the `Result` tag python-chess's reader fills where a file leaves it
        out. A game whose `boards` yields no board keeps its row in `games`,
        its errors included, and holds none in `positions`.
        """
        frame = DataFrame(
            [
                {
                    "errors" : game.errors,
                    "game"   : number,
                    "keys"   : game.keys,
                    "moves"  : [move.uci() for move in game.moves],
                    "result" : game.tags["Result"],
                    "tags"   : [
                        {"name": name, "value": value}
                        for name, value in game.tags.items()
                        if name != "Result"
                    ]
                }
                for number, game in enumerate(games)
            ],
            schema = {**GAMES.schema, "keys": List(POSITIONS.schema["key"])}
        )

        return cls(
            games     = frame.drop("keys").lazy(),
            positions = frame.lazy().select(
                "game",
                key  = col("keys"),
                move = concat_list(
                    "moves",
                    lit(None, dtype=POSITIONS.schema["move"])
                ).list.head(col("keys").list.len()),
                ply = int_ranges(
                    0,
                    col("keys").list.len(),
                    dtype = POSITIONS.schema["ply"]
                )
            ).explode("key", "move", "ply", empty_as_null=False)
        )

    def game(self, number: int) -> Game:
        """
        Reads back the stored game at `number` in the order the index holds
        them.
        """
        row = (
            self.games.filter(col("game") == lit(number, dtype=GAMES.schema["game"]))
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
        with `submitted`, the first of the runs `runs` ranks, beside the
        count of other stored games sharing a run as long, or `None` where
        no stored game holds a position `submitted` reaches.
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
        Scans each table from its file in `directory` through `Table.scan`,
        which raises where a file is missing or holds other columns.
        """
        return cls(**{table.name: table.scan(directory) for table in TABLES})

    def runs(self, submitted: Game) -> DataFrame:
        """
        Finds every unbroken run of positions a stored game shares with
        `submitted`, along which the two games' plies advance together,
        sorting the shared positions by game, offset, and the submitted
        game's ply so each run holds consecutive rows where that ply less
        the row's place stays the same.

        Returns:
            One row per run under the columns `RUNS` declares, its stored
            `game` beside the fields of its `Span`, the longest first, then
            the earliest in `submitted`, then the one in the game the index
            holds first, then the earliest in that game.
        """
        keys = DataFrame(
            {"key": submitted.keys},
            schema = {"key": POSITIONS.schema["key"]}
        ).with_row_index("start")

        return (
            self.positions
            .filter(col("key").is_in(keys.get_column("key").implode()))
            .join(keys.lazy(), on="key")
            .with_columns(
                col("start").cast(RUNS["start"]),
                offset = col("ply").cast(RUNS["offset"]) - col("start")
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
        Writes each table to its file in `directory` through `Table.sink`.
        """
        for table in TABLES:
            table.sink(directory, getattr(self, table.name))
