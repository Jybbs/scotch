"""
Pins what `scotch cite source` prints for the keys it is given, read from
the bibliography under the project's root, and the status it exits with.
"""

from common.app import invoke
from pathlib    import Path
from pytest     import CaptureFixture, MonkeyPatch, mark

from scotch.citations.schemas import References


def test_cite_against_a_bibliography_it_cannot_read_exits_naming_the_block(
    monkeypatch : MonkeyPatch,
    tmp_path    : Path
):
    """
    Asserts that the command, run against a bibliography holding a block
    bibtexparser aborts on, exits nonzero naming the block's line and why it
    could not be read, rather than raising.
    """
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "references.bib").write_text(
        "@misc{doe2020, title = {T}, year = 2020\n@misc{roe2021, title = {U}}\n"
    )
    monkeypatch.setattr("scotch.cli.cite.root", lambda: tmp_path)
    exited = invoke("cite", "source", "doe2020")

    assert exited.startswith("Line 1 of ")
    assert "could not read: Unexpected block start" in exited


@mark.usefixtures("bibliography")
def test_cite_exits_naming_each_unknown_key_and_prints_no_definition(
    capsys: CaptureFixture[str]
):
    """
    Asserts that the command exits naming one line for each key the
    bibliography holds no entry for, and prints no definition, not even a
    known key's.
    """
    assert invoke("cite", "source", "doe2020", "roe2021") == (
        "roe2021 names no entry in docs/references.bib"
    )
    assert capsys.readouterr().out == ""


@mark.usefixtures("bibliography")
def test_cite_prints_each_definition_in_the_order_given(
    capsys     : CaptureFixture[str],
    references : References
):
    """
    Asserts that the command prints the definition of each key in the order
    given, with a blank line between two of them, and exits zero.
    """
    assert invoke("cite", "source", "zobrist1970", "doe2020") == 0
    assert capsys.readouterr().out == references.cite("zobrist1970", "doe2020") + "\n"
