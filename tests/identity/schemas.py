"""
Pins the identity the site and its cards are drawn in, meaning the font
stack each face writes, the colors a palette entry accepts, the fills
`Identity.filled` and the stylesheet `Palette.schemed` set on an SVG drawn
in `currentColor`, the contrast the README's lockup holds on GitHub's
grounds, and the JSON the site's stylesheets import.
"""

from pathlib  import Path
from pydantic import ValidationError
from pytest   import approx, mark, param, raises
from re       import findall

from scotch.identity.schemas import Color, Face, Identity, Palette, Role, byte


@mark.parametrize(
    ("face", "stack"),
    [
        param(
            Face(fallbacks=("Georgia", "serif"), family="Petrona", package="p"),
            "Petrona, Georgia, serif",
            id = "one-word"
        ),
        param(
            Face(
                fallbacks = ("SF Mono", "monospace"),
                family    = "JetBrains Mono",
                package   = "p"
            ),
            '"JetBrains Mono", "SF Mono", monospace',
            id = "spaced"
        )
    ]
)
def test_a_stack_quotes_each_family_whose_name_holds_a_space(face: Face, stack: str):
    """
    Asserts that a face's stack leads with its family, follows with its
    fallbacks in order, and quotes each name holding a space.
    """
    assert face.stack == stack


@mark.parametrize(
    "hex",
    [
        param("#76401", id="short"),
        param("#76401G", id="not-hex"),
        param("#76401A", id="uppercase")
    ]
)
def test_a_color_refuses_other_than_six_hex_digits(hex: str):
    """
    Asserts that a color refuses a value other than `#` and six lowercase
    hexadecimal digits.
    """
    with raises(ValidationError, match="hex"):
        Color(hex=hex, name="Walnut")


@mark.parametrize(
    ("scheme", "run", "quiet"),
    [("dark", "#e3c3a3", "#a1a09e"), ("light", "#764017", "#4f4e4e")]
)
def test_an_identity_fills_each_group_with_its_role(scheme: str, run: str, quiet: str):
    """
    Asserts that each group drawn in `currentColor` has its `data-role` and
    its fill replaced by the color that role takes in the scheme, leaving a
    fill with no role and every other attribute as they stand.
    """
    svg = (
        '<svg><g data-role="run" fill="currentColor" stroke="none"/>'
        '<g data-role="quiet" fill="currentColor"/><g fill="currentColor"/></svg>'
    )

    assert Identity().filled(scheme, svg) == (
        f'<svg><g fill="{run}" stroke="none"/><g fill="{quiet}"/>'
        '<g fill="currentColor"/></svg>'
    )


@mark.parametrize(("scheme", "ground"), [("dark", "#0d1117"), ("light", "#ffffff")])
def test_the_lockup_holds_its_contrast_on_github(scheme: str, ground: str):
    """
    Asserts that the lockup's wordmark holds 3:1 and its tagline 4.5:1
    on the ground GitHub draws a README on in the scheme, in the roles
    `Identity.filled` fills, the wordmark's run before the tagline's quiet.
    """
    drawn = (Path(__file__).parents[2] / "docs/assets/lockup.svg").read_text()
    page              = Color(hex=ground, name="GitHub")
    roles             = findall(r'data-role="(\w+)" fill="currentColor"', drawn)
    wordmark, tagline = (
        Identity().colored(role, scheme).contrast(page) for role in roles
    )

    assert roles == ["run", "quiet"] and wordmark >= 3 and tagline >= 4.5


def test_a_palette_names_the_tokens_its_series_take():
    """
    Asserts that the series are the tokens numbered as a chart's, in order.
    """
    assert Palette().series == tuple(f"series_{number}" for number in range(1, 7))


def test_mixed_matches_color_mix_in_oklab():
    """
    Asserts that a share of 100 keeps the first color and a share of 0 the
    second, and that the middle of black and white is the gray a browser's
    `color-mix(in oklab, ...)` computes, the name stating the mix.
    """
    black = Color(hex="#000000", name="Black")
    white = Color(hex="#ffffff", name="White")

    assert black.mixed(white, 100).hex == "#000000"
    assert black.mixed(white, 0).hex == "#ffffff"
    assert black.mixed(white, 50) == Color(hex="#636363", name="Black 50% White")


