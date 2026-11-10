"""
Holds `Marks`, what the identity page draws of the SVGs tracked under
`docs/assets/`, meaning the `Drawing` of each one, the `Stop` of each
place the site or the README sets a mark, and the `Guide` of each length
of the mark's construction, each measured from the `Box` of one subpath
of `mark.svg`.
"""

from collections.abc import Iterable, Iterator
from itertools       import batched
from pathlib         import Path
from pydantic        import BaseModel, computed_field
from re              import findall, search
from typing          import Literal, Self

from scotch.docs.tallies     import markdown
from scotch.identity.schemas import Identity


class Box(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The box one subpath's ink fills, in the units of its SVG, which count
    down the page from a baseline at 0.
    """

    bottom: int
    """
    The largest vertical coordinate the ink reaches.
    """

    left: int
    """
    The smallest horizontal coordinate the ink reaches.
    """

    right: int
    """
    The largest horizontal coordinate the ink reaches.
    """

    top: int
    """
    The smallest vertical coordinate the ink reaches.
    """

    @classmethod
    def around(cls, points: Iterable[tuple[float, float]]) -> Self:
        """
        Measures the box holding `points`, each side rounded to a whole
        unit.
        """
        across, down = zip(*points, strict=True)

        return cls(
            bottom = round(max(down)),
            left   = round(min(across)),
            right  = round(max(across)),
            top    = round(min(down))
        )


class Guide(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One length of the mark's construction, drawn on the mark between two
    ticks.
    """

    at: int
    """
    Where the line stands across its own direction.
    """

    axis: Literal["x", "y"]
    """
    The direction the length runs in.
    """

    end: int
    """
    Where the length ends along `axis`.
    """

    label: tuple[int, int]
    """
    Where the figure stands on the drawing.
    """

    name: str
    """
    The length's name.
    """

    note: str
    """
    What the length runs between.
    """

    owners: tuple[int, ...]
    """
    The place of each subpath the length measures, lit while it is drawn.
    """

    start: int
    """
    Where the length starts along `axis`.
    """

    anchor: Literal["end", "middle", "start"] = "middle"
    """
    The edge of the figure standing at `label`.
    """

    @computed_field
    @property
    def length(self) -> int:
        """
        Measures the length in the units of the SVG.
        """
        return self.end - self.start


class Stop(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One place the site or the README sets a mark, at the size it sets it.
    """

    height: int
    """
    How tall the mark stands there, in pixels.
    """

    name: str
    """
    The mark's name.
    """

    sentence: str
    """
    Where it stands and what it holds.
    """

    width: int
    """
    How wide the mark stands there, in pixels.
    """


class Drawing(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One tracked SVG, as its `viewBox` and the path data of each path it
    holds.
    """

    paths: tuple[str, ...]
    """
    The `d` attribute of each path, in the order the file holds them.
    """

    view: tuple[int, int, int, int]
    """
    The `viewBox`, as its left, its top, its width, and its height.
    """

    @property
    def boxes(self) -> list[Box]:
        """
        Measures the box of each subpath of the first path, in the order the
        path holds them.
        """
        return [Box.around(points) for points in subpaths(self.paths[0])]

    @property
    def guides(self) -> tuple[Guide, ...]:
        """
        Lays each length of the mark out from the boxes of its subpaths,
        which the mark holds in the order the S, the waist the two kings
        share, the lower opening, the upper opening, and the cross.
        """
        boxes = self.boxes
        letter, waist, _, _, cross = boxes

        return (
            Guide(
                at     = -850,
                axis   = "x",
                end    = letter.right,
                label  = (322, -866),
                name   = "The S's width",
                note   = "From the bowl on the left to the bowl on the right",
                owners = (0,),
                start  = letter.left
            ),
            Guide(
                anchor = "end",
                at     = -30,
                axis   = "y",
                end    = letter.bottom,
                label  = (-44, -384),
                name   = "The S's height",
                note   = "From the top arc to the foot of the lower bowl",
                owners = (0,),
                start  = letter.top
            ),
            Guide(
                anchor = "start",
                at     = 650,
                axis   = "y",
                end    = letter.bottom,
                label  = (664, 14),
                name   = "The drop under the baseline",
                note   = "How far the lower bowl passes the baseline",
                owners = (0,),
                start  = 0
            ),
            Guide(
                anchor = "end",
                at     = -384,
                axis   = "x",
                end    = letter.left,
                label  = (-44, -344),
                name   = "The margin beside the ink",
                note   = "From the viewBox's edge to the ink",
                owners = (0,),
                start  = self.view[0]
            ),
            Guide(
                anchor = "start",
                at     = 322,
                axis   = "y",
                end    = boxes[2].bottom,
                label  = (664, -384),
                name   = "The kings' reach",
                note   = "From the top cross to the bottom cross, a half-turn apart",
                owners = (4, 2),
                start  = cross.top
            ),
            Guide(
                at     = -800,
                axis   = "x",
                end    = cross.right,
                label  = (322, -812),
                name   = "The cross, across",
                note   = "The width of the arms",
                owners = (4,),
                start  = cross.left
            ),
            Guide(
                anchor = "start",
                at     = 400,
                axis   = "y",
                end    = cross.bottom,
                label  = (664, -730),
                name   = "The cross, up",
                note   = "From the top of the cross to the foot of its arms",
                owners = (4,),
                start  = cross.top
            ),
            Guide(
                anchor = "start",
                at     = -384,
                axis   = "x",
                end    = waist.right,
                label  = (664, -300),
                name   = "The waist, across",
                note   = "The widest the two kings stand where they meet",
                owners = (1,),
                start  = waist.left
            ),
            Guide(
                anchor = "start",
                at     = 426,
                axis   = "y",
                end    = waist.bottom,
                label  = (664, -216),
                name   = "The waist, up",
                note   = "The span the two bodies share",
                owners = (1,),
                start  = waist.top
            )
        )

    def height(self, width: float) -> int:
        """
        Measures how tall the drawing stands at `width`, in whole units.
        """
        return round(width * self.view[3] / self.view[2])

    @classmethod
    def read(cls, path: Path) -> Self:
        """
        Reads the SVG at `path`.
        """
        svg = path.read_text(encoding="utf-8")

        return cls(
            paths = findall(r' d="([^"]+)"', svg),
            view  = search(r'viewBox="([^"]+)"', svg)[1].split()
        )

    def width(self, height: float) -> int:
        """
        Measures how wide the drawing stands at `height`, in whole units.
        """
        return round(height * self.view[2] / self.view[3])


class Marks(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The drawings the identity page sets, beside each place they stand and
    each length of the mark.
    """

    guides: tuple[Guide, ...]
    """
    Each length of the mark, in the order the construction draws them.
    """

    lockup: Drawing
    """
    The lockup, holding the wordmark's two paths and the tagline's.
    """

    mark: Drawing
    """
    The mark, one compound path of five subpaths.
    """

    stops: tuple[Stop, ...]
    """
    Each place a mark stands, from the narrowest to the widest.
    """

    wordmark: Drawing
    """
    The wordmark, holding the S and the letters beside it.
    """

    @property
    def lengths(self) -> str:
        """
        Writes a table of each length, measured in the units of the SVG.
        """
        return markdown(
            headers = ("Length", "Units", "Measured"),
            right   = False,
            rows    = (
                (guide.name, f"{guide.length}", guide.note) for guide in self.guides
            )
        )

    @property
    def sizes(self) -> str:
        """
        Writes a table of each place a mark stands and its size in pixels.
        """
        return markdown(
            headers = ("Mark", "Width", "Height", "Where"),
            right   = False,
            rows    = (
                (stop.name, f"{stop.width}", f"{stop.height}", stop.sentence)
                for stop in self.stops
            )
        )

    @classmethod
    def read(cls, root: Path) -> Self:
        """
        Reads the SVGs under `root` and measures each length from the mark's
        subpaths.
        """
        card = Identity().card
        lockup, mark, wordmark = (
            Drawing.read(root / "docs/assets" / f"{name}.svg")
            for name in ("lockup", "mark", "wordmark")
        )

        return cls(
            guides = mark.guides,
            lockup = lockup,
            mark   = mark,
            stops  = (
                Stop(
                    height   = 16,
                    name     = "Favicon",
                    sentence = (
                        "The favicon is the S alone at 16 pixels tall, in the "
                        "browser's tab."
                    ),
                    width = mark.width(16)
                ),
                Stop(
                    height   = 24,
                    name     = "Nav mark",
                    sentence = (
                        "The nav mark is the same S at 24 pixels tall, beside the "
                        "site's name."
                    ),
                    width = mark.width(24)
                ),
                Stop(
                    height   = wordmark.height(384),
                    name     = "Wordmark",
                    sentence = (
                        "The front page sets the wordmark at 24rem wide, the letters "
                        "added beside the same S."
                    ),
                    width = 384
                ),
                Stop(
                    height   = card.height // 3,
                    name     = "Link card",
                    sentence = (
                        "A link card draws the wordmark at "
                        f"{card.width // 3 * card.wordmark // 100} of its "
                        f"{card.width // 3} pixels, above the section's name and "
                        "the two games' rails. The drawing shows the card at a "
                        f"third of its true size, {card.width} by {card.height} "
                        "pixels, with its wordmark at "
                        f"{card.width * card.wordmark // 100}."
                    ),
                    width = card.width // 3
                ),
                Stop(
                    height   = lockup.height(560),
                    name     = "Lockup",
                    sentence = (
                        "The README sets the lockup at 560 pixels wide, with the "
                        "tagline set under the wordmark."
                    ),
                    width = 560
                )
            ),
            wordmark = wordmark
        )


def quadratic(far: float, near: float, start: float, step: float) -> float:
    """
    Reads one coordinate of a quadratic curve at `step`, a share of the way
    from `start` to `far` under the control point `near`.
    """
    return (1 - step) ** 2 * start + 2 * step * (1 - step) * near + step ** 2 * far


def subpaths(d: str) -> Iterator[list[tuple[float, float]]]:
    """
    Yields the points each subpath of the path data `d` passes through,
    reading the absolute `M`, `L`, `H`, `V`, and `Q` commands the tracked
    SVGs hold and sampling each quadratic curve at 64 steps.
    """
    points: list[tuple[float, float]] = []
    at = (0.0, 0.0)

    for command, numbers in findall(r"([HLMQV])([^A-Z]*)", d):
        values = list(map(float, findall(r"-?[\d.]+", numbers)))

        if command == "M" and points:
            yield points
            points = []

        match command:
            case "H" : drawn = [(value, at[1]) for value in values]
            case "V" : drawn = [(at[0], value) for value in values]
            case "Q":
                drawn = []
                for near_x, near_y, far_x, far_y in batched(values, 4):
                    drawn += [
                        (
                            quadratic(
                                far   = far_x,
                                near  = near_x,
                                start = at[0],
                                step  = step
                            ),
                            quadratic(
                                far   = far_y,
                                near  = near_y,
                                start = at[1],
                                step  = step
                            )
                        )
                        for step in (count / 64 for count in range(1, 65))
                    ]
                    at = far_x, far_y
            case _: drawn = list(batched(values, 2))

        points += drawn
        at      = drawn[-1]

    yield points
