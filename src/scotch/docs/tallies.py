"""
Holds `Tally`, the counts `Census.store` draws from the index, beside the
`Era` of one decade's games, the `Archive` of one fetched file, the `Listed`
file the Data page's file list shows, the `Rank` of one row of the files the
store keeps the most games from, the `Rules` measuring what the longest-run
rule leaves out, `ended`, which reads the moves a share of games end by,
`markdown`, which writes each table, `notated`, which writes a line of
moves, `numbered`, which writes a numbered list of code, and `coded`, which
writes one code span. Their properties write the tables the Data pages and
the Guide's store page set beneath their widgets and the figures the pages
set inside their sentences, which `scotch render docs` writes between each
pair of markers.
"""

from bisect          import bisect_left
from collections     import defaultdict
from collections.abc import Iterable, Sequence
from itertools       import accumulate
from pathlib         import PurePosixPath
from pydantic        import BaseModel, Field, NonNegativeInt, computed_field
from typing          import Annotated, ClassVar, Self
from urllib.parse    import unquote

from scotch.identity.schemas import Identity
from scotch.sources.schemas  import Source


class Archive(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One fetched file and the games the store holds from it, the count of its
    undated games read by the figures the pages set and left out of the JSON
    the site reads.
    """

    address: str
    """
    The address the file is fetched from.
    """

    decades: dict[str, NonNegativeInt]
    """
    The count of its games played in each decade, under the decade's first
    year.
    """

    games: NonNegativeInt
    """
    The count of its games the store holds.
    """

    undated: Annotated[NonNegativeInt, Field(exclude=True)]
    """
    The count of its games whose `Date` tag names no year.
    """

    year: Annotated[int | None, Field(exclude=True)] = None
    """
    The year the most of its games were played in, the earliest of those
    tied, or `None` where none is dated, which the file list reads for the
    year an event was played.
    """

    @computed_field
    @property
    def name(self) -> str:
        """
        Reads the file's name without its extension and its
        percent-encoding, such as `Carlsen` for the address ending on
        `Carlsen.zip`.
        """
        return unquote(PurePosixPath(self.address).stem)


class Era(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The games of one decade, counted by how many moves each plays.
    """

    decade: int
    """
    The decade's first year, such as 1980 for the 1980s.
    """

    moves: list[NonNegativeInt]
    """
    The count of the decade's games playing each number of moves from 0.
    """

    @property
    def games(self) -> int:
        """
        Counts the decade's games.
        """
        return sum(self.moves)

    def ended(self, share: float) -> int:
        """
        Finds the fewest moves at least `share` of the decade's games end
        by, so a share of a half reads the median.
        """
        return ended(self.moves, share)

    @computed_field
    @property
    def name(self) -> str:
        """
        Names the decade by its first year, such as `1980s`.
        """
        return f"{self.decade}s"


class Rank(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One row of the archives the store keeps the most games from, either one
    of those files or every other file together.
    """

    games: NonNegativeInt
    """
    The count of the row's games.
    """

    held: float
    """
    The share of the store the row and the rows above it hold.
    """

    name: str
    """
    The file's name, or how many files the row gathers, such as
    `12 others`.
    """

    others: bool
    """
    Whether the row gathers every other file together.
    """


class Rules(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    What the longest-run rule leaves out over a sample of stored games, each
    matched against every other stored game save those holding its whole
    mainline, beside the count of the distinct keys of the index the sample
    is drawn from.
    """

    accidents: float
    """
    The number of pairs of distinct positions expected to share a key by
    accident, the chance one pair does being one in 2 to the power of 64.
    """

    crowd: NonNegativeInt
    """
    The count of other stored games past which a position counts as
    crowded.
    """

    crowded: NonNegativeInt
    """
    The count of matched games whose longest run lies wholly in crowded
    positions.
    """

    keys: NonNegativeInt
    """
    The count of distinct keys the index holds.
    """

    matched: NonNegativeInt
    """
    The count of sampled games some other stored game, save one holding the
    whole mainline, shares a position with.
    """

    sample: NonNegativeInt
    """
    The count of stored games sampled.
    """

    tied: NonNegativeInt
    """
    The count of matched games sharing their longest run with more than one
    stored game.
    """

    transposed: NonNegativeInt
    """
    The count of matched games sharing a shorter run that reaches, by
    another order of moves, a position rarer than every position of the
    longest run.
    """

    @property
    def figures(self) -> dict[str, str]:
        """
        Writes each figure the Methods pages set inside their sentences,
        the counts with a comma between each group of three digits, each
        measure as its share of the matched games, and the accidents as
        the odds against any two distinct positions of the index sharing a
        key, rounded to two figures. A share is empty where no sampled game
        matched, and the odds are empty where the index holds fewer than two
        keys, since neither then has a value.
        """
        return {
            "accidents" :
                f"{float(f'{1 / self.accidents:.2g}'):,.0f}" if self.accidents else "",
            "crowd"     : f"{self.crowd:,}",
            "keys"      : f"{self.keys:,}",
            "sample"    : f"{self.sample:,}",
            **{
                name: f"{count / self.matched:.0%}" if self.matched else ""
                for name, count in (
                    ("crowded", self.crowded),
                    ("tied", self.tied),
                    ("transposed", self.transposed)
                )
            }
        }


class Listed(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One file `sources.toml` declares as the Data page's file list shows it,
    its name and the heading its provider's site lists it under beside the
    games the store holds from it.
    """

    decades: dict[str, NonNegativeInt]
    """
    The count of the games the store holds from it played in each decade,
    under the decade's first year.
    """

    file: str
    """
    The path its address names under the host, such as
    `players/Carlsen.zip`.
    """

    games: NonNegativeInt
    """
    The count of its games the store holds.
    """

    group: str | None
    """
    The heading its provider's site lists it under within its section.
    """

    moves: str | None
    """
    The moves opening every game of an archive of one opening.
    """

    section: str
    """
    The section of its provider's site listing it.
    """

    title: str
    """
    The name its provider's site gives it.
    """

    year: int | None
    """
    The year the most of the games the store holds from it were played in.
    """

    @classmethod
    def of(cls, archive: Archive, source: Source) -> Self:
        """
        Lists `source` beside the games `archive` counts.
        """
        return cls(
            decades = archive.decades,
            file    = source.file,
            games   = archive.games,
            group   = source.group,
            moves   = source.moves,
            section = source.section,
            title   = source.title,
            year    = archive.year
        )


class Tally(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The stored games counted by how many moves they play, by result and by
    decade, and by the file holding them, beside the positions the index
    holds, as `Census.store` counts them.
    """

    CHARTED: ClassVar[tuple[str, ...]] = (
        "Alekhine", "Botvinnik", "Spassky", "Karpov", "Anand"
    )
    """
    The files the identity page charts, in the order the palette's series take
    them.
    """

    eras: list[Era]
    """
    Each decade the dated games were played in, the earliest first.
    """

    files: list[Archive]
    """
    Each file the store keeps a game from, in the order of their addresses.
    """

    games: NonNegativeInt
    """
    The count of every stored game, dated or not.
    """

    moves: list[list[NonNegativeInt]]
    """
    For each number of moves from 0, the count of the games playing it that
    end in each result, in the order `results` names them.
    """

    positions: NonNegativeInt
    """
    The count of positions the index holds, one for each position of each
    stored game.
    """

    results: list[str]
    """
    The results a game's `Result` tag records, such as `1-0`.
    """

    @property
    def archives(self) -> str:
        """
        Writes a table of the files the store keeps the most games from,
        each row beside its share of the store and the share it and the rows
        above it hold.
        """
        return markdown(
            headers = ("File", "Games", "Share of the Store", "Held Down to Here"),
            rows    = (
                (
                    rank.name,
                    f"{rank.games:,}",
                    f"{rank.games / self.games:.1%}",
                    f"{rank.held:.1%}"
                )
                for rank in self.largest
            )
        )

    @property
    def decades(self) -> str:
        """
        Writes a table of the games played in each decade beside the share
        of the dated games played by the decade's end.
        """
        dated = sum(era.games for era in self.eras)
        held  = accumulate(era.games for era in self.eras)

        return markdown(
            headers = ("Decade", "Games", "Played by Its End"),
            rows    = (
                (era.name, f"{era.games:,}", f"{total / dated:.1%}")
                for era, total in zip(self.eras, held, strict=True)
            )
        )

    @property
    def endings(self) -> dict[str, tuple[int, ...]]:
        """
        Reads, for each result, the count of the games ending in it at each
        number of moves from 0, a result no game records counting none at
        each.
        """
        return defaultdict(
            lambda: (0,) * len(self.moves),
            zip(self.results, zip(*self.moves), strict=True)
        )

    @property
    def figures(self) -> dict[str, str]:
        """
        Writes each figure the pages set inside their sentences from the
        store, meaning the count of every stored game and of the positions
        the index holds, the earliest decade one was played in, the median
        of the moves the games of each decade, every game, the drawn games,
        and White's wins play, the most and the fewest games one file holds,
        the share of the games played from 1980 on beside that year, and
        the count of undated games, a median being the fewest moves at least
        half the games it counts end by. The earliest decade is empty where
        no game is dated.
        """
        sizes  = [file.games for file in self.files]
        since  = 1980
        recent = sum(era.games for era in self.eras if era.decade >= since)

        return {
            **{f"median-{era.decade}": str(era.ended(0.5)) for era in self.eras},
            "draw-median"  : str(ended(self.endings["1/2-1/2"], 0.5)),
            "earliest"     : self.eras[0].name if self.eras else "",
            "games"        : f"{self.games:,}",
            "largest"      : f"{max(sizes):,}",
            "median"       : str(ended([sum(counts) for counts in self.moves], 0.5)),
            "positions"    : f"{self.positions:,}",
            "recent"       : f"{recent / self.games:.0%}",
            "recent-from"  : str(since),
            "smallest"     : f"{min(sizes):,}",
            "undated"      : f"{sum(file.undated for file in self.files):,}",
            "white-median" : str(ended(self.endings["1-0"], 0.5))
        }

    @property
    def lengths(self) -> str:
        """
        Writes a table of the games played in each decade beside the median
        of the moves they play and the middle half of those moves, from
        the fewest at least a quarter end by to the fewest at least three
        quarters end by.
        """
        return markdown(
            headers = ("Decade", "Games", "Median Move", "Middle Half"),
            rows    = (
                (
                    era.name,
                    f"{era.games:,}",
                    str(era.ended(0.5)),
                    f"{era.ended(0.25)} to {era.ended(0.75)}"
                )
                for era in self.eras
            )
        )

    @property
    def outcomes(self) -> str:
        """
        Writes a table of the games White won, the games drawn, and the
        games Black won among those ending within each span of ten moves,
        the last span holding every game past move 80.
        """
        endings = self.endings
        spans   = {
            "0 to 10"     : slice(0, 11),
            **{f"{low} to {low + 9}": slice(low, low + 10) for low in range(
                11,
                81,
                10
            )},
            "81 and over" : slice(81, None)
        }

        return markdown(
            headers = ("Moves", "White Won", "Drawn", "Black Won"),
            rows    = (
                (
                    label,
                    *(
                        f"{sum(endings[result][span]):,}"
                        for result in ("1-0", "1/2-1/2", "0-1")
                    )
                )
                for label, span in spans.items()
            )
        )

    @property
    def series(self) -> str:
        """
        Writes a table of the games each charted file holds in each decade,
        each column headed by the file beside the palette token and the hex
        its line takes.
        """
        palette = Identity().palette
        decades = sorted(
            {decade for archive in self.charted for decade in archive.decades}
        )

        return markdown(
            headers = (
                "Decade",
                *(
                    f"{archive.name}, `{token}`, `{getattr(palette, token).hex}`"
                    for token, archive in zip(
                        palette.series,
                        self.charted,
                        strict = False
                    )
                )
            ),
            rows = (
                (
                    f"{decade}s",
                    *(f"{archive.decades.get(decade, 0):,}" for archive in self.charted)
                )
                for decade in decades
            )
        )

    @computed_field
    @property
    def charted(self) -> list[Archive]:
        """
        Reads the files the identity page charts one series of the palette
        for, in the order `CHARTED` names them, leaving out one the store
        lacks.
        """
        held = {archive.name: archive for archive in self.files}

        return [held[name] for name in self.CHARTED if name in held]

    @computed_field
    @property
    def largest(self) -> list[Rank]:
        """
        Ranks the ten files the store keeps the most games from, those it
        keeps as many from by name, and gathers every other file into one
        row where more remain, each row beside the share it and the rows
        above it hold.
        """
        ranked = sorted(self.files, key=lambda file: (-file.games, file.name))
        rest   = ranked[10:]
        rows   = [
            *((file.name, file.games, False) for file in ranked[:10]),
            *([(
                f"{len(rest):,} others",
                sum(file.games for file in rest),
                True
            )] if rest else [])
        ]
        held = accumulate(games for _, games, _ in rows)

        return [
            Rank(
                games  = games,
                held   = total / self.games,
                name   = name,
                others = others
            )
            for (name, games, others), total in zip(rows, held, strict=True)
        ]

    def listed(self, sources: Iterable[Source]) -> list[Listed]:
        """
        Lists each of `sources` in its order beside the games the store
        holds from it, none where the store holds no game from it.
        """
        held = {archive.address: archive for archive in self.files}

        return [
            Listed.of(
                held.get(address := str(source.address))
                or Archive(
                    address = address,
                    decades = {},
                    games   = 0,
                    undated = 0
                ),
                source
            )
            for source in sources
        ]


def coded(text: str) -> str:
    """
    Writes `text` as inline code, between doubled backticks where it holds
    one, as CommonMark reads a code span.
    """
    return f"`` {text} ``" if "`" in text else f"`{text}`"


def ended(counts: Iterable[int], share: float) -> int:
    """
    Finds the fewest moves at least `share` of the games `counts` holds end
    by, `counts` holding the count of games playing each number of moves
    from 0, so a share of a half reads the median.
    """
    totals = list(accumulate(counts))

    return bisect_left(totals, share * totals[-1])


def markdown(
    headers : Sequence[str],
    rows    : Iterable[Sequence[str]],
    *,
    right   : bool = True
) -> str:
    """
    Writes a Markdown table, each header bolded, the first column aligned
    to the left and every other column to the right, or to the left as well
    where `right` is false.
    """
    return "\n".join(
        (
            "| " + " | ".join(f"**{header}**" for header in headers) + " |",
            "|---" + ("|---:" if right else "|---") * (len(headers) - 1) + "|",
            *("| " + " | ".join(row) + " |" for row in rows)
        )
    )


def notated(sans: Iterable[str]) -> str:
    """
    Writes moves in Standard Algebraic Notation (SAN) from the standard
    starting position as numbered moves, such as `1.d4 d5 2.c4`.
    """
    return " ".join(
        f"{ply // 2 + 1}.{san}" if ply % 2 == 0 else san for ply, san in enumerate(sans)
    )


def numbered(items: Iterable[tuple[str, str]]) -> str:
    """
    Writes a numbered Markdown list, each item a line of code beside the
    words saying what it does.
    """
    return "\n".join(
        f"{number}. {coded(code)} {gloss}"
        for number, (code, gloss) in enumerate(items, start=1)
    )
