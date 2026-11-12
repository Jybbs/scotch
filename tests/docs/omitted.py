"""
Pins the tables and figures `Omissions` writes for the Games Left Out page,
meaning each section's games by reason and each decade's Openings games
against the floor, beside the games a `Ledger` reads.
"""

from pytest import fixture

from scotch.docs.omitted import Floor, Ledger, Omissions


@fixture
def omissions() -> Omissions:
    """
    Builds two sections, the Players repeating more games than the Openings
    leave under the floor, and one Openings file, the Openings games split
    across a floor of 2500 in two bins and the unrated.
    """
    ledger = lambda name, **counts: Ledger(
        **{
            "below"   : 0,
            "repeat"  : 0,
            "unread"  : 0,
            "variant" : 0
        } | counts,
        files   = 1,
        name    = name,
        section = name
    )

    return Omissions(
        files = [
            ledger("Openings", below=5, kept=5, unread=1).model_copy(
                update = {"name": "openings/Najdorf.zip"}
            )
        ],
        floor = Floor(
            bins    = [1, 2500],
            counts  = [[3, 5, 2]],
            decades = ["1990s"],
            floor   = 2500
        ),
        sections = [
            ledger("Players", kept=10, repeat=6, variant=1),
            ledger("Openings", below=5, kept=5, unread=1)
        ]
    )


def test_a_ledger_reads_every_game_its_files_hold(omissions: Omissions):
    """
    Asserts that a ledger's games are the kept games beside those left out
    under every reason.
    """
    assert [section.read for section in omissions.sections] == [17, 11]


def test_omissions_write_their_figures_and_tables(omissions: Omissions):
    """
    Asserts that the figures count the games read, kept, and left out under
    each reason, that the ledger ranks the reasons by the games each takes
    in a table of the sections and one of the files, and that the floors
    table splits each decade at the floor.
    """
    assert omissions.figures == {
        "left-below"   : "5",
        "left-kept"    : "15",
        "left-out"     : "13",
        "left-read"    : "28",
        "left-repeat"  : "6",
        "left-unread"  : "1",
        "left-variant" : "1"
    }
    sections, files = omissions.ledger.split("\n\n")

    assert sections.splitlines()[0] == (
        "| **Section** | **Files** | **Read** | **Kept** | **Repeats** | **Below** | "
        "**Unread** | **Variants** |"
    )
    assert sections.splitlines()[2:] == [
        "| Players | 1 | 17 | 10 | 6 | 0 | 0 | 1 |",
        "| Openings | 1 | 11 | 5 | 0 | 5 | 1 | 0 |"
    ]
    assert files.splitlines()[0] == (
        "| **File** | **Read** | **Kept** | **Repeats** | **Below** | **Unread** | "
        "**Variants** |"
    )
    assert files.splitlines()[2:] == [
        "| openings/Najdorf.zip | 11 | 5 | 0 | 5 | 1 | 0 |"
    ]
    assert omissions.floors.splitlines()[2:] == ["| 1990s | 10 | 2 | 3 | 5 |"]
