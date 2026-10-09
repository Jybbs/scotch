"""
Pins the records the store's sources travel in, meaning where a `Source`
lands under the downloads directory and the games it reads from there, the
declarations `sources.toml` ships and the rows `Sources` refuses, and what a
`Download` and the `Manifest` of them record.
"""

from common.sources import declare, land, zipped
from datetime       import timedelta
from hashlib        import sha256
from pathlib        import Path
from pydantic       import ValidationError
from pytest         import mark, param, raises
from re             import escape

from scotch.games.schemas   import Origin
from scotch.sources.schemas import Download, Manifest, Source, Sources


def test_a_download_reads_the_size_and_digest_of_its_file(tmp_path: Path):
    """
    Asserts that a download built from a file records the file's size, the
    SHA-256 digest of its bytes, the entity tag it is given, and the instant
    it was built in UTC.
    """
    path = tmp_path / "file.zip"
    path.write_bytes(b"games")

    download = Download.from_file(path, etag='"tag"')

    assert download.etag == '"tag"'
    assert download.fetched.utcoffset() == timedelta(0)
    assert download.sha256 == sha256(b"games").hexdigest()
    assert download.size_bytes == 5


@mark.parametrize(
    ("written", "matches"),
    [
        param(b"games", True, id="same-bytes"),
        param(b"other", False, id="other-bytes"),
        param(None, False, id="missing")
    ]
)
def test_a_download_matches_only_a_file_holding_its_bytes(
    matches  : bool,
    tmp_path : Path,
    written  : bytes | None
):
    """
    Asserts that a download matches the file at a path only where that file
    exists and holds the bytes the download was read from.
    """
    (tmp_path / "fetched.zip").write_bytes(b"games")

    if written is not None:
        (tmp_path / "file.zip").write_bytes(written)

    assert Download.from_file(tmp_path / "fetched.zip", etag=None).matches(
        tmp_path / "file.zip"
    ) is matches


def test_a_manifest_reads_back_as_it_was_written(tmp_path: Path):
    """
    Asserts that a manifest written to a directory reads back from its
    `manifest.json` with every download under its address.
    """
    (tmp_path / "file.zip").write_bytes(b"games")
    manifest = Manifest().recording(
        declare("file.zip").address,
        Download.from_file(tmp_path / "file.zip", etag='"tag"')
    )
    manifest.write(tmp_path / "missing")

    assert Manifest.read(tmp_path / "missing") == manifest


def test_a_manifest_records_a_download_again_in_its_first_place(tmp_path: Path):
    """
    Asserts that recording a second download under an address the manifest
    already holds replaces the first in its place, leaving the order of the
    addresses as they were first recorded.
    """
    (tmp_path / "file.zip").write_bytes(b"games")
    first, second = (declare(name).address for name in ("first.zip", "second.zip"))
    old, new      = (
        Download.from_file(tmp_path / "file.zip", etag=tag)
        for tag in ('"old"', '"new"')
    )

    manifest = (
        Manifest().recording(first, old)
                  .recording(second, old)
                  .recording(first, new)
    )

    assert manifest.downloads == {first: new, second: old}
    assert manifest.digests == {first: new.sha256, second: old.sha256}


def test_a_missing_manifest_reads_as_empty(tmp_path: Path):
    """
    Asserts that a directory holding no `manifest.json` reads as a manifest
    of no download.
    """
    assert Manifest.read(tmp_path) == Manifest()


def test_a_plain_pgn_file_reads_every_game_with_its_place(tmp_path: Path):
    """
    Asserts that a source fetched as one PGN file reads each of its games in
    order, each carrying the source's address and its place from 1.
    """
    source = land(tmp_path, "games/Two.pgn", body=b"1. e4 *\n\n1. d4 *\n")

    assert [(game.sans, game.origin) for game in source.games(tmp_path)] == [
        (("e4",), Origin(address="https://example.com/games/Two.pgn", place=1)),
        (("d4",), Origin(address="https://example.com/games/Two.pgn", place=2))
    ]


def test_a_source_lands_where_its_address_names(tmp_path: Path):
    """
    Asserts that a source lands under the downloads directory in a folder
    named for the host of its address, at the path the address names.
    """
    assert declare("players/Adams.zip").path(tmp_path) == (
        tmp_path / "example.com" / "players" / "Adams.zip"
    )


def test_an_archive_reads_each_pgn_member_in_order_counting_places_across_them(
    tmp_path: Path
):
    """
    Asserts that a source fetched as a zip archive reads the games of each
    member whose name ends in `.pgn` in any case, in the order the archive
    lists them, skipping every other member and counting each game's place
    across the members.
    """
    source = land(
        tmp_path,
        "players/Both.zip",
        body = zipped(
            ("second.pgn", "1. c4 *\n\n1. Nf3 *\n"),
            ("notes.txt", "1. g3 *\n"),
            ("nested/A.PGN", "1. e4 *\n")
        )
    )

    assert [(game.sans, game.origin.place) for game in source.games(tmp_path)] == [
        (("c4",), 1),
        (("Nf3",), 2),
        (("e4",), 3)
    ]


def test_every_declared_file_is_a_pgn_mentor_players_archive():
    """
    Asserts that `sources.toml` declares PGN Mentor's players section, each
    row a zip archive under its `players` folder named for one player, in
    the alphabetical order the section lists them.
    """
    sources   = Sources.read().sources
    addresses = [str(source.address) for source in sources]

    assert {
        (source.provider, str(source.home), source.section) for source in sources
    } == {("PGN Mentor", "https://www.pgnmentor.com/", "Players")}
    assert all(
        address.startswith("https://www.pgnmentor.com/players/")
        and address.endswith(".zip")
        for address in addresses
    )
    assert addresses == sorted(addresses)


@mark.parametrize(
    ("address", "home", "message"),
    [
        param(
            "https://example.com/A.zip",
            "https://example.com/",
            "rows repeat https://example.com/A.zip",
            id = "repeated-address"
        ),
        param(
            "https://example.com/B.zip",
            "https://example.org/",
            "rows give Example more than one home page",
            id = "provider-with-two-homes"
        )
    ]
)
def test_sources_name_a_repeated_address_and_a_provider_with_two_homes(
    address : str,
    home    : str,
    message : str
):
    """
    Asserts that declarations repeating an address, or giving one provider
    two home pages, raise `ValidationError` naming the address or the
    provider.
    """
    with raises(ValidationError, match=escape(message)):
        Sources(
            sources = [
                declare("A.zip"),
                Source(
                    address  = address,
                    home     = home,
                    provider = "Example",
                    section  = "Players"
                )
            ]
        )
