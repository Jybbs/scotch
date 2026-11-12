"""
Holds `Census`, the counts the site's pages and the README draw from the
index, meaning how long the stored games run by their result and by the
decade they were played in, how many each fetched file holds and leaves out,
how long the games share their positions, how fully they carry their tags,
and how often the longest unbroken run leaves out a match a reader would
also want, which `scotch render docs` writes out as the JSON the Data pages,
the Guide's store page, and the Viewer read and sets in the tables and
figures the pages carry.
"""

from chess.pgn       import TAG_ROSTER
from collections.abc import Iterator, Sequence
from dataclasses     import dataclass, field
from functools       import cached_property
from math            import ceil
from polars          import (
    DataFrame, Expr, Series, UInt16, col, concat, concat_str, element, int_ranges, lit, max_horizontal,
    when
)
from random          import Random

from scotch.docs.omitted    import Floor, Ledger, Omissions
from scotch.docs.shared     import Crowd, Line, Parting, Shared
from scotch.docs.tags       import Gap, Tagged, Tags
from scotch.docs.tallies    import Archive, Era, Rules, Tally
from scotch.docs.ties       import Tie, Tied
from scotch.games           import readers
from scotch.games.schemas   import Game, Origin
from scotch.index.schemas   import REASONS, ROWS
from scotch.index.tables    import PositionIndex
from scotch.sources.schemas import Sources


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

    depth: int = 8
    """
    The most plies of an opening line the Shared Positions page draws.
    """

    first: int = 1900
    """
    The first decade the pages name, the games of the decades before it
    counted together.
    """

    horizon: int = 40
    """
    The last move the partings of the stored games count.
    """

    least: float = 0.0015
    """
    The share of the stored games an opening line is played by at least to
    be drawn.
    """

    line: str = (
        "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Rc1 h6 7. Bh4 b6"
        " 8. cxd5 Nxd5 9. Nxd5 exd5 10. Bxe7 Qxe7"
    )
    """
    The opening line whose tie the Tags page draws.
    """

    sample: int = 1000
    """
    The most stored games the measures of the longest-run rule sample.
    """

    seed: int = 1953
    """
    The seed the sample is drawn with, so a rerun samples the same games.
    """

    sources: Sources = field(default_factory=Sources.read)
    """
    The files the store is fetched from, which name the section of each,
    beside the floor each section's games reach the store at.
    """

    @cached_property
    def eras(self) -> list[str]:
        """
        Names the decades the pages count the dated games by, the decades
        before `first` together under one name, the earliest first.
        """
        return (
            self.games.drop_nulls("era")
                .group_by("era")
                .agg(col("decade").min())
                .sort("decade")
                .get_column("era")
                .to_list()
        )

    @cached_property
    def floor(self) -> Floor:
        """
        Counts every game the files of the section `sources.toml` gives a
        floor hold, kept or left out, by the decade it was played in and by
        the higher of its two ratings, leaving out the undated games.
        """
        floored, floor = next(iter(self.sources.floors.items()), ("", 0))
        bins           = [1, *range(1000, 2900, 100)]
        grid           = (
            concat(
                [
                    DataFrame(
                        {
                            "address" : self.games.get_column("address"),
                            "rating"  : self.tagged.get_column("rating"),
                            "year"    : self.games.get_column("year")
                        }
                    ),
                    self.left.select("address", "rating", "year")
                ],
                how = "diagonal"
            )
            .filter(col("address").replace_strict(self.sections, default="") == floored)
            .with_columns(
                era = self.named(col("year") // 10 * 10),
                bin = when(col("rating") > 0).then(
                    col("rating").bin_intervals(
                        bins[1:],
                        labels = [str(low) for low in bins]
                    ).cast(str)
                ).otherwise(lit("none"))
            )
            .drop_nulls("era")
            .group_by("era", "bin")
            .len()
        )
        cells = {(era, label): count for era, label, count in grid.iter_rows()}
        eras  = [era for era in self.eras if era in {era for era, _ in cells}]

        return Floor(
            bins   = bins,
            counts = [
                [cells.get((era, label), 0) for label in (*map(str, bins), "none")]
                for era in eras
            ],
            decades = eras,
            floor   = floor
        )

    @cached_property
    def games(self) -> DataFrame:
        """
        Reads each stored game's file, the year its `Date` tag names, the
        moves it plays, its result, and the decade of that year, both null
        where the tag's year holds anything but digits.

        Returns:
            One row per stored game under `address`, `year`, `moves`,
            `plies`, `result`, `decade`, and `era`, the name `named` gives
            the decade, where `moves` counts a move of White's and Black's
            reply as one, so a game of 7 plies plays 4 moves.
        """
        return self.index.games.select(
            address = col("origin").struct.field("address"),
            year    = (
                col("tags").list.filter(element().struct.field("name") == "Date")
                           .list.first()
                           .struct.field("value")
                           .str.slice(0, 4)
                           .cast(UInt16, strict=False)
            ),
            moves  = (col("plies") + 1) // 2,
            plies  = col("plies"),
            result = col("result")
        ).with_columns(decade=col("year") // 10 * 10).with_columns(
            era = self.named(col("decade"))
        ).collect()

    @cached_property
    def left(self) -> DataFrame:
        """
        Reads every game the index leaves out, beside the year its date
        names, null where the date names none.
        """
        return self.index.left.collect().with_columns(
            year = (col("dated") // 10000).replace(0, None).cast(UInt16)
        )

    @cached_property
    def omissions(self) -> Omissions:
        """
        Counts the games each fetched file holds, kept and left out under
        each reason, by section and by file, beside every Openings game by
        decade and by the higher of its two ratings.
        """
        reasons = (*REASONS.categories, "kept")
        counted = (
            DataFrame({"address": self.games.get_column("address"), "reason": "kept"})
            .vstack(self.left.select("address", reason=col("reason").cast(str)))
            .group_by("address", "reason")
            .len()
            .pivot("reason", reasons, index="address", values="len")
            .fill_null(0)
            .with_columns(
                section = col("address").replace_strict(self.sections, default="")
            )
        )
        order = list(dict.fromkeys(self.sections.values()))

        return Omissions(
            files = [
                Ledger(
                    files = 1,
                    name  = Origin(address=row["address"], place=1).file,
                    **{name: row[name] for name in (*reasons, "section")}
                )
                for row in counted.sort(
                    col("section").replace_strict(
                        order,
                        range(len(order)),
                        default = len(order)
                    ),
                    "address"
                ).iter_rows(named=True)
                if row["kept"] < sum(row[reason] for reason in reasons)
            ],
            floor    = self.floor,
            sections = [
                Ledger(
                    files   = rows.height,
                    name    = section,
                    section = section,
                    **{reason: rows.get_column(reason).sum() for reason in reasons}
                )
                for section in order
                if not (rows := counted.filter(col("section") == section)).is_empty()
            ]
        )

    @cached_property
    def rules(self) -> Rules:
        """
        Measures what the longest-run rule leaves out over `sample` stored
        games drawn with `seed`, each matched against every other stored
        game save those holding its whole mainline, beside the count of the
        distinct keys of the index the sample is drawn from.
        """
        keys     = self.index.positions.keys
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
    def sections(self) -> dict[str, str]:
        """
        Maps the address of each file `sources.toml` declares to the section
        of the provider's site listing it.
        """
        return {str(source.address): source.section for source in self.sources.sources}

    @cached_property
    def shared(self) -> Shared:
        """
        Counts the stored games by the move each first stands in a position
        no stored game reaches save its copies, for every stored game and
        for each decade, beside the positions by how many games reach each
        and the opening lines at least `least` of the games play.
        """
        eras   = self.eras
        groups = self.games.get_column("era").replace_strict(
            eras,
            range(len(eras)),
            default = len(eras)
        )
        alone, sharing, reach = self.index.positions.sharing(groups.to_list())
        games                 = self.games.with_columns(
            alone = Series(alone, dtype=UInt16),
            group = groups
        )
        every = [sum(column) for column in zip(*sharing, strict=True)]
        edges = sorted(
            {1, 2, self.crowd + 1}
            | {scale * 10**power for power in range(8) for scale in (5, 10, 20)}
        )
        most  = max((count for count, _ in reach), default=1)
        edges = edges[: next(at for at, edge in enumerate(edges) if edge >= most) + 1]

        return Shared(
            crowd   = self.crowd,
            decades = [
                self.parting(era, games.filter(col("group") == at), sharing[at])
                for at, era in enumerate(eras)
            ],
            every = self.parting("Every game", games, every),
            lines = [
                Line.from_uci(
                    games = count,
                    moves = moves,
                    reach = self.index.positions.reach(
                        readers.keys(moves, fen=None, variant=None)[-1:]
                    )[0]
                )
                for moves, count in sorted(
                    self.index.positions.lines(
                        self.depth,
                        ceil(self.least * self.games.height)
                    )
                )
            ],
            reach = [
                Crowd(
                    high  = high,
                    keys  = sum(keys for _, keys in inside),
                    low   = low,
                    stood = sum(count * keys for count, keys in inside)
                )
                for low, high in zip(
                    (1, *(edge + 1 for edge in edges)),
                    edges,
                    strict = False
                )
                for inside in ([(
                    count, keys
                ) for count, keys in reach if low <= count <= high],)
            ]
        )

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
                    undated = rows.get_column("decade").null_count(),
                    year    = (
                        rows.get_column("year")
                            .drop_nulls()
                            .mode()
                            .min()
                    )
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
            positions = self.index.positions.positions,
            results   = results
        )

    @cached_property
    def tagged(self) -> DataFrame:
        """
        Reads which tags of `Tags.names` each stored game carries with a
        value, how precisely its `Date` tag names the day, and its ratings.

        Returns:
            One row per stored game under `named`, the tags it carries with
            a value, `dates`, one of `day`, `month`, `year`, or `none`,
            `rated`, the count of its two ratings it carries, and `rating`,
            the higher of the two or 0.
        """
        value = lambda name: (
            col("tags").list.filter(element().struct.field("name") == name)
                       .list.first()
                       .struct.field("value")
        )
        elo = lambda name: value(name).cast(ROWS["rating"], strict=False).fill_null(0)

        return self.index.games.select(
            named = col("tags").list.filter(
                element().struct.field("value").str.contains(r"[^?.\-*\s]")
            ).list.eval(element().struct.field("name")).list.concat(
                (
                    when(col("result").str.contains(r"[^?.\-*\s]"))
                    .then(lit(["Result"]))
                    .otherwise(lit([], dtype=list[str]))
                )
            ),
            dates = (
                when(value("Date").str.contains(r"^\d{4}\.\d{2}\.\d{2}$"))
                .then(lit("day"))
                .when(value("Date").str.contains(r"^\d{4}\.\d{2}"))
                .then(lit("month"))
                .when(value("Date").str.contains(r"^\d{4}"))
                .then(lit("year"))
                .otherwise(lit("none"))
            ),
            rated = (elo("WhiteElo") > 0).cast(UInt16) + (elo("BlackElo") > 0).cast(
                UInt16
            ),
            rating = max_horizontal(elo("WhiteElo"), elo("BlackElo"))
        ).collect()

    @cached_property
    def tags(self) -> Tags:
        """
        Counts the stored games carrying each tag of the Seven Tag Roster,
        the two ratings, and the opening's code with a value, for every
        stored game and for each decade, beside the files holding the most
        games of each decade missing each tag.
        """
        names = [*TAG_ROSTER, "WhiteElo", "BlackElo", "ECO"]
        games = self.games.select("address", "era").hstack(self.tagged)
        held  = games.with_columns(
            file = col("address").replace_strict(
                {
                    address: Origin(address=address, place=1).file
                    for address in games.get_column("address").unique()
                }
            ),
            **{name: col("named").list.contains(name) for name in names}
        )

        return Tags(
            decades = [
                Tagged.from_rows(era, names, held.filter(col("era") == era))
                for era in self.eras
            ],
            every = Tagged.from_rows("Every game", names, held),
            gaps  = [
                Gap(
                    decade = era,
                    files  = (
                        rows.group_by("file")
                            .len("count")
                            .sort("count", "file", descending=[True, False])
                            .head(4)
                            .rename({"file": "path"})
                            .to_dicts()
                    ),
                    missing = rows.height,
                    tag     = tag
                )
                for tag in names
                for era in self.eras
                if not (rows := held.filter(col("era") == era, ~col(tag))).is_empty()
            ],
            names = names
        )

    @cached_property
    def tie(self) -> Tie:
        """
        Finds the stored games sharing every position of `line`, in the
        order a match shows them, each beside its next eight plies.
        """
        submitted = next(Game.parse(self.line))
        plies     = 8
        top       = 64

        return Tie(
            games = [
                Tied.from_match(match, number, plies)
                for match, number in zip(
                    self.index.matches(submitted, top=top),
                    self.index.positions.best(submitted.keys, top)[0][0],
                    strict = True
                )
                if match.span.length == len(submitted.keys)
            ],
            line  = list(submitted.sans),
            plies = plies
        )

    def counted(self, copies: int, game: Game) -> Series:
        """
        Counts the stored games reaching each position of `game`'s mainline,
        in the order the mainline reaches them, leaving out the `copies`
        holding the whole mainline, the game itself among them.
        """
        return Series(self.index.positions.reach(game.keys)) - copies

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
                (
                    runs.filter(col("length") == best["length"])
                        .get_column("game")
                        .n_unique()
                )
                > 1,
                rarest > self.crowd,
                not reached.is_empty()
                and counts.gather(reached.get_column("ply")).min() < rarest
            )

    def named(self, decade: Expr) -> Expr:
        """
        Names the decade `decade` holds, such as `1980s`, or names the
        decades before `first` together.
        """
        return when(decade < self.first).then(lit(f"Before {self.first}")).otherwise(
            concat_str(decade, lit("s"))
        )

    def parting(self, name: str, rows: DataFrame, sharing: Sequence[int]) -> Parting:
        """
        Counts the games of `rows` by the move each first stands alone, by
        whether each still stands in a position at each move to `horizon`,
        and by whether that position is shared, reading `sharing`, the count
        of the games sharing the position at each ply.
        """
        moves = range(self.horizon + 1)
        alone = dict(
            (
                rows.select((col("alone") + 1) // 2)
                    .get_column("alone")
                    .value_counts()
                    .iter_rows()
            )
        )

        return Parting(
            alone   = [alone.get(move, 0) for move in moves],
            games   = rows.height,
            name    = name,
            playing = [rows.filter(col("plies") >= 2 * move).height for move in moves],
            sharing = [*sharing[::2], *[0] * len(moves)][: len(moves)]
        )
