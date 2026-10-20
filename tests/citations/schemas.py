"""
Pins what `References` reads out of a BibTeX file and the footnote
definition each `Reference` writes, meaning the authors in the order a
definition names them, the stop that closes a title, the note, and the
address, beside the lines naming a key no entry holds.
"""

from pathlib  import Path
from pydantic import ValidationError
from pytest   import mark, param, raises

from scotch.citations.schemas import Reference, References


@mark.parametrize(
    ("key", "definition"),
    [
        param(
            "doe2020",
            '[^doe2020]: Doe, Jane, Richard Q. Roe, and Edgar Poe. 2020. "Can a Key'
            ' Repeat?" <https://example.com/doe>',
            id = "three-authors-and-a-question"
        ),
        param(
            "fide2023",
            '[^fide2023]: International Chess Federation. 2023. "FIDE Laws of'
            ' Chess," Article 9.2.3. <https://handbook.fide.com/chapter/E012023>',
            id = "organization-and-a-note"
        ),
        param(
            "zobrist1970",
            '[^zobrist1970]: Zobrist, Albert L. 1970. "A New Hashing Method with'
            ' Application for Game Playing," Technical Report 88, University of'
            " Wisconsin. <https://minds.wisconsin.edu/handle/1793/57624>",
            id = "one-author-closing-on-a-period"
        )
    ]
)
def test_a_definition_names_the_authors_year_title_note_and_address(
    definition : str,
    key        : str,
    references : References
):
    """
    Asserts that a definition names the first author surname first and every
    later one given names first, closes the title on a comma before a note
    and on its own question mark where it ends on one, and never doubles the
    period an author's name or a note closes on.
    """
    assert references.references[key].definition == definition


def test_a_block_bibtexparser_aborts_names_the_reason_it_aborted(tmp_path: Path):
    """
    Asserts that an entry whose field never closes before the next entry
    opens raises `ValueError` naming what bibtexparser was still looking
    for, which the aborted block's own message leaves out.
    """
    (path := tmp_path / "references.bib").write_text(
        "@misc{doe2020, title = {T}, year = 2020\n@misc{roe2021, title = {U}}\n"
    )

    with raises(
        ValueError,
        match = r"could not read: Unexpected block start: `@misc`\. .* `,` or `}`$"
    ):
        References.read(path)


def test_a_block_bibtexparser_cannot_read_names_its_line(tmp_path: Path):
    """
    Asserts that a second entry under a key the file already holds raises
    `ValueError` naming the line its block opens on and the key it repeats.
    """
    entry = "@misc{doe2020,\n  author = {Doe},\n  title = {T},\n  year = {2020}\n}\n"
    (path := tmp_path / "references.bib").write_text(f"{entry}\n{entry}")

    with raises(
        ValueError,
        match = (
            r"^Line 7 of .*references\.bib holds a block .*: Duplicate entry key "
            r"'doe2020'$"
        )
    ):
        References.read(path)


def test_a_definition_of_two_authors_sets_a_comma_before_the_and(
    references: References
):
    """
    Asserts that a definition of two authors sets a comma after the first
    author's given names before the `and`, as it does before the last of
    three, the first author surname first and the second given names first.
    """
    reference = references.references["doe2020"].model_copy(
        update = {"authors": ["Doe, Jane", "Richard Q. Roe"]}
    )

    assert reference.definition.startswith(
        "[^doe2020]: Doe, Jane, and Richard Q. Roe. 2020. "
    )


def test_a_field_decodes_the_latex_its_entry_is_written_in(references: References):
    """
    Asserts that the braces protecting a title's capitals and the backslash
    escaping an underscore drop out of the fields a definition reads.
    """
    assert references.references["fide2023"].title == "FIDE Laws of Chess"
    assert references.references["zobrist1970"].annote == (
        "Hashes a position, as zobrist_hash does."
    )


def test_a_key_carrying_a_letter_after_its_year_is_accepted():
    """
    Asserts that a key naming a second source of one name and year with a
    letter after the year is accepted as it is written.
    """
    reference = Reference(
        annote  = "Settles nothing.",
        authors = ["Doe, Jane"],
        key     = "doe2020a",
        title   = "Title",
        url     = "https://example.com/",
        year    = "2020"
    )

    assert reference.key == "doe2020a"


