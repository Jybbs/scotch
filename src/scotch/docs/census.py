"""
Holds `Census`, the counts the site's pages and the README draw from the
index, meaning how long the stored games run by their result and by the
decade they were played in, how many each fetched file holds, how many
positions the index holds, and how often the longest unbroken run leaves
out a match a reader would also want, which `scotch render docs` writes out
as the JSON the Data pages, the Guide's store page, and the Viewer read and
sets in the tables and figures the pages carry.
"""

from collections.abc import Iterator
from dataclasses     import dataclass
from functools       import cached_property
from polars          import DataFrame, Series, UInt16, col, element, int_ranges
from random          import Random

from scotch.docs.tallies  import Archive, Era, Rules, Tally
from scotch.games.schemas import Game
from scotch.index.tables  import PositionIndex


@dataclass(frozen=True, kw_only=True)
class Census:
    """
    The counts drawn from one index, beside the tuning its sampled measures
    read, each sampled game standing in for a submitted game the store does
    not hold.
    """

    index: PositionIndex
    """
    The index the counts are drawn from.
    """

    crowd: int = 100
    """
    The count of other stored games past which a position counts as
    crowded.
    """

    sample: int = 1000
    """
    The most stored games the measures of the longest-run rule sample.
    """

    seed: int = 1953
    """
    The seed the sample is drawn with, so a rerun samples the same games.
    """

    @cached_property
    def games(self) -> DataFrame:
        """
        Reads each stored game's file, the moves it plays, its result, and
        the decade its `Date` tag names, which is null where the tag's year
        holds anything but digits.

        Returns:
            One row per stored game under `address`, `moves`, `result`, and
            `decade`, where `moves` counts a move of White's and Black's
            reply as one, so a game of 7 plies plays 4 moves.
        """
        return self.index.games.select(
            address = col("origin").struct.field("address"),
            decade  = (
                col("tags").list.filter(element().struct.field("name") == "Date")
                           .list.first()
                           .struct.field("value")
                           .str.slice(0, 4)
                           .cast(UInt16, strict=False)
            )
                // 10 * 10,
            moves  = (col("moves").list.len() + 1) // 2,
            result = col("result")
        ).collect()

    @cached_property
    def positions(self) -> int:
        """
        Counts the positions the index holds, one for each position of each
        stored game.
        """
        return (
            self.index.positions.select(col("key").len())
                .collect()
                .item()
        )

    @cached_property
    def reach(self) -> DataFrame:
        """
        Counts the stored games reaching each position the index holds.

        Returns:
            One row per key under `key` and `games`.
        """
        return (
            self.index.positions.group_by("key")
                .agg(games=col("game").n_unique())
                .collect()
        )

    @cached_property
    def rules(self) -> Rules:
        """
        Measures what the longest-run rule leaves out over `sample` stored
        games drawn with `seed`, each matched against every other stored
        game save those holding its whole mainline, beside the count of the
        distinct keys of the index the sample is drawn from.
        """
        keys     = self.reach.height
        measured = list(self.measured())

        return Rules(
            accidents  = keys * (keys - 1) / 2**65,
            crowd      = self.crowd,
            crowded    = sum(crowded for _, crowded, _ in measured),
            keys       = keys,
            matched    = len(measured),
            sample     = len(self.sampled),
            tied       = sum(tied for tied, _, _ in measured),
            transposed = sum(transposed for _, _, transposed in measured)
        )

    @cached_property
    def sampled(self) -> list[int]:
        """
        Draws the numbers of the stored games the measures of the
        longest-run rule read, `sample` of them with `seed`, or every stored
        game where the index holds fewer.
        """
        games = self.games.height

        return Random(self.seed).sample(range(games), min(self.sample, games))

    @cached_property
    def store(self) -> Tally:
        """
        Counts the stored games by how many moves they play, by result
        and by decade, and by the file holding them, from 0 moves to the
        longest game's, the results in the order of their names, beside the
        positions the index holds.
        """
        longest = self.games.get_column("moves").max()
        results = (
            self.games.get_column("result")
                .unique()
                .sort()
                .to_list()
        )

        return Tally(
            eras = [
                Era(decade=decade, moves=self.counts(longest, rows))
                for (decade,), rows in (
                    self.games.drop_nulls("decade")
                        .sort("decade")
                        .group_by("decade", maintain_order=True)
                )
            ],
            files = [
                Archive(
                    address = address,
                    decades = {
                        str(decade): count
                        for decade, count in (
                            rows.drop_nulls("decade")
                                .get_column("decade")
                                .value_counts()
                                .sort("decade")
                                .iter_rows()
                        )
                    },
                    games   = rows.height,
                    undated = rows.get_column("decade").null_count()
                )
                for (address,), rows in self.games.sort("address").group_by(
                    "address",
                    maintain_order = True
                )
            ],
            games = self.games.height,
            moves = [
                list(counts)
                for counts in zip(
                    *(
                        self.counts(longest, self.games.filter(col("result") == result))
                        for result in results
                    )
                )
            ],
            positions = self.positions,
            results   = results
        )

    def counted(self, copies: int, game: Game) -> Series:
        """
        Counts the stored games reaching each position of `game`'s mainline,
        in the order the mainline reaches them, leaving out the `copies`
        holding the whole mainline, the game itself among them.
        """
        keys = DataFrame({"key": game.keys}, schema={"key": self.reach.schema["key"]})

        return (
            (
                keys.join(self.reach, how="left", maintain_order="left", on="key")
                    .get_column("games")
            )
            - copies
        )

    @staticmethod
    def counts(longest: int, rows: DataFrame) -> list[int]:
        """
        Counts the games of `rows` playing each number of moves from 0 to
        `longest`.
        """
        tally = dict(
            (
                rows.get_column("moves")
                    .value_counts()
                    .iter_rows()
            )
        )

        return [tally.get(moves, 0) for moves in range(longest + 1)]

    def measured(self) -> Iterator[tuple[bool, bool, bool]]:
        """
        Matches each sampled game and yields whether its longest run ties,
        lies wholly in crowded positions, and leaves out a rarer position a
        shorter run reaches by another move order, for each one some other
        stored game, save one holding its whole mainline, shares a position
        with.
        """
        for number in self.sampled:
            game  = self.index.game(number)
            every = self.index.runs(game)
            whole = col("length").max().over("game") == len(game.keys)
            runs  = every.filter(~whole)

            if runs.is_empty():
                continue

            best   = runs.row(0, named=True)
            copies = (
                every.filter(whole)
                     .get_column("game")
                     .n_unique()
            )
            counts  = self.counted(copies, game)
            rarest  = counts.slice(best["start"], best["length"]).min()
            reached = runs.filter(
                col("length") < best["length"],
                (col("start") > 0) | (col("offset") != 0)
            ).select(
                ply = int_ranges("start", col("start") + col("length"))
            ).explode("ply", empty_as_null=False)

            yield (
                self.index.tied(runs) > 0,
                rarest > self.crowd,
                not reached.is_empty()
                and counts.gather(reached.get_column("ply")).min() < rarest
            )
