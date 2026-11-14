"""
Pins what `scotch publish store` writes and prints for the index under the
data directory, and the problem it names where it exits nonzero.
"""

from common.app import invoke
from json       import loads
from pathlib    import Path
from pytest     import CaptureFixture, mark


@mark.usefixtures("indexed")
def test_a_publish_writes_the_store_beside_a_manifest_naming_it(
    capsys : CaptureFixture[str],
    data   : Path
):
    """
    Asserts that a publish writes one file under a name hashed from its
    bytes into the `store` folder, beside a manifest naming it and the bytes
    its head takes, and prints its path, replacing what an earlier publish
    left there.
    """
    (data / "store").mkdir()
    (data / "store" / "stale.bin").write_bytes(b"stale")

    assert invoke("publish", "store") == 0

    manifest = loads((data / "store" / "manifest.json").read_text())
    path     = data / "store" / manifest["store"]

    assert sorted(file.name for file in (data / "store").iterdir()) == sorted(
        ("manifest.json", path.name)
    )
    assert 0 < manifest["head"] < path.stat().st_size
    assert capsys.readouterr().out == f"Published {path}\n"


def test_a_missing_index_exits_naming_where_it_was_looked_for(data: Path):
    """
    Asserts that a publish with no index built under the data directory
    exits nonzero naming the directory it read, leaving the store an earlier
    publish wrote in place.
    """
    (data / "store").mkdir()
    (data / "store" / "manifest.json").write_text("{}")

    assert invoke(
        "publish",
        "store"
    ) == f"No index has been built under {data / 'index'}"
    assert (data / "store" / "manifest.json").read_text() == "{}"


def test_an_index_holding_another_layout_exits_naming_where_it_was_read(relaid: Path):
    """
    Asserts that a publish against an index whose games table lacks a column
    exits nonzero naming the directory it read.
    """
    assert invoke(
        "publish",
        "store"
    ) == f"The index under {relaid} holds another layout"
