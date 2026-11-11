"""
Holds the visual identity the site's theme and its cards are drawn in,
meaning the `Palette` of named colors, the `Faces` each kind of text is set
in, the `Roles` each color plays in each scheme, the `Card` each link card
is drawn at, and the `Identity` gathering them beside the tagline, which
`scotch render docs` writes out as the JSON the site's stylesheets import.
"""

from math     import cbrt, floor, sumprod
from pydantic import BaseModel, Field, computed_field
from re       import sub
from typing   import Literal, Self

type Paint = str | tuple[str, int, str]
"""
A color a role takes in one scheme, a palette token, `white` or `black`, or a
mix in OKLab taking a share in percent of the first and the rest of the second.
"""

CONES_TO_LINEAR = (
    (4.0767416621, -3.3077115913, 0.2309699292),
    (-1.2684380046, 2.6097574011, -0.3413193965),
    (-0.0041960863, -0.7034186147, 1.707614701)
)
CONES_TO_OKLAB = (
    (0.2104542553, 0.793617785, -0.0040720468),
    (1.9779984951, -2.428592205, 0.4505937099),
    (0.0259040371, 0.7827717662, -0.808675766)
)
LINEAR_TO_CONES = (
    (0.4122214708, 0.5363325363, 0.0514459929),
    (0.2119034982, 0.6806995451, 0.1073969566),
    (0.0883024619, 0.2817188376, 0.6299787005)
)
OKLAB_TO_CONES = (
    (1, 0.3963377774, 0.2158037573),
    (1, -0.1055613458, -0.0638541728),
    (1, -0.0894841775, -1.291485548)
)
"""
Björn Ottosson's reference matrices between linear sRGB, the three cone
responses OKLab starts from, and OKLab itself.
"""


def byte(channel: float) -> int:
    """
    Encodes a linear channel as an sRGB byte, a channel past either end held
    at that end, rounding a half up as a browser does.
    """
    encoded = (
        12.92 * channel
        if channel <= 0.0031308
        else 1.055 * channel ** (1 / 2.4) - 0.055
    )

    return floor(min(max(encoded, 0), 1) * 255 + 0.5)


