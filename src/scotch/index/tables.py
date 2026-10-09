"""
Holds `PositionIndex`, the two Apache Parquet tables a match reads, one of
the stored games and one of every position they reach keyed by its Zobrist
hash, beside the `Batch` of games each fetched file holds, which `scotch
index games` merges into one index.
"""

from chess           import Move
from collections.abc import Iterable
from dataclasses     import dataclass
from pathlib         import Path
from polars          import (
    DataFrame,
    LazyFrame,
    col,
    concat,
    concat_list,
    int_ranges,
    lit,
    struct
)
from typing          import Self

from scotch.games.schemas   import Game
from scotch.index.schemas   import GAMES, Match, POSITIONS, ROWS, RUNS, Span, TABLES
from scotch.sources.schemas import Source


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
        Builds both tables from `games` in the order it yields them. A game
        whose `boards` yields no board keeps its row in `games`, its errors
        included, and holds none in `positions`.
        """
        return cls.number(cls.rows(games))

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
            origin = row["origin"],
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
    def merge(cls, batches: Iterable[Batch]) -> Self:
        """
        Builds both tables from the games each batch lays out, in the order
        `batches` yields them, keeping a game several batches repeat once,
        in the first batch holding it. Two games are the same where their
        Seven Tag Roster and their moves are.
        """
        # `concat` raises on no frame, so an empty frame under `ROWS` leads the list.
        return cls.number(
            concat((DataFrame(schema=ROWS), *(batch.rows for batch in batches))).filter(
                struct("moves", "roster").is_first_distinct()
            )
        )

    @classmethod
    def number(cls, rows: DataFrame) -> Self:
        """
        Numbers the games `rows` holds in order as the `game` column and
        splits them into both tables, one row of `positions` for each key a
        game's `keys` holds, beside the move played from that position.
        """
        frame = rows.lazy().with_row_index("game")

        return cls(
            games     = frame.select(GAMES.schema.names()),
            positions = frame.select(
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

    @classmethod
    def read(cls, directory: Path) -> Self:
        """
        Scans each table from its file in `directory` through `Table.scan`,
        which raises where a file is missing or holds other columns.
        """
        return cls(**{table.name: table.scan(directory) for table in TABLES})

    @staticmethod
    def rows(games: Iterable[Game]) -> DataFrame:
        """
        Lays `games` out one row each under the columns `ROWS` declares,
        reading the `Result` tag python-chess's reader fills where a file
        leaves it out.
        """
        return DataFrame(
            [
                {
                    "errors" : game.errors,
                    "keys"   : game.keys,
                    "moves"  : [move.uci() for move in game.moves],
                    "origin" : game.origin.model_dump() if game.origin else None,
                    "result" : game.tags["Result"],
                    "roster" : game.roster,
                    "tags"   : [
                        {"name": name, "value": value}
                        for name, value in game.tags.items()
                        if name != "Result"
                    ]
                }
                for game in games
            ],
            schema = ROWS
        )

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


@dataclass(frozen=True, kw_only=True)
class Batch:
    """
    The games the fetched file of `source` holds, those python-chess reads
    with no problem laid out as `rows` under the columns `ROWS` declares and
    the rest kept apart as `left` for a report.
    """

    left   : tuple[Game, ...]
    rows   : DataFrame
    source : Source

    @property
    def summary(self) -> str:
        """
        Writes the count of games read from the file, then one line for
        each problem of a game left out naming its place in the file and
        its players.
        """
        count = self.rows.height + len(self.left)

        return "\n".join(
            (
                f"Read {count:,} {'game' if count == 1 else 'games'} from"
                f" {self.source.address}",
                *(
                    f"Left out game {game.origin.place:,} of {game.origin.address},"
                    f" {game.players}: {problem}"
                    for game in self.left
                    for problem in game.problems
                )
            )
        )

    @classmethod
    def read(cls, directory: Path, source: Source) -> Self:
        """
        Reads the games of the file `source` declares, fetched under
        `directory`, leaving out each game whose `problems` hold anything.
        """
        games = list(source.games(directory))

        return cls(
            left   = tuple(game for game in games if game.problems),
            rows   = PositionIndex.rows(game for game in games if not game.problems),
            source = source
        )
