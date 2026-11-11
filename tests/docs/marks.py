"""
Pins `Marks`, meaning the subpaths the reader of a tracked SVG's path data
measures, the size each stop states and each length the construction draws,
each read from the SVGs the repository tracks, and the two tables the
identity page sets beneath them.
"""

from pathlib import Path
from pytest  import MonkeyPatch, fixture, mark, param

from scotch.docs.marks       import Box, Drawing, Marks, subpaths
from scotch.identity.schemas import Card, Identity


@fixture(scope="module")
def marks() -> Marks:
    """
    Reads the marks of the SVGs the repository tracks.
    """
    return Marks.read(Path(__file__).parents[2])


@mark.parametrize(
    ("d", "points"),
    [
        param("M1 2L3 4", [[(1, 2), (3, 4)]], id="line"),
        param("M1 2H5V7", [[(1, 2), (5, 2), (5, 7)]], id="level-and-upright"),
        param(
            "M0 0L1 1ZM2 2L3 3Z",
            [[(0, 0), (1, 1)], [(2, 2), (3, 3)]],
            id = "two-subpaths"
        ),
        param("M-1.5 2L3 -4", [[(-1.5, 2), (3, -4)]], id="signs-and-points")
    ]
)
def test_subpaths_reads_each_subpaths_points(
    d      : str,
    points : list[list[tuple[float, float]]]
):
    """
    Asserts that a path's data splits into a list of points at each `M`,
    each level or upright line keeping the coordinate it does not state.
    """
    assert list(subpaths(d)) == points


def test_a_drawing_reads_its_view_and_paths_and_scales_by_its_ratio(tmp_path: Path):
    """
    Asserts that a drawing reads its `viewBox` and each path's data, each
    box around one subpath of the first, and that it rounds a size at its
    ratio.
    """
    svg = tmp_path / "a.svg"
    svg.write_text(
        '<svg viewBox="0 -10 20 40"><path fill="red" d="M0 0L2 3M4 5L6 7"/>'
        '<path d="M1 1"/></svg>'
    )
    drawing = Drawing.read(svg)

    assert drawing.view == (0, -10, 20, 40)
    assert drawing.paths == ("M0 0L2 3M4 5L6 7", "M1 1")
    assert drawing.boxes == [
        Box(
            bottom = 3,
            left   = 0,
            right  = 2,
            top    = 0
        ),
        Box(
            bottom = 7,
            left   = 4,
            right  = 6,
            top    = 5
        )
    ]
    assert (drawing.height(5), drawing.width(5)) == (10, 2)


def test_each_length_is_measured_from_the_marks_subpaths(marks: Marks):
    """
    Asserts each length of the tracked mark, in the order the construction
    draws them, the mark holding one compound path of five subpaths.
    """
    assert len(marks.mark.paths) == 1
    assert len(marks.mark.boxes) == 5
    assert [guide.length for guide in marks.guides] == [
        553, 791, 11, 40, 749,
        80, 60, 144, 249
    ]


def test_guides_name_subpaths_the_mark_holds(marks: Marks):
    """
    Asserts that each guide of the mark names at least one subpath of the
    five it holds, the kings' reach naming the cross and the lower opening.
    """
    assert all(
        guide.owners and set(guide.owners) <= set(range(5)) for guide in marks.guides
    )
    assert marks.guides[4].owners == (4, 2)


def test_subpaths_samples_a_curve_along_its_length():
    """
    Asserts that a quadratic curve yields its 64 samples, ending on its far
    point, its middle where the curve's formula puts it rather than at its
    control point.
    """
    [points] = subpaths("M0 0Q10 20 20 0")

    assert len(points) == 65
    assert points[32] == (10, 10)
    assert points[-1] == (20, 0)


def test_the_stops_run_by_width_each_size_read_from_its_svg(marks: Marks):
    """
    Asserts that the stops run from the narrowest to the widest, the favicon
    and the nav mark measured from the mark's ratio of 633 to 870 at 16 and
    24 tall.
    """
    assert [(stop.name, stop.width, stop.height) for stop in marks.stops] == [
        ("Favicon", 12, 16),
        ("Nav mark", 17, 24),
        ("Wordmark", 384, 102),
        ("Link card", 400, 200),
        ("Lockup", 560, 186)
    ]


@mark.parametrize(
    ("card", "drawn", "said"),
    [
        param(
            Card(),
            (400, 200),
            "The drawing shows a link card at a third of its 1200 by 600 pixels, "
            "with the wordmark at 60 of the drawing's 400 and at 180 on the card, "
            "above the section's name and the two games' rails.",
            id = "declared"
        ),
        param(
            Card(height=750, width=1500, wordmark=20),
            (500, 250),
            "The drawing shows a link card at a third of its 1500 by 750 pixels, "
            "with the wordmark at 100 of the drawing's 500 and at 300 on the card, "
            "above the section's name and the two games' rails.",
            id = "resized"
        )
    ]
)
def test_the_link_card_stop_draws_the_declared_card_at_a_third(
    card        : Card,
    drawn       : tuple[int, int],
    monkeypatch : MonkeyPatch,
    said        : str
):
    """
    Asserts that the link card stop is drawn at a third of the card the
    identity declares and states the card's true size and its wordmark's
    width, so a change to the card reaches both the drawing and its
    sentence.
    """
    monkeypatch.setattr("scotch.docs.marks.Identity", lambda: Identity(card=card))
    stop = next(
        stop
        for stop in Marks.read(Path(__file__).parents[2]).stops
        if stop.name == "Link card"
    )

    assert (stop.width, stop.height) == drawn
    assert stop.sentence == said


def test_the_tables_hold_each_size_and_each_length(marks: Marks):
    """
    Asserts that the identity page's two tables set a row per stop and a
    row per length under their headers, each reading its figures from the
    record.
    """
    assert marks.sizes.splitlines()[0] == (
        "| **Mark** | **Width** | **Height** | **Where** |"
    )
    assert marks.sizes.splitlines()[2].startswith("| Favicon | 12 | 16 |")
    assert marks.lengths.splitlines()[2] == (
        "| The S's width | 553 | From the bowl on the left to the bowl on the right |"
    )
