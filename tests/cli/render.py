"""
Pins what `scotch render docs` writes and prints, meaning the files it
renders from the declarations alone where no index has been built and from
the index as well where one has, the path of each file it changed, and the
error it exits on where the index or a page cannot be read.
"""

from common.app import invoke
from pathlib    import Path
from polars     import read_parquet
from pytest     import CaptureFixture, MonkeyPatch, mark

from scotch.docs.inventory import Outputs
from scotch.docs.outputs   import Region
from scotch.index.tables   import PositionIndex


@mark.usefixtures("indexed")
def test_render_with_an_index_writes_its_files_and_then_changes_nothing(
    capsys  : CaptureFixture[str],
    shipped : list[tuple[Path, Path, PositionIndex | None]]
):
    """
    Asserts that, where an index has been built, the command hands it to the
    outputs and prints each file it wrote, and that a second run finds every
    file current and prints nothing.
    """
    invoke("render", "docs")

    assert isinstance(shipped[0][2], PositionIndex)
    assert capsys.readouterr().out == "Rendered declared.txt\nRendered measured.txt\n"

    invoke("render", "docs")

    assert capsys.readouterr().out == ""


@mark.usefixtures("indexed", "shipped")
def test_render_against_an_index_of_another_layout_exits_naming_it(
    data     : Path,
    tmp_path : Path
):
    """
    Asserts that a render against an index whose games table lacks a column
    exits nonzero naming the directory it read, writing nothing.
    """
    games = data / "index" / "games.parquet"
    read_parquet(games).drop("errors").write_parquet(games)

    assert invoke("render", "docs") == (
        f"The index under {data / 'index'} holds another layout"
    )
    assert not (tmp_path / "root" / "declared.txt").exists()


@mark.usefixtures("data", "shipped")
def test_render_of_a_page_whose_markers_are_broken_exits_naming_it(
    monkeypatch : MonkeyPatch,
    tmp_path    : Path
):
    """
    Asserts that a render of a page holding an opening marker with no
    closing one exits nonzero naming the page and its markers rather than
    raising.
    """
    (tmp_path / "root" / "page.md").write_text("<!-- table -->\n")
    monkeypatch.setattr(
        Outputs,
        "shipped",
        classmethod(
            lambda cls, app, readme, root, index=None: cls(
                [Region(name="table", path=Path("page.md"), render=lambda: "")]
            )
        )
    )

    assert invoke("render", "docs") == (
        "page.md: holds other than one <!-- table --> followed by one <!-- /table -->"
    )


def test_render_without_an_index_writes_the_declared_files_and_says_so(
    capsys   : CaptureFixture[str],
    data     : Path,
    shipped  : list[tuple[Path, Path, PositionIndex | None]],
    tmp_path : Path
):
    """
    Asserts that, where no index has been built under the data directory,
    the command names the index folder it found empty, hands the outputs the
    README the manifest names and the project's root, writes each file the
    declarations render, and prints each path it changed.
    """
    assert invoke("render", "docs") == 0
    assert shipped == [(Path(".github/README.md"), tmp_path / "root", None)]
    assert capsys.readouterr().out == (
        "Left the files the index renders into as they stand, since no index has"
        f" been built under {data / 'index'}\nRendered declared.txt\n"
    )
    assert (tmp_path / "root" / "declared.txt").read_text() == "declared\n"
