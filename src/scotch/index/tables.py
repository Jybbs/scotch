"""
Holds `PositionIndex`, what a match reads, meaning the Apache Parquet table
of the stored games' tags beside the file of every position they reach and
their moves, and the `Batch` of games each fetched file holds, which `scotch
index games` merges into one index.
"""

from chess           import Move
from collections.abc import Iterable
from dataclasses     import dataclass
from pathlib         import Path
from polars          import (
    DataFrame,
    LazyFrame,
    String,
    UInt8,
    col,
    concat,
    read_parquet_schema,
    scan_parquet,
    struct
)
from polars.exceptions import ComputeError, SchemaError
from typing            import Self

from scotch.games           import readers
from scotch.games.schemas   import Game, Origin
from scotch.index.schemas   import Answer, GAMES, Match, RESULTS, ROWS, RUNS, Reply, Span
from scotch.sources.schemas import Source


@dataclass(frozen=True, kw_only=True)
class PositionIndex:
    """
    Holds the stored games' tags as the Polars `LazyFrame` `GAMES`
    declares, beside every position the games reach and their moves as the
    `readers.Positions` the crate maps from its file.
    """

    games     : LazyFrame
    positions : readers.Positions

    @property
    def held(self) -> str:
        """
        Writes the count of games and of positions the index holds, as
        `scotch show store` prints it.
        """
        return (
            f"The index holds {counted(self.positions.games)} and"
            f" {self.positions.positions:,} positions"
        )

    def answer(self, position: str, top: int) -> Answer:
        """
        Reads what the stored games did from `position`, a Forsyth–Edwards
        Notation (FEN) or a line of moves from the start or from the
        position a `FEN` tag pair ahead of them sets up, listing the newest
        `top` games reaching it.

        Raises:
            ValueError: Where a FEN stops short of its first four fields or
                        names no position, or where a line of moves carries
                        a problem, a word naming no move, or more past the
                        blank line ending its moves.
        """
        fen, moves, fields = None, (), position.split()

        if fields and "/" in fields[0]:
            fen = " ".join(fields)

            if len(fields) < 4:
                raise ValueError(
                    f"The FEN {position} stops short of its first four fields, the"
                    " placement, the side to move, the castling rights, and the"
                    " en passant square, which together name a position"
                )
        elif games := tuple(Game.parse(position)):
            line, *rest = games
            fen, moves  = line.tags.get("FEN"), [move.uci() for move in line.moves]
            problems    = (
                *line.problems,
                *(f"names no move: {word!r}" for word in readers.skipped(position)),
                *(("holds more past the blank line ending its moves",) if rest else ())
            )

            if problems:
                raise ValueError(
                    "\n".join((f"Found problems in {position}:", *problems))
                )

        replies, ended, games = self.positions.tally(moves, fen, top)

        return Answer(
            ended   = Reply(outcomes=ended, san="end"),
            games   = self.listed(games),
            replies = [Reply(outcomes=outcomes, san=san) for san, outcomes in replies]
        )

    @classmethod
    def build(cls, games: Iterable[Game]) -> Self:
        """
        Builds the index from `games` in the order it yields them. A
        game whose `keys` hold none keeps its row in `games`, its errors
        included, and reaches no position.
        """
        return cls.number(cls.rows(games).lazy())

    def game(self, number: int) -> Game:
        """
        Reads back the stored game at `number` in the order the index holds
        them.
        """
        return self.listed([number])[0]

    def listed(self, numbers: Iterable[int]) -> list[Game]:
        """
        Reads back the stored game at each of `numbers`, in that order,
        through one filter on `game` that decodes only the row groups
        holding them.
        """
        numbers = list(numbers)
        rows    = (
            self.games.filter(col("game").is_in(numbers))
                .collect()
                .rows_by_key("game", include_key=True, named=True, unique=True)
        )

        return [
            Game(
                errors = row["errors"],
                moves  = map(Move.from_uci, self.positions.moves(row["game"])),
                origin = row["origin"],
                tags   = {pair["name"]: pair["value"] for pair in row["tags"]} | {
                    "Result": row["result"]
                }
            )
            for row in map(rows.__getitem__, numbers)
        ]

    def match(self, submitted: Game) -> Match | None:
        """
        Finds the stored game sharing the longest unbroken run of positions
        with `submitted`, or `None` for a game reaching no position the
        index holds.
        """
        return next(iter(self.matches(submitted, top=1)), None)

    def matches(self, submitted: Game, top: int) -> tuple[Match, ...]:
        """
        Finds at most `top` stored games, each at its longest run with
        `submitted`, the longest first, then by the mean of the players'
        ratings from the highest, then by the one rating a game carries,
        then in the order the index holds the games.
        """
        (games, offsets, starts, lengths), ties = self.positions.best(
            submitted.keys,
            top
        )

        return tuple(
            Match(
                game      = game,
                span      = Span(length=length, offset=offset, start=start),
                submitted = submitted,
                ties      = ties
            )
            for game, offset, start, length in zip(
                self.listed(games),
                offsets,
                starts,
                lengths,
                strict = True
            )
        )

    @classmethod
    def merge(cls, batches: Iterable[Batch]) -> Self:
        """
        Builds the index from the games each batch lays out, in the order
        `batches` yields them, keeping a game several batches repeat once,
        in the first batch holding it. Two games are the same where their
        Seven Tag Roster, the position they start from, and their moves are.
        """
        # `concat` raises on no frame, so an empty frame under `ROWS` leads the list.
        return cls.number(
            concat(
                (
                    LazyFrame(schema=ROWS),
                    *(batch.rows.lazy() for batch in batches)
                )
            ).filter(
                struct("fen", "moves", "plies", "roster", "variant").is_first_distinct()
            )
        )

    @classmethod
    def number(cls, rows: LazyFrame) -> Self:
        """
        Numbers the games `rows` holds in order as the `game` column and
        splits them into the table of their tags and the file of their
        positions.
        """
        frame = rows.with_row_index("game").collect()

        return cls(
            games     = frame.select(GAMES.names()).lazy(),
            positions = readers.Positions.build(
                *(
                    column.to_list()
                    for column in frame.select(
                        "moves",
                        "plies",
                        "fen",
                        "variant",
                        "standing",
                        "dated",
                        col("result").replace_strict(
                            RESULTS,
                            range(len(RESULTS)),
                            default      = len(RESULTS) - 1,
                            return_dtype = UInt8
                        )
                    )
                )
            )
        )

    @staticmethod
    def path(directory: Path) -> Path:
        """
        Names the file in `directory` holding every position the stored
        games reach and their moves.
        """
        return directory / "positions.bin"

    @classmethod
    def read(cls, directory: Path) -> Self:
        """
        Scans the table of the stored games under `GAMES`, which the file's
        own columns are held to first, and maps the file of their positions
        in `directory`.

        Raises:
            FileNotFoundError : Where a file is missing.
            SchemaError       : Where a file holds another layout.
        """
        table = cls.table(directory)

        try:
            found = read_parquet_schema(table)

            if found != GAMES:
                raise SchemaError(f"{table} holds {found} rather than {GAMES}")

            positions = readers.Positions.read(cls.path(directory))
        except (ComputeError, ValueError) as error:
            raise SchemaError(f"{directory}: {error}") from error

        return cls(games=scan_parquet(table, schema=GAMES), positions=positions)

    def referenced(self, reference: str) -> Game | None:
        """
        Finds the stored game `reference` names as `<file>:<n>`, or `None`
        where the index holds no such game.
        """
        file, _, place = reference.rpartition(":")
        placed         = (
            self.games.filter(col("origin").struct.field("place").cast(String) == place)
                .select("game", "origin")
                .collect()
        )

        return next(
            (
                self.game(number)
                for number, origin in placed.iter_rows()
                if Origin(**origin).file == file
            ),
            None
        )

    @staticmethod
    def rows(games: Iterable[Game]) -> DataFrame:
        """
        Lays `games` out one row each under the columns `ROWS` declares,
        reading the `Result` tag the reader fills where a file leaves it
        out.
        """
        return DataFrame(
            [
                {
                    "dated"    : game.dated,
                    "errors"   : game.errors,
                    "fen"      : game.tags.get("FEN"),
                    "moves"    : game.encoded,
                    "origin"   : game.origin.model_dump() if game.origin else None,
                    "plies"    : max(len(game.keys) - 1, 0),
                    "result"   : game.tags["Result"],
                    "roster"   : game.roster,
                    "standing" : game.standing,
                    "tags"     : [
                        {"name": name, "value": value}
                        for name, value in game.tags.items()
                        if name != "Result"
                    ],
                    "variant"  : game.tags.get("Variant")
                }
                for game in games
            ],
            schema = ROWS
        )

    def runs(self, submitted: Game) -> DataFrame:
        """
        Finds every unbroken run of positions a stored game shares with
        `submitted`, along which the two games' plies advance together.

        Returns:
            One row per run under the columns `RUNS` declares, its stored
            `game` beside the fields of its `Span`, the longest first, then
            the game whose ratings rank highest, then the game the index holds
            first, then the earliest in `submitted`, then the earliest in the
            stored game.
        """
        return DataFrame(
            self.positions.runs(submitted.keys),
            orient = "col",
            schema = RUNS
        )

    @staticmethod
    def table(directory: Path) -> Path:
        """
        Names the Parquet file in `directory` holding the stored games'
        tags.
        """
        return directory / "games.parquet"

    def write(self, directory: Path):
        """
        Writes the table of the stored games and the file of their positions
        to `directory`, creating it where it is missing.
        """
        self.games.sink_parquet(
            self.table(directory),
            mkdir          = True,
            row_group_size = 4096  # A filter on `game` decodes one row group alone.
        )
        self.positions.write(self.path(directory))

    def written(self, directory: Path) -> str:
        """
        Writes the count of games the index holds beside `directory`, as
        `scotch index games` prints it once it writes the index there.
        """
        return f"Indexed {counted(self.positions.games)} into {directory}"


@dataclass(frozen=True, kw_only=True)
class Batch:
    """
    The games the fetched file of `source` holds, those read with no problem
    laid out as `rows` under the columns `ROWS` declares and the rest kept
    apart as `left` for a report.
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
        return "\n".join(
            (
                f"Read {counted(self.rows.height + len(self.left))} from"
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


def counted(count: int) -> str:
    """
    Writes `count` with its thousands separated, followed by game or games
    to agree with it.
    """
    return f"{count:,} {'game' if count == 1 else 'games'}"
