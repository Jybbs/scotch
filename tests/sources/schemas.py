"""
Pins the records describing the store's sources:

- Where a `Source` lands under the downloads directory, the name of its
  file, and the games it reads from there
- The declarations `sources.toml` ships and the rows `Sources` refuses
- What a `Download` and the `Manifest` of them record
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
    Asserts that a manifest written to a directory it creates reads back
    from its `manifest.json` with every download under its address.
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
    source = land(tmp_path, "games/Two.pgn", body=b'1. e4 *\n\n[Event "?"]\n1. d4 *\n')

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
            ("second.pgn", '1. c4 *\n\n[Event "?"]\n1. Nf3 *\n'),
            ("notes.txt", "1. g3 *\n"),
            ("nested/A.PGN", "1. e4 *\n")
        )
    )

    assert [(game.sans, game.origin.place) for game in source.games(tmp_path)] == [
        (("c4",), 1),
        (("Nf3",), 2),
        (("e4",), 3)
    ]


@mark.parametrize(
    ("record", "field", "description"),
    [
        param(Source, "address", "The address the file is fetched from.", id="address"),
        param(
            Source,
            "group",
            "The heading the provider's site lists the file under within its "
            "section, such as `World Championships`, or `None` where the section "
            "holds no headings.",
            id = "group"
        ),
        param(
            Source,
            "home",
            "The home page of the site providing the file.",
            id = "home"
        ),
        param(
            Source,
            "moves",
            "The moves opening every game of an archive of one opening, as the "
            "provider's site writes them, such as `1.e4 c5 2.Nf3 d6 3.d4 cxd4 "
            "4.Qxd4`, or `None` for a file of any other kind.",
            id = "moves"
        ),
        param(
            Source,
            "provider",
            "The name of the site providing the file.",
            id = "provider"
        ),
        param(
            Source,
            "section",
            "The section of the provider's site listing the file.",
            id = "section"
        ),
        param(
            Source,
            "title",
            "The name the provider's site gives the file, such as `Magnus Carlsen`, "
            "`World Championship 2018`, or `Sicilian, Najdorf, 6.Be3`.",
            id = "title"
        ),
        param(
            Sources,
            "floors",
            "The rating a game of a section's files reaches the store at, keyed by "
            "the section, read as the higher of its `WhiteElo` and `BlackElo` tags, "
            "and a section left out keeping every game.",
            id = "floors"
        ),
        param(Sources, "sources", "The files, each declared once.", id="sources")
    ]
)
def test_each_field_carries_the_description_written_for_it(
    description : str,
    field       : str,
    record      : type[Source | Sources]
):
    """
    Asserts that each field of a source and of the sources describes itself
    with the sentence written for it, read with its line breaks as spaces.
    """
    assert " ".join(record.model_fields[field].description.split()) == description


def test_figures_count_the_files_of_each_section_and_name_each_floor():
    """
    Asserts that the figures count every file and the files of each section
    with a comma between each three digits, and name each floor as a rating
    is written.
    """
    sources = Sources(
        floors  = {"Openings": 2500},
        sources = [declare(f"{place}.zip") for place in range(1000)]
        + [declare("B.zip", section="Openings")]
    )

    assert sources.figures == {
        "files"          : "1,001",
        "openings-files" : "1",
        "openings-floor" : "2500",
        "players-files"  : "1,000"
    }


@mark.parametrize(
    ("section", "floor"),
    [param("Openings", 2500, id="floored"), param("Players", 0, id="unfloored")]
)
def test_a_source_reaches_the_store_at_its_section_s_floor(section: str, floor: int):
    """
    Asserts that a source's floor is the one its section sets, and 0 for a
    section the floors leave out.
    """
    sources = Sources(
        floors  = {"Openings": 2500},
        sources = [declare("A.zip"), declare("B.zip", section="Openings")]
    )

    assert sources.floor(declare("C.zip", section=section)) == floor


def test_sources_name_a_floor_for_a_section_no_row_declares():
    """
    Asserts that a floor naming a section no row declares raises
    `ValidationError` naming the section.
    """
    with raises(ValidationError, match="floors name Events, which no row declares"):
        Sources(floors={"Events": 2500}, sources=[declare("A.zip")])


def test_the_declared_files_are_pgn_mentor_s_sections_in_order():
    """
    Asserts that `sources.toml` declares PGN Mentor's Players archives, its
    Events files, and its Openings archives, each under its folder and in
    alphabetical order there, the sections in that order, with the Openings
    alone held to a rating floor of 2500.
    """
    declared = Sources.read()
    sections = [source.section for source in declared.sources]
    suffixes = {"Events": ".pgn", "Openings": ".zip", "Players": ".zip"}

    assert {
        (source.provider, str(source.home)) for source in declared.sources
    } == {("PGN Mentor", "https://www.pgnmentor.com/")}
    assert list(dict.fromkeys(sections)) == ["Players", "Events", "Openings"]
    assert sections == sorted(sections, key=["Players", "Events", "Openings"].index)
    assert declared.floors == {"Openings": 2500}

    for section, suffix in suffixes.items():
        files = [
            source.file for source in declared.sources if source.section == section
        ]

        assert all(
            file.startswith(f"{section.lower()}/") and file.endswith(suffix)
            for file in files
        )
        assert files == sorted(files, key=str.casefold)


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
                    section  = "Players",
                    title    = "B"
                )
            ]
        )


@mark.parametrize(
    ("address", "file"),
    [
        param("players/Tal.zip", "players/Tal.zip", id="zip"),
        param("events/Anand.pgn", "events/Anand.pgn", id="pgn"),
        param("players/Réti.zip", "players/Réti.zip", id="outside-ascii")
    ]
)
def test_a_source_names_its_file_by_the_path_its_address_names(
    address : str,
    file    : str
):
    """
    Asserts that a source's file is the path its address names under the
    host, extension included, and a name outside ASCII reads as written
    rather than percent-encoded.
    """
    assert declare(address).file == file