@mark.parametrize(
    ("first", "second", "ratio"),
    [
        param("#000000", "#ffffff", 21, id="black-on-white"),
        param("#ffffff", "#000000", 21, id="either-order"),
        param("#777777", "#777777", 1, id="itself"),
        param("#777777", "#ffffff", 4.478, id="under-the-text-gate")
    ]
)
def test_contrast_measures_the_ratio_wcag_defines(
    first  : str,
    second : str,
    ratio  : float
):
    """
    Asserts the contrast of known pairs, in either order, the WCAG 2.2
    formula's ends at 21 and 1.
    """
    assert Color(hex=first, name="a").contrast(Color(hex=second, name="b")) == approx(
        ratio,
        abs = 0.001
    )


@mark.parametrize(
    ("channel", "encoded"),
    [
        param(-1, 0, id="below-the-gamut"),
        param(0, 0, id="zero"),
        param(0.0031308, 10, id="the-linear-segment"),
        param(0.5, 188, id="the-curve"),
        param(1, 255, id="one"),
        param(2, 255, id="above-the-gamut")
    ]
)
def test_byte_encodes_a_channel_and_holds_it_in_the_gamut(channel: float, encoded: int):
    """
    Asserts that a linear channel encodes through both segments of the sRGB
    transfer function and stops at either end of the gamut.
    """
    assert byte(channel) == encoded


def test_schemed_colors_a_current_color_drawing_in_each_schemes_lead():
    """
    Asserts that `schemed` sets a stylesheet filling every path in
    Walnut on a light ground and in Cashmere on a dark one, and drops the
    `currentColor` fill the drawing carried.
    """
    svg = '<svg viewBox="0 0 1 1"><path fill="currentColor" d="M0 0"/></svg>'

    assert Palette().schemed(svg) == (
        '<svg viewBox="0 0 1 1"><style>path{fill:#764017}'
        "@media (prefers-color-scheme:dark){path{fill:#e3c3a3}}</style>"
        '<path d="M0 0"/></svg>'
    )


@mark.parametrize(
    ("paint", "hexed"),
    [
        param("black", "#000000", id="black"),
        param("white", "#ffffff", id="white"),
        param("primary", "#764017", id="token"),
        param(("black", 50, "white"), "#636363", id="mix")
    ]
)
def test_painted_resolves_a_token_a_word_and_a_mix(
    paint : str | tuple[str, int, str],
    hexed : str
):
    """
    Asserts that a paint resolves to the color it draws, whichever of its
    forms it takes.
    """
    assert Palette().painted(paint).hex == hexed


def test_the_identity_writes_each_faces_stack_into_its_json():
    """
    Asserts that the JSON the site imports carries the card's size, each
    face's computed stack beside its family and fallbacks, and every palette
    entry under its token.
    """
    dumped = Identity().model_dump(mode="json")

    assert dumped["faces"]["display"] == {
        "family"    : "Hedvig Letters Serif",
        "license"   : "SIL Open Font License 1.1",
        "package"   : "@fontsource-variable/hedvig-letters-serif",
        "stack"     : '"Hedvig Letters Serif", Georgia, serif',
        "fallbacks" : ["Georgia", "serif"]
    }
    assert dumped["card"] == {"height": 600, "width": 1200, "wordmark": 15}
    assert set(dumped["palette"]) == set(Palette.model_fields)
    assert set(dumped["meanings"]["palette"]) == set(Palette.model_fields)
    assert set(dumped["meanings"]["faces"]) == set(dumped["faces"])
    assert dumped["roles"]["run"] == {
        "dark"  : "light",
        "kind"  : "text",
        "light" : "primary"
    }


@mark.parametrize(
    ("scheme", "word"),
    [
        param("light", "primary", id="token"),
        param("dark", "primary 40% white", id="mix")
    ]
)
def test_a_role_words_each_schemes_paint(scheme: str, word: str):
    """
    Asserts that a role writes a token as it stands and a mix as its first
    token, its share, and its second.
    """
    role = Role(dark=("primary", 40, "white"), kind="text", light="primary")

    assert role.worded(scheme) == word
