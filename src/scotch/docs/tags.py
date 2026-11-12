"""
Holds `Tags`, how fully the stored games carry their tags as `Census.tags`
counts them, beside the `Tagged` count of one group of games, the `Gap`
of one tag in one decade, and the `Held` games of a gap in one file, whose
properties write the table the Tags page sets beneath its figures and the
figures it sets inside its sentences.
"""

from collections.abc import Iterable
from polars          import DataFrame
from pydantic        import BaseModel, NonNegativeInt
from typing          import Self

from scotch.docs.tallies import markdown


class Held(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The games of one gap that one file holds.
    """

    count: NonNegativeInt
    """
    The count of the gap's games the file holds.
    """

    path: str
    """
    The path of the file on the provider's site.
    """


class Tagged(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The games of one decade, of the decades before the first one named, or
    of the whole store, counted by the tags they carry with a value, by how
    precisely their `Date` tag names the day, and by the ratings they carry.
    """

    dates: dict[str, NonNegativeInt]
    """
    The count of the games whose `Date` tag names the `day`, the `month`
    alone, the `year` alone, or `none` of them.
    """

    games: NonNegativeInt
    """
    The count of the games.
    """

    name: str
    """
    The name of the group, such as `1980s`.
    """

    ratings: dict[str, NonNegativeInt]
    """
    The count of the games carrying `both` a `WhiteElo` and a `BlackElo`
    rating, `one` of them, or `neither`.
    """

    tags: dict[str, NonNegativeInt]
    """
    The count of the games carrying each tag `Tags.names` lists with a value,
    a value of nothing but `?`, `.`, `-`, `*`, and spaces counting as none.
    """

    @classmethod
    def from_rows(cls, name: str, names: Iterable[str], rows: DataFrame) -> Self:
        """
        Counts the games of `rows`, one per stored game as `Census.tagged`
        reads it beside a boolean column per tag of `names`.
        """
        dates = dict(
            (
                rows.get_column("dates")
                    .value_counts()
                    .iter_rows()
            )
        )
        ratings = dict(
            (
                rows.get_column("rated")
                    .value_counts()
                    .iter_rows()
            )
        )

        return cls(
            dates = {
                precision: dates.get(precision, 0)
                for precision in ("day", "month", "year", "none")
            },
            games   = rows.height,
            name    = name,
            ratings = {
                label: ratings.get(count, 0)
                for label, count in (("both", 2), ("one", 1), ("neither", 0))
            },
            tags = {tag: rows.get_column(tag).sum() for tag in names}
        )

    def share(self, name: str) -> float:
        """
        Finds the share of the games carrying the tag `name` with a value,
        or 0 for a group holding no games.
        """
        return self.tags[name] / self.games if self.games else 0


class Gap(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The games of one decade missing one tag, beside the files holding the
    most of them.
    """

    decade: str
    """
    The name of the decade, as `Tagged.name` writes it.
    """

    files: list[Held]
    """
    The files holding the most of the games, the most first.
    """

    missing: NonNegativeInt
    """
    The count of the decade's games missing the tag.
    """

    tag: str
    """
    The name of the tag.
    """


class Tags(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    How fully the stored games carry the tags `names` lists, for the whole
    store and for each decade, beside the files behind each gap.
    """

    decades: list[Tagged]
    """
    The games of the decades before the first one named together, then of
    each decade, the earliest first, leaving out the undated games.
    """

    every: Tagged
    """
    Every stored game, dated or not.
    """

    gaps: list[Gap]
    """
    Each tag a decade's games miss, by tag in the order `names` lists, then
    by decade.
    """

    names: list[str]
    """
    The tags counted, the Seven Tag Roster followed by the ratings and the
    opening's code.
    """

    @property
    def carried(self) -> str:
        """
        Writes a table of each tag beside the share of every stored game
        carrying it with a value and the decade carrying it least, or every
        stored game where no game is dated.
        """
        return markdown(
            headers = ("Tag", "Carried", "Least In", "Share There"),
            rows    = (
                (
                    f"`{name}`",
                    f"{self.every.share(name):.1%}",
                    (least := min(
                        self.decades,
                        default = self.every,
                        key     = lambda tagged: tagged.share(name)
                    )).name,
                    f"{least.share(name):.1%}"
                )
                for name in self.names
            )
        )

    @property
    def dated(self) -> str:
        """
        Writes a table of each decade beside the shares of its games dated
        to the day and carrying both ratings.
        """
        return markdown(
            headers = ("Decade", "Games", "Dated to the Day", "Both Ratings"),
            rows    = (
                (
                    tagged.name,
                    f"{tagged.games:,}",
                    f"{tagged.dates['day'] / tagged.games:.1%}",
                    f"{tagged.ratings['both'] / tagged.games:.1%}"
                )
                for tagged in self.decades
            )
        )

    @property
    def figures(self) -> dict[str, str]:
        """
        Writes each figure the Tags page sets inside its sentences, meaning
        the shares of every stored game carrying a `Round` tag, dated to the
        day, carrying both ratings, and carrying neither.
        """
        every = self.every

        return {
            "tags-round"   : f"{every.share('Round'):.0%}",
            "tags-both"    : f"{every.ratings['both'] / every.games:.0%}",
            "tags-day"     : f"{every.dates['day'] / every.games:.0%}",
            "tags-neither" : f"{every.ratings['neither'] / every.games:.0%}"
        }
