"""
Holds `Omissions`, the games the fetched files hold that the index leaves
out as `Census.omissions` counts them, beside the `Ledger` of one section or
one file and the `Floor` of the Openings games by decade and rating, whose
properties write the table the Games Left Out page sets beneath its figure
and the figures it sets inside its sentences.
"""

from pydantic import BaseModel, NonNegativeInt

from scotch.docs.tallies import markdown

# `HEADERS` names the header of each reason's column, in the order the
# index's record lists the reasons.
HEADERS = {
    "below"   : "Below",
    "repeat"  : "Repeats",
    "unread"  : "Unread",
    "variant" : "Variants"
}


class Floor(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    Every game the Openings files hold, by the decade it was played in and
    by the higher of its two ratings, beside the floor the store keeps them
    at.
    """

    bins: list[NonNegativeInt]
    """
    The lowest rating of each bin of ratings, the lowest first, each bin
    reaching up to the next one's lowest rating.
    """

    counts: list[list[NonNegativeInt]]
    """
    The count of the games in each decade of `decades` and each bin of
    `bins`, then those carrying no rating as the last count of each decade.
    """

    decades: list[str]
    """
    The decades the games were played in, the decades before the first one
    named together and the earliest first, leaving out the undated games.
    """

    floor: NonNegativeInt
    """
    The rating a game reaches the store at.
    """


class Ledger(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The games one section's files or one file holds, split into the games
    the index keeps and the games it leaves out under each reason.
    """

    below: NonNegativeInt
    """
    The count of the games rated under the section's floor.
    """

    files: NonNegativeInt
    """
    The count of the files the row counts.
    """

    kept: NonNegativeInt
    """
    The count of the games the index keeps.
    """

    name: str
    """
    The name of the section, such as `Openings`, or the file's path on the
    provider's site.
    """

    repeat: NonNegativeInt
    """
    The count of the games repeating a game a file declared earlier holds.
    """

    section: str
    """
    The name of the section listing the files.
    """

    unread: NonNegativeInt
    """
    The count of the games whose moves the reader could not play.
    """

    variant: NonNegativeInt
    """
    The count of the games of a variant other than standard chess.
    """

    @property
    def read(self) -> int:
        """
        Counts the games the files hold.
        """
        return self.below + self.kept + self.repeat + self.unread + self.variant


class Omissions(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The games the fetched files hold, kept and left out, by section and by
    file, beside the Openings games by decade and rating.
    """

    files: list[Ledger]
    """
    Each file leaving out a game, by section in the order `sections` lists
    them, then by its path.
    """

    floor: Floor
    """
    The Openings games by decade and rating.
    """

    sections: list[Ledger]
    """
    Each section of the provider's site, in the order `sources.toml` first
    declares one of its files.
    """

    @property
    def figures(self) -> dict[str, str]:
        """
        Writes each figure the Games Left Out page sets inside its
        sentences, meaning the games the fetched files hold, the games
        the index keeps and leaves out, and the count left out under each
        reason.
        """
        read = sum(section.read for section in self.sections)
        kept = sum(section.kept for section in self.sections)

        return {
            "left-kept" : f"{kept:,}",
            "left-out"  : f"{read - kept:,}",
            "left-read" : f"{read:,}",
            **{f"left-{reason}": f"{count:,}" for reason, count in self.totals.items()}
        }

    @property
    def floors(self) -> str:
        """
        Writes a table of each decade's Openings games beside those carrying
        no rating, those rated under the floor, and those the floor keeps.
        """
        floor = self.floor
        under = sum(1 for low in floor.bins if low < floor.floor)

        return markdown(
            headers = ("Decade", "Games", "Unrated", "Under the Floor", "Kept"),
            rows    = (
                (
                    decade,
                    *(
                        f"{count:,}"
                        for count in (
                            sum(counts),
                            counts[-1],
                            sum(counts[:under]),
                            sum(counts[under:-1])
                        )
                    )
                )
                for decade, counts in zip(floor.decades, floor.counts, strict=True)
            )
        )

    @property
    def ledger(self) -> str:
        """
        Writes a table of each section beside the games its files hold,
        the games the index keeps, and the games it leaves out under each
        reason, the reasons ranked by the games each takes.
        """
        reasons = sorted(HEADERS, key=lambda reason: -self.totals[reason])

        return markdown(
            headers = (
                "Section", "Files", "Read", "Kept",
                *(HEADERS[reason] for reason in reasons)
            ),
            rows = (
                (
                    section.name,
                    *(
                        f"{count:,}"
                        for count in (
                            section.files, section.read, section.kept,
                            *(getattr(section, reason) for reason in reasons)
                        )
                    )
                )
                for section in self.sections
            )
        )

    @property
    def totals(self) -> dict[str, int]:
        """
        Counts the games every section leaves out under each reason, keyed
        by the reason in the order `HEADERS` lists them.
        """
        return {
            reason: sum(getattr(section, reason) for section in self.sections)
            for reason in HEADERS
        }
