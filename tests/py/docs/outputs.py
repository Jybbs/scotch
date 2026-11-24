"""
Pins how each kind of `Output` renders its file and compares the file on
disk with that rendering, meaning a `Document` written whole, the `Figures`
set between markers inside sentences, the `Footnotes` closing a Markdown
file, and the `Region` written between two markers of a page.
"""

from pathlib import Path
from pytest  import mark, param, raises

from scotch.citations.pages   import Mismatch
from scotch.citations.schemas import References
from scotch.docs.outputs      import Document, Figures, Footnotes, Output, Region


def test_a_document_names_its_drift_and_reads_a_missing_file_as_empty(tmp_path: Path):
    """
    Asserts that a document whose file is missing or holds other text
    reports one problem naming no line, and none once the file holds its
    rendering.
    """
    document = Document(path=Path("note.txt"), render=lambda: "text\n")
    drifted  = [(None, "The file has drifted from what `scotch render docs` writes")]

    assert document.problems(tmp_path) == drifted
    (tmp_path / "note.txt").write_text("other\n")
    assert document.problems(tmp_path) == drifted
    (tmp_path / "note.txt").write_text("text\n")
    assert document.problems(tmp_path) == []


def test_a_document_writes_its_json_and_writes_nothing_once_current(tmp_path: Path):
    """
    Asserts that a JSON document writes what its call returns, indented by
    two spaces with every character kept and a closing newline, creating its
    folder, and that a second write finds the file current and leaves it.
    """
    document = Document.from_value(
        Path("rendered/data.json"),
        lambda: {"n": 1, "name": "Réti"}
    )

    assert document.write(tmp_path) is True
    assert (tmp_path / "rendered" / "data.json").read_text() == (
        '{\n  "n": 1,\n  "name": "Réti"\n}\n'
    )
    assert document.write(tmp_path) is False


def test_a_region_writes_its_text_between_its_markers():
    """
    Asserts that a region replaces what its markers enclose with what its
    call returns, set on lines of its own, leaving the rest of the page.
    """
    region = Region(name="table", path=Path("page.md"), render=lambda: "| new |")

    assert region.rendered(
        "Above.\n\n<!-- table -->\n| old |\n<!-- /table -->\n\nBelow.\n"
    ) == "Above.\n\n<!-- table -->\n| new |\n<!-- /table -->\n\nBelow.\n"


def test_an_output_kind_must_declare_its_rendering():
    """
    Asserts that `Output` itself, which declares no `rendered`, cannot be
    built.
    """
    with raises(TypeError, match="abstract"):
        Output(path=Path("page.md"))


def test_figures_fill_a_name_carrying_a_decade():
    """
    Asserts that a pair of markers whose name carries digits, as the median
    of each decade on the Data pages does, takes its figure.
    """
    figures = Figures(path=Path("page.md"), values=lambda: {"median-1980": "41"})
    marked  = "Ends by move <!-- median-1980 -->{}<!-- /median-1980 -->.\n"

    assert figures.rendered(marked.format(0)) == marked.format(41)


def test_figures_fill_each_named_pair_of_markers_and_leave_the_rest():
    """
    Asserts that each pair of markers on one line naming a figure takes the
    figure's text, two pairs of one name on one line each taking it, and
    a pair naming a figure the call leaves out or split across two lines
    stands as it was.
    """
    marked = "Holds <!-- games -->{}<!-- /games --> in <!-- files -->2<!-- /files -->\n"
    split   = "<!-- games -->9\n<!-- /games -->\n"
    twice   = "<!-- games -->9<!-- /games --> of <!-- games -->9<!-- /games -->\n"
    figures = Figures(path=Path("page.md"), values=lambda: {"games": "1,234"})

    assert figures.rendered(marked.format(9)) == marked.format("1,234")
    assert figures.rendered(split) == split
    assert figures.rendered(twice) == twice.replace(">9<", ">1,234<")


@mark.parametrize(
    "text",
    [
        param("No markers.\n", id="missing"),
        param("<!-- table -->\nOpened only.\n", id="unclosed"),
        param("<!-- /table -->\n<!-- table -->\n", id="reversed"),
        param(
            "<!-- table -->\n<!-- /table -->\n<!-- table -->\n<!-- /table -->\n",
            id = "twice"
        ),
        param(
            "Names `<!-- table -->` in prose.\n<!-- table -->\n<!-- /table -->\n",
            id = "named"
        ),
        param(
            "<!-- /table -->\n<!-- table -->\n<!-- /table -->\n",
            id = "closed-before"
        ),
        param(
            "<!-- table -->\n<!-- /table -->\n<!-- /table -->\n",
            id = "closed-after"
        )
    ]
)
def test_a_region_refuses_a_page_without_one_pair_of_markers(text: str):
    """
    Asserts that a region raises `ValueError` on a page holding other than
    one opening marker followed by one closing marker, which a mention of
    the marker in the page's own prose counts against.
    """
    region = Region(name="table", path=Path("page.md"), render=lambda: "")

    with raises(ValueError, match="^holds other than one <!-- table -->"):
        region.rendered(text)


def test_footnotes_read_no_sources_for_a_page_citing_none(tmp_path: Path):
    """
    Asserts that footnotes compare and render a page that cites and defines
    no source without reading the sources, so a page of plain prose passes
    even while the bibliography cannot be read.
    """

    def unreadable() -> References:
        """
        Raises `ValueError`, as an unreadable bibliography does.
        """
        raise ValueError("unreadable")

    footnotes = Footnotes(path=Path("page.md"), references=unreadable)
    (tmp_path / "page.md").write_text("Plain prose.\n")

    assert footnotes.problems(tmp_path) == []
    assert footnotes.rendered("Plain prose.\n") == "Plain prose.\n"


def test_footnotes_report_a_citing_page_lacking_its_closing_newline(
    references : References,
    tmp_path   : Path
):
    """
    Asserts that footnotes report a citing page whose definitions all match
    but whose closing newline is missing as drifted on no line, since the
    rendering writes that newline.
    """
    footnotes = Footnotes(path=Path("page.md"), references=lambda: references)
    (tmp_path / "page.md").write_text(
        f"A claim.[^fide2023]\n\n{references.cite('fide2023')}"
    )

    assert footnotes.problems(tmp_path) == [
        (None, "The file has drifted from what `scotch render docs` writes")
    ]


def test_footnotes_set_and_compare_the_definitions_a_page_cites(
    references : References,
    tmp_path   : Path
):
    """
    Asserts that footnotes render a page with the definition of each source
    it cites at its end, and report a definition the page lacks at the
    page's last line, since it belongs past the end.
    """
    footnotes = Footnotes(path=Path("page.md"), references=lambda: references)
    (tmp_path / "page.md").write_text("A claim.[^fide2023]\n")

    assert footnotes.problems(tmp_path) == [
        (1, Mismatch(key="fide2023", line=1).problem)
    ]
    assert footnotes.rendered("A claim.[^fide2023]\n") == (
        f"A claim.[^fide2023]\n\n{references.cite('fide2023')}\n"
    )
