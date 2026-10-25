"""
Holds the visual identity the site's theme and its cards are drawn in,
meaning the `Palette` of named colors, the `Faces` each kind of text is
set in, and the `Identity` gathering both beside the tagline, which `scotch
render docs` writes out as the JSON the site's stylesheets import.
"""

from pydantic import BaseModel, Field, computed_field


class Color(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One color of the palette, named after the color it is closest to.
    """

    name: str
    """
    The color's name, such as Walnut.
    """

    hex: str = Field(pattern=r"^#[0-9a-f]{6}$")
    """
    The color as six lowercase hexadecimal digits behind a `#`.
    """

    def filled(self, svg: str) -> str:
        """
        Fills an SVG drawn in `currentColor` with the color.
        """
        return svg.replace('fill="currentColor"', f'fill="{self.hex}"')


class Face(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One face of the identity and the faces a browser falls back on.
    """

    fallbacks: tuple[str, ...]
    """
    The faces a browser sets the text in where it lacks the face, the last
    a generic family.
    """

    family: str
    """
    The face's family name.
    """

    @computed_field
    @property
    def stack(self) -> str:
        """
        Writes the font stack a stylesheet's `font-family` takes, quoting
        each family whose name holds a space.
        """
        return ", ".join(
            f'"{family}"' if " " in family else family
            for family in (self.family, *self.fallbacks)
        )


class Faces(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The face each kind of text is set in.
    """

    body: Face = Face(fallbacks=("Georgia", "serif"), family="Petrona")
    """
    The body text, a text serif with a weight axis from 100 to 900 and
    matching italics.
    """

    code: Face = Face(
        fallbacks = ("ui-monospace", "SF Mono", "Menlo", "monospace"),
        family    = "JetBrains Mono"
    )
    """
    The code, the move lists, and the figures, with tabular numerals
    wherever digits line up.
    """

    display: Face = Face(
        fallbacks = ("Georgia", "serif"),
        family    = "Hedvig Letters Serif"
    )
    """
    The headings and the wordmark, an old-style serif with an optical-size
    axis from 12 to 24 at its one weight.
    """


class Palette(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The palette named Walnut, drawn from a wooden club board in walnut and a
    light wood, with the brass of a clock's case among its series, the first
    five series colors in the order a chart takes them.
    """

    critical: Color = Color(hex="#c43e47", name="Brick Red")
    """
    The critical state, always beside an icon and a label.
    """

    dark: Color = Color(hex="#1a1a1a", name="Near Black")
    """
    The dark ground, and body text on the light ground.
    """

    ground: Color = Color(hex="#f2f1ee", name="Cararra")
    """
    The light ground, and light text on the dark ground.
    """

    light: Color = Color(hex="#e3c3a3", name="Cashmere")
    """
    The board's light squares, and the lead on the dark ground.
    """

    primary: Color = Color(hex="#764017", name="Walnut")
    """
    The lead color, the logo's piece, links on the light ground, and the
    board's dark squares.
    """

    series_1: Color = Color(hex="#009b98", name="Persian Green")
    """
    The first series color.
    """

    series_2: Color = Color(hex="#1e69a6", name="Matisse")
    """
    The second series color.
    """

    series_3: Color = Color(hex="#a17b0d", name="Buttered Rum")
    """
    The third series color, the clock's brass.
    """

    series_4: Color = Color(hex="#8a80cb", name="Ube")
    """
    The fourth series color.
    """

    series_5: Color = Color(hex="#1e7634", name="Forest Green")
    """
    The fifth series color.
    """

    series_6: Color = Color(hex="#a738a2", name="Red Violet")
    """
    The sixth series color, the Viewer section's own, which no chart's
    series order takes.
    """

    warning: Color = Color(hex="#f48241", name="Mandarin Pearl")
    """
    The warning state, always beside an icon and a label.
    """

    def schemed(self, svg: str) -> str:
        """
        Colors an SVG drawn in `currentColor` in the lead of each color
        scheme, Walnut on a light ground and Cashmere on a dark one, through
        a stylesheet the SVG carries, since a browser drawing an SVG as an
        image or an icon gives `currentColor` no color of its own.
        """
        head, _, rest = svg.partition(">")
        dark  = f"@media (prefers-color-scheme:dark){{path{{fill:{self.light.hex}}}}}"
        style = f"<style>path{{fill:{self.primary.hex}}}{dark}</style>"

        return f"{head}>{style}{rest.replace('fill=\"currentColor\" ', '')}"


class Identity(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The palette, the faces, and the tagline the site and its cards are drawn
    in.
    """

    faces: Faces = Faces()
    """
    The face each kind of text is set in.
    """

    palette: Palette = Palette()
    """
    The palette named Walnut.
    """

    tagline: str = "Find the grandmaster game closest to yours."
    """
    The line the site's front page and the README set beneath the wordmark.
    """
