"""
Pins the identity the site and its cards are drawn in, meaning the font
stack each face writes, the colors a palette entry accepts, the fill
`Color.filled` and the stylesheet `Palette.schemed` set on an SVG drawn in
`currentColor`, and the JSON the site's stylesheets import.
"""

from pydantic import ValidationError
from pytest   import mark, param, raises

from scotch.identity.schemas import Color, Face, Identity, Palette


@mark.parametrize(
    ("face", "stack"),
    [
        param(
            Face(fallbacks=("Georgia", "serif"), family="Petrona"),
            "Petrona, Georgia, serif",
            id = "one-word"
        ),
        param(
            Face(fallbacks=("SF Mono", "monospace"), family="JetBrains Mono"),
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


def test_a_color_fills_an_svg_drawn_in_current_color():
    """
    Asserts that each fill drawn in `currentColor` takes the color's hex,
    leaving every other attribute as it stands.
    """
    svg = '<svg><g fill="currentColor" stroke="none"><path d="M0 0"/></g></svg>'

    assert Color(hex="#764017", name="Walnut").filled(svg) == (
        '<svg><g fill="#764017" stroke="none"><path d="M0 0"/></g></svg>'
    )


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


def test_the_identity_writes_each_faces_stack_into_its_json():
    """
    Asserts that the JSON the site imports carries each face's computed
    stack beside its family and fallbacks, and every palette entry under
    its token.
    """
    dumped = Identity().model_dump(mode="json")

    assert dumped["faces"]["display"] == {
        "family"    : "Hedvig Letters Serif",
        "stack"     : '"Hedvig Letters Serif", Georgia, serif',
        "fallbacks" : ["Georgia", "serif"]
    }
    assert set(dumped["palette"]) == set(Palette.model_fields)
