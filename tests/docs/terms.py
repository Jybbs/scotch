"""
Pins `Terms`, meaning the fragment each term's heading takes and the section
the terms page sets for each, against the file the package ships.
"""

from pytest import mark, param

from scotch.docs.terms import Term, Terms


@mark.parametrize(
    ("name", "anchor"),
    [
        param("Ply", "ply", id="one-word"),
        param("The Parting Move", "the-parting-move", id="spaced")
    ]
)
def test_a_term_writes_the_fragment_its_heading_takes(name: str, anchor: str):
    """
    Asserts that a term's anchor is its name in lowercase with each space a
    hyphen, as the site's renderer writes a heading's fragment.
    """
    term = Term(
        address  = "a.md",
        label    = "A",
        name     = name,
        pattern  = "a",
        sentence = "A."
    )

    assert term.anchor == anchor


def test_the_page_sets_each_terms_heading_above_its_sentence_and_link():
    """
    Asserts that the page holds each term alphabetically, as the file
    declares them, each heading above its one sentence and the link
    explaining it.
    """
    terms = Terms.read()
    first = terms.terms[0]

    assert terms.page.split("\n\n")[:2] == [
        f"### {first.name}",
        f"{first.sentence} [{first.label}]({first.address})."
    ]
    assert [term.name for term in terms.terms] == [
        "Key", "Mainline", "Ply", "Run", "The Parting Move", "Transposition"
    ]