@mark.parametrize(
    ("title", "note", "closed"),
    [
        param("Keys Repeat!", None, '"Keys Repeat!"', id="exclamation"),
        param("Keys Repeat", None, '"Keys Repeat."', id="no-mark"),
        param(
            "Can a Key Repeat?",
            "Section 2",
            '"Can a Key Repeat?" Section 2.',
            id = "question-before-a-note"
        )
    ]
)
def test_a_title_closes_on_its_stop_or_its_own_mark(
    closed     : str,
    note       : str | None,
    references : References,
    title      : str
):
    """
    Asserts that a title carrying no note closes on a period, and that one
    ending on an exclamation mark or a question mark keeps that mark in the
    stop's place, whether a note follows it or not.
    """
    reference = references.references["doe2020"].model_copy(
        update = {"note": note, "title": title}
    )

    assert reference.definition.endswith(f"{closed} <https://example.com/doe>")


def test_a_later_author_carrying_a_suffix_reads_it_after_the_surname(tmp_path: Path):
    """
    Asserts that a later author written as surname, suffix, and given names
    reads given names first and the suffix after the surname, the first
    author keeping the order the file writes.
    """
    (tmp_path / "references.bib").write_text(
        "@misc{doe2020,\n  author = {Doe, Jane and Roe, Jr., Richard},\n"
        "  title = {T},\n  year = {2020},\n  url = {https://example.com/doe},\n"
        "  annote = {A.}\n}\n"
    )

    assert References.read(
        tmp_path / "references.bib"
    ).references["doe2020"].authors == [
        "Doe, Jane", "Richard Roe Jr."
    ]


@mark.parametrize(
    "key",
    [
        param("Doe2020", id="capital"),
        param("doe", id="no-year"),
        param("2020", id="no-name")
    ]
)
def test_a_key_not_shaped_as_a_name_and_a_year_is_refused(key: str):
    """
    Asserts that a key other than a lowercase name followed by a year and an
    optional letter raises `ValidationError`.
    """
    with raises(ValidationError, match="key"):
        Reference(
            annote  = "Settles nothing.",
            authors = ["Doe, Jane"],
            key     = key,
            title   = "Title",
            url     = "https://example.com/",
            year    = "2020"
        )


def test_an_entry_naming_no_author_is_refused_at_its_authors(tmp_path: Path):
    """
    Asserts that an entry carrying no `author` field raises
    `ValidationError` naming the `authors` field, which needs at least one
    name.
    """
    (path := tmp_path / "references.bib").write_text(
        "@misc{doe2020,\n  title = {T},\n  year = {2020},\n"
        "  url = {https://example.com/},\n  annote = {A.}\n}\n"
    )

    with raises(ValidationError, match=r"references\.doe2020\.authors"):
        References.read(path)


def test_cite_writes_each_definition_in_the_order_given(references: References):
    """
    Asserts that `cite` writes the definition of each key in the order the
    keys come, with a blank line between two of them.
    """
    fide, zobrist = (references.references[key] for key in ("fide2023", "zobrist1970"))

    assert references.cite("zobrist1970", "fide2023") == (
        f"{zobrist.definition}\n\n{fide.definition}"
    )


def test_shipped_reads_the_bibliography_under_the_root(tmp_path: Path):
    """
    Asserts that `shipped` reads `docs/references.bib` under the root it
    is given.
    """
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "references.bib").write_text(
        "@misc{doe2020,\n  author = {Doe, Jane},\n  title = {T},\n  year = {2020},\n"
        "  url = {https://example.com/},\n  annote = {A.}\n}\n"
    )

    assert list(References.shipped(tmp_path).references) == ["doe2020"]


def test_unknown_names_each_key_no_entry_holds_in_the_order_given(
    references: References
):
    """
    Asserts that `unknown` writes one line for each key the file holds no
    entry for, in the order given, and none for a key it holds.
    """
    assert references.unknown("roe2021", "doe2020", "poe1845") == [
        "roe2021 names no entry in docs/references.bib",
        "poe1845 names no entry in docs/references.bib"
    ]


@mark.parametrize(
    ("field", "opening"),
    [
        param("annote", "What the source settles", id="annote"),
        param("authors", "Each author's name", id="authors"),
        param("key", "The label a footnote cites", id="key"),
        param("note", "The part of the source", id="note"),
        param("title", "The source's title", id="title"),
        param("url", "The address a reader opens", id="url"),
        param("year", "The year the source was published", id="year")
    ]
)
def test_each_field_carries_its_own_description(field: str, opening: str):
    """
    Pins each field's description to the field it describes, since the
    formatter reorders a record's fields and leaves each docstring where
    it sat.
    """
    assert Reference.model_fields[field].description.startswith(opening)