class Card(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The size every link card is drawn at, and the share of a page's card its
    wordmark takes.
    """

    height: int = 600
    """
    The card's height in pixels.
    """

    width: int = 1200
    """
    The card's width in pixels, twice its height for the 2:1 ratio X's
    large-image card takes.
    """

    wordmark: int = 15
    """
    The share of the card's width a page's card sets the wordmark across, in
    percent.
    """


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

    @property
    def linear(self) -> tuple[float, float, float]:
        """
        Reads the color's red, green, and blue as linear shares of 1,
        undoing the sRGB transfer function.
        """
        return tuple(
            share / 12.92 if share <= 0.04045 else ((share + 0.055) / 1.055) ** 2.4
            for share in (byte / 255 for byte in bytes.fromhex(self.hex[1:]))
        )

    @property
    def luminance(self) -> float:
        """
        Reads the color's relative luminance, the weighted sum of its linear
        channels WCAG 2.2 defines its contrast ratio on.
        """
        return sumprod((0.2126, 0.7152, 0.0722), self.linear)

    @property
    def oklab(self) -> tuple[float, float, float]:
        """
        Converts the color to OKLab.
        """
        cones = [cbrt(sumprod(row, self.linear)) for row in LINEAR_TO_CONES]

        return tuple(sumprod(row, cones) for row in CONES_TO_OKLAB)

    def contrast(self, other: Self) -> float:
        """
        Measures the contrast ratio against `other` as WCAG 2.2 defines it,
        the lighter luminance plus 0.05 over the darker luminance plus 0.05.
        """
        darker, lighter = sorted((self.luminance, other.luminance))

        return (lighter + 0.05) / (darker + 0.05)

    def mixed(self, other: Self, share: int) -> Self:
        """
        Mixes the color with `other` the way `color-mix()` does in OKLab,
        taking `share` percent of it and the rest of `other`, clipped back
        into the sRGB gamut.
        """
        weight          = share / 100
        lightness, a, b = (
            ours * weight + theirs * (1 - weight)
            for ours, theirs in zip(self.oklab, other.oklab, strict=True)
        )
        cones = [sumprod(row, (lightness, a, b)) ** 3 for row in OKLAB_TO_CONES]

        return type(self)(
            hex = "#" + "".join(
                f"{byte(sumprod(row, cones)):02x}" for row in CONES_TO_LINEAR
            ),
            name = f"{self.name} {share}% {other.name}"
        )


class Face(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One face of the identity and the faces a browser falls back on, beside
    the package the site serves it from.
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

    package: str
    """
    The npm package `docs/package.json` installs the face from.
    """

    license: str = "SIL Open Font License 1.1"
    """
    The license the package ships the face under.
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


class Role(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The color a role takes in the light scheme and in the dark one, beside
    what it is drawn as.
    """

    dark: Paint
    """
    The color the role takes in the dark scheme.
    """

    kind: Literal["fill", "ground", "mark", "rule", "text"]
    """
    What the role is drawn as, which sets the contrast it holds, a ground every
    other role sits on, text at 4.5:1 against each ground, a mark carrying
    meaning at 3:1 against the page, and a rule or a fill that carries none, a
    fill being set apart by the outline or the fill beside it.
    """

    light: Paint
    """
    The color the role takes in the light scheme.
    """

    def takes(self, token: str) -> tuple[bool, bool]:
        """
        Reports whether either scheme paints the role in the color `token`
        whole, and whether either mixes that color with another.
        """
        paints = (self.light, self.dark)

        return token in paints, any(
            token in paint for paint in paints if isinstance(paint, tuple)
        )

    def worded(self, scheme: Literal["dark", "light"]) -> str:
        """
        Writes the paint `scheme` takes as a reader reads it, a token as
        it stands and a mix as its first token, its share, and its second
        token.
        """
        match getattr(self, scheme):
            case first, share, second : return f"{first} {share}% {second}"
            case token                : return token


class Faces(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The face each kind of text is set in.
    """

    body: Face = Face(
        fallbacks = ("Georgia", "serif"),
        family    = "Petrona",
        package   = "@fontsource-variable/petrona"
    )
    """
    The body text, a text serif with a weight axis from 100 to 900 and
    matching italics.
    """

    code: Face = Face(
        fallbacks = ("ui-monospace", "SF Mono", "Menlo", "monospace"),
        family    = "JetBrains Mono",
        package   = "@fontsource-variable/jetbrains-mono"
    )
    """
    The code, the move lists, and the figures, with tabular numerals
    wherever digits line up.
    """

    display: Face = Face(
        fallbacks = ("Georgia", "serif"),
        family    = "Hedvig Letters Serif",
        package   = "@fontsource-variable/hedvig-letters-serif"
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
    The critical state, always beside an icon and a label, and the Reference
    section's own color, which marks the section on its link card and carries
    no state there.
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

    @property
    def series(self) -> tuple[str, ...]:
        """
        Names each token a chart's series takes, in the palette's order.
        """
        return tuple(
            token for token in type(self).model_fields if token.startswith("series")
        )

    def painted(self, paint: Paint) -> Color:
        """
        Resolves the color `paint` draws as, mixing in OKLab as
        `color-mix()` does.
        """
        match paint:
            case first, share, second:
                return self.painted(first).mixed(self.painted(second), share)
            case "black" : return Color(hex="#000000", name="Black")
            case "white" : return Color(hex="#ffffff", name="White")
            case _       : return getattr(self, paint)

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


class Roles(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    Each color the site draws with, by the role it plays, which the
    stylesheet the identity's plugin serves sets as one custom property per
    role and the theme maps the default theme's own variables onto.
    """

    alert: Role = Role(
        dark  = ("critical", 58, "ground"),
        kind  = "text",
        light = ("critical", 76, "dark")
    )
    """
    A message that something failed.
    """

    data_black: Role = Role(dark=("dark", 30, "black"), kind="fill", light="dark")
    """
    The fill of Black's share of a chart's bar.
    """

    data_edge: Role = Role(dark=("ground", 50, "dark"), kind="mark", light="dark")
    """
    The outline a chart's bar holds a white share inside.
    """

    glyph_dark: Role = Role(
        dark  = ("dark", 86, "light"),
        kind  = "fill",
        light = ("ground", 77, "primary")
    )
    """
    The glyph a dark square draws under a page's text.
    """

    glyph_light: Role = Role(
        dark  = ("dark", 78, "light"),
        kind  = "fill",
        light = ("ground", 72, "light")
    )
    """
    The glyph a light square draws under a page's text.
    """

    ink: Role = Role(dark="ground", kind="text", light="dark")
    """
    The text of a page.
    """

    page: Role = Role(dark="dark", kind="ground", light="ground")
    """
    The ground of a page.
    """

    quiet: Role = Role(
        dark  = ("ground", 66, "dark"),
        kind  = "text",
        light = ("dark", 72, "ground")
    )
    """
    The text of a caption or a label.
    """

    raised: Role = Role(
        dark  = ("dark", 94, "white"),
        kind  = "ground",
        light = ("ground", 45, "white")
    )
    """
    The ground of a card standing over a page.
    """

    rule: Role = Role(
        dark  = ("dark", 76, "ground"),
        kind  = "rule",
        light = ("ground", 78, "dark")
    )
    """
    A line between two parts of a page.
    """

    run: Role = Role(dark="light", kind="text", light="primary")
    """
    A link, and the positions two games share.
    """

    side: Role = Role(
        dark  = ("dark", 66, "black"),
        kind  = "ground",
        light = ("ground", 45, "white")
    )
    """
    The ground of the sidebar.
    """

    stored: Role = Role(dark="series_3", kind="mark", light="series_3")
    """
    The stored game.
    """

    submitted: Role = Role(dark="series_2", kind="mark", light="series_2")
    """
    The submitted game.
    """

    tint: Role = Role(
        dark  = ("dark", 88, "light"),
        kind  = "ground",
        light = ("ground", 88, "primary")
    )
    """
    The ground of a note or a picked row.
    """


class Identity(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The palette, the faces, the roles, the card's size, and the tagline the
    site and its cards are drawn in.
    """

    card: Card = Card()
    """
    The size each link card is drawn at.
    """

    faces: Faces = Faces()
    """
    The face each kind of text is set in.
    """

    palette: Palette = Palette()
    """
    The palette named Walnut.
    """

    roles: Roles = Roles()
    """
    Each color the site draws with, by the role it plays.
    """

    tagline: str = "Find the grandmaster game closest to yours."
    """
    The line the site's front page and the README set beneath the wordmark.
    """

    def colored(self, role: str, scheme: Literal["dark", "light"]) -> Color:
        """
        Resolves the color the role named `role` takes in `scheme`.
        """
        return self.palette.painted(getattr(getattr(self.roles, role), scheme))

    def filled(self, scheme: Literal["dark", "light"], svg: str) -> str:
        """
        Replaces each group's `data-role` and `currentColor` fill with the
        color that role takes in `scheme`, wherever the `data-role` comes
        directly before the fill, such as the lockup's wordmark in the run's
        color and its tagline in a caption's.
        """
        return sub(
            r'data-role="(\w+)" fill="currentColor"',
            lambda role: f'fill="{self.colored(role[1], scheme).hex}"',
            svg
        )

    @computed_field
    @property
    def meanings(self) -> dict[str, dict[str, str]]:
        """
        Reads what each palette color, each face, and each role is for from
        its field's description, each on one line.
        """
        return {
            part: {
                name: " ".join(field.description.split())
                for name, field in type(getattr(self, part)).model_fields.items()
            }
            for part in ("faces", "palette", "roles")
        }
