"""
Pins how `Page` finds the sources a Markdown file cites and rebuilds the
file with the definition of each one at its end, in the order the file first
cites them, and the `Mismatch` it reports at each line where a file differs
from that form.
"""

from pytest import mark, param, raises

from scotch.citations.pages   import Mismatch, Page
from scotch.citations.schemas import References


def define(references: References, *keys: str) -> str:
    """
    Writes the closing definitions `Page.cited` sets for `keys`.
    """
    return f"\n\n{references.cite(*keys)}\n"


def test_a_definition_no_marker_cites_is_dropped(references: References):
    """
    Asserts that a page defining a source it no longer cites loses the
    definition and closes on one newline.
    """
    text = "The claim moved away.\n\n[^doe2020]: A definition left behind.\n"

    assert Page(text=text).cited(references) == "The claim moved away.\n"


@mark.parametrize(
    "text",
    [
        param("A page citing nothing.\n", id="no-marker"),
        param("A note of its own.[^1]\n\n[^1]: The note.\n", id="own-footnote"),
        param(
            "Cites nothing.\n\n<!-- Cite [^doe2020] once it settles. -->\n",
            id = "marker-in-html"
        ),
        param("Closes on blank lines.\n\n\n", id="trailing-blank-lines")
    ]
)
def test_a_page_citing_no_source_stands_as_it_was(references: References, text: str):
    """
    Asserts that a page citing no source and defining none is returned as it
    stands, its own footnotes included, and a marker inside an HTML comment
    cites nothing.
    """
    assert Page(text=text).cited(references) == text


def test_a_definition_out_of_order_is_reported_where_it_belongs(references: References):
    """
    Asserts that of two definitions standing in another order than the
    page first cites them, the one out of place is reported at the line it
    belongs ahead of, the other lining up with the written form.
    """
    text = "First.[^fide2023] Then.[^doe2020]" + define(
        references,
        "doe2020",
        "fide2023"
    )

    assert Page(text=text).drifted(references) == [Mismatch(key="fide2023", line=3)]


def test_a_long_page_names_the_one_definition_out_of_place(references: References):
    """
    Asserts that on a page longer than 200 lines, past which difflib's
    automatic junk heuristic would skip the frequent blank lines, a
    definition set ahead of the two it belongs behind is the one mismatch,
    at its own line.
    """
    doe, fide, zobrist = (
        references.references[key].definition
        for key in ("doe2020", "fide2023", "zobrist1970")
    )
    text = (
        "A.[^doe2020] B.[^fide2023] C.[^zobrist1970]\n\n"
        + "Text.\n\n" * 110
        + f"{zobrist}\n\n{doe}\n\n{fide}\n"
    )

    assert Page(text=text).drifted(references) == [Mismatch(
        key  = "zobrist1970",
        line = 223
    )]


def test_a_marker_naming_no_entry_raises_naming_its_line(references: References):
    """
    Asserts that a marker whose key the bibliography holds no entry for
    raises `ValueError` naming the line of the block it sits in.
    """
    with raises(ValueError, match="^line 3: roe2021 names no entry in"):
        Page(text="A first paragraph.\n\nA claim.[^roe2021]\n").cited(references)


def test_a_page_in_the_written_form_has_drifted_nowhere(references: References):
    """
    Asserts that a page holding exactly what `cited` writes reports no
    mismatch.
    """
    text = "A claim.[^doe2020]" + define(references, "doe2020")

    assert Page(text=text).drifted(references) == []


def test_citations_read_a_marker_in_a_table_at_its_row():
    """
    Asserts that a marker in a table's body is read at the row holding it,
    as markdown-it's default rules parse a table.
    """
    page = Page(text="Intro.\n\n| **A** | **B** |\n|---|---:|\n| x[^doe2020] | 1 |\n")

    assert page.citations == [(5, "doe2020")]


def test_citations_read_each_marker_beside_its_blocks_first_line():
    """
    Asserts that `citations` lists every marker shaped as a source's key in
    the order a reader meets them, each beside the first line of its block,
    leaving out a footnote whose label is no source's key.
    """
    page = Page(
        text = (
            "Line one.[^doe2020]\n"
            "line two.[^1][^Doe2020][^doe2020-draft]\n\n"
            "Another.[^fide2023]\n"
        )
    )

    assert page.citations == [(1, "doe2020"), (4, "fide2023")]


