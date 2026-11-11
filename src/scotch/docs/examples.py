"""
Holds `Example`, one line of moves the site's pages draw beside the stored
game the index matches it to, and the `Showing` of that match, with a
`Shown` for each of its two games, which `scotch render docs` writes out
as the JSON the front page, the Methods page, and the link cards read,
and reads for the example run and the figures the pages set inside their
sentences. An `Example` also exports its match as the match file the Viewer
opens on.
"""

from pathlib  import Path
from pydantic import BaseModel, Field, NonNegativeInt
from typing   import Annotated, Self

from scotch.games.schemas import Frame, Game
from scotch.index.schemas import Export, Span
from scotch.index.tables  import PositionIndex


class Shown(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One game of a match as a page draws it, its tags read by the figures the
    pages set and left out of the JSON the site reads.
    """

    frames: tuple[Frame, ...]
    """
    The game's positions up to the plies the page draws, from the position
    it starts at.
    """

    headers: Annotated[frozendict[str, str], Field(exclude=True)]
    """
    The game's tags, keyed by their names.
    """

    keys: tuple[str, ...]
    """
    The Zobrist key of each position the frames hold, written in decimal as
    text, since JavaScript reads a JSON number as a double, which keeps an
    integer exact only up to `2**53`, per RFC 8259 section 6.
    """

    played: tuple[tuple[str, str], ...]
    """
    Each move of the game's mainline in SAN beside the symbol of the piece
    the move sets down, the king's where it castles and the new piece's
    where a pawn promotes.
    """

    @property
    def figures(self) -> dict[str, str]:
        """
        Writes the figures a page names about the game, meaning its players
        by surname, its event, and its year.
        """
        return {
            "black" : self.headers["Black"].split(",")[0],
            "event" : self.headers["Event"],
            "white" : self.headers["White"].split(",")[0],
            "year"  : self.headers["Date"][:4]
        }

    @classmethod
    def from_game(cls, game: Game, shown: int) -> Self:
        """
        Reads the frames of `game` up to `shown` plies beside its tags and
        every move it plays.
        """
        return cls(
            frames  = game.frames[: shown + 1],
            headers = game.tags,
            keys    = tuple(map(str, game.keys[: shown + 1])),
            played  = tuple((frame.san, frame.landed) for frame in game.frames[1:])
        )


class Showing(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    A line's match as the site's pages draw it, the longest other run and
    the summary read by the figures and the example run the pages set and
    left out of the JSON the site reads.
    """

    next: Annotated[NonNegativeInt | None, Field(exclude=True)]
    """
    The longest run any other stored game shares with the line, or `None`
    where no other stored game shares a position with it.
    """

    parting: str | None
    """
    The move the stored game played from the last position the two games
    share, or `None` where the stored game ends there.
    """

    span: Span
    """
    The run the two games share.
    """

    stored: Shown
    """
    The stored game.
    """

    submitted: Shown
    """
    The line.
    """

    summary: Annotated[str, Field(exclude=True)]
    """
    The lines `scotch match game` prints for the match.
    """

    @property
    def figures(self) -> dict[str, str]:
        """
        Writes the figures a page names about the match, meaning the stored
        game's own, the run the two games share, the move where they part,
        and the longest run any other stored game shares.
        """
        return {
            **self.stored.figures,
            "end"     : str(self.span.submitted[-1]),
            "next"    : str(self.next or ""),
            "parting" : self.parting or "",
            "run"     : str(self.span.length),
            "start"   : str(self.span.start)
        }


class Example(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The first game of a PGN file a page matches against the index, and how
    many of each game's plies the page draws.
    """

    path: Path
    """
    The PGN file, relative to the repository's root.
    """

    shown: NonNegativeInt
    """
    The plies of each game the page draws, from the position each game
    starts at, or 0 for a line no page draws, which the JSON the site reads
    leaves out.
    """

    def drawn(self, index: PositionIndex, root: Path) -> Showing:
        """
        Matches the example against `index`, reading its file under `root`.

        Raises:
            ValueError: Where the file holds no game, where its first game
                        carries a problem, or where no stored game shares a
                        position with it.
        """
        submitted = self.game(root)

        if not (matches := index.matches(submitted, top=2)):
            raise ValueError(f"No stored game shares a position with {self.path}")

        match = matches[0]

        return Showing(
            next      = matches[1].span.length if len(matches) > 1 else None,
            parting   = match.parting,
            span      = match.span,
            stored    = Shown.from_game(match.game, self.shown),
            submitted = Shown.from_game(submitted, self.shown),
            summary   = match.report()
        )

    def exported(self, root: Path, index: PositionIndex | None = None) -> Export:
        """
        Reads the example's first game under `root` beside the stored game
        `index` matches it to, as the Viewer reads a match, or the game
        alone where no index is given.
        """
        submitted = self.game(root)

        return Export.from_match(index.match(submitted) if index else None, submitted)

    def game(self, root: Path) -> Game:
        """
        Reads the first game of the example's file under `root`.
        """
        return Game.first(root / self.path)