def test_cited_sets_each_definition_in_the_order_first_cited(references: References):
    """
    Asserts that a page citing two sources, one of them twice, closes on
    the definition of each in the order a reader first meets it, replacing a
    stale definition and keeping a footnote whose label is no source's key.
    """
    text = (
        "One claim.[^fide2023] Two claims.[^doe2020][^fide2023]\n\n"
        "[^old]: A note of the page's own.\n\n[^doe2020]: A stale definition.\n"
    )

    assert Page(text=text).cited(references) == (
        "One claim.[^fide2023] Two claims.[^doe2020][^fide2023]\n\n"
        "[^old]: A note of the page's own." + define(references, "fide2023", "doe2020")
    )


@mark.parametrize(
    ("blanks", "line"),
    [
        param(2, 5, id="one-blank-line-too-many"),
        param(0, 4, id="one-blank-line-too-few")
    ]
)
def test_a_change_to_the_blank_lines_between_definitions_names_no_source(
    blanks     : int,
    line       : int,
    references : References
):
    """
    Asserts that a blank line added or dropped between two definitions is
    one mismatch naming no source, although the parser reads the blank lines
    after a definition as part of it.
    """
    doe, fide = (references.references[key].definition for key in (
        "doe2020", "fide2023"
    ))
    text = (
        f"A claim.[^doe2020] Another.[^fide2023]\n\n{doe}\n"
        + "\n" * blanks
        + f"{fide}\n"
    )

    assert Page(text=text).drifted(references) == [Mismatch(line=line)]


@mark.parametrize(
    ("text", "mismatches"),
    [
        param(
            "A claim.[^doe2020]\n\n[^doe2020]: A stale definition.\n\n"
            "A closing line.\n",
            [Mismatch(key="doe2020", line=3)],
            id = "prose-after-the-definitions"
        ),
        param(
            "A claim.[^doe2020]\n\n[^doe2020]: A definition edited by hand.\n",
            [Mismatch(key="doe2020", line=3)],
            id = "edited"
        ),
        param(
            "A claim.[^doe2020] Another.[^fide2023]\n\n[^doe2020]: Stale.\n"
            "[^fide2023]: Stale.\n",
            [Mismatch(key="doe2020", line=3), Mismatch(key="fide2023", line=4)],
            id = "two-edited-on-adjacent-lines"
        ),
        param(
            "A claim.[^doe2020]\n",
            [Mismatch(key="doe2020", line=1)],
            id = "missing-at-the-end"
        ),
        param(
            "A claim.[^doe2020]\n\n\n\n[^doe2020]: Doe, Jane, Richard Q. Roe, and"
            ' Edgar Poe. 2020. "Can a Key Repeat?" <https://example.com/doe>\n',
            [Mismatch(line=3)],
            id = "blank-lines"
        )
    ]
)
def test_a_drifted_page_names_each_line_that_differs(
    mismatches : list[Mismatch],
    references : References,
    text       : str
):
    """
    Asserts that a definition edited by hand is reported at its own line, a
    definition the page lacks at the page's last line, and a change to the
    blank lines alone as one mismatch naming no source.
    """
    assert Page(text=text).drifted(references) == mismatches


def test_two_changes_to_the_blank_lines_are_two_mismatches(references: References):
    """
    Asserts that a blank line added ahead of the first definition and one
    added between the two are each a mismatch naming no source, at its own
    line.
    """
    doe, fide = (references.references[key].definition for key in (
        "doe2020", "fide2023"
    ))
    text = f"A claim.[^doe2020] Another.[^fide2023]\n\n\n{doe}\n\n\n{fide}\n"

    assert Page(text=text).drifted(references) == [Mismatch(line=2), Mismatch(line=6)]


@mark.parametrize(
    ("mismatch", "problem"),
    [
        param(
            Mismatch(key="doe2020", line=3),
            "The doe2020 footnote differs from its entry in docs/references.bib or"
            " sits out of the order the file first cites it in",
            id = "source"
        ),
        param(
            Mismatch(line=2),
            "The blank lines around the footnote definitions have drifted",
            id = "blank-lines"
        )
    ]
)
def test_a_mismatch_describes_what_differs(mismatch: Mismatch, problem: str):
    """
    Asserts the words the audit prints for a mismatch naming a source and
    for one naming only the blank lines.
    """
    assert mismatch.problem == problem
