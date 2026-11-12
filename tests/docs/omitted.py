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
    Builds two sections, the Openings games split across a floor of 2500 in
    two bins and the unrated.
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
        files = [],
        floor = Floor(
            bins    = [1, 2500],
            counts  = [[3, 5, 2]],
            decades = ["1990s"],
            floor   = 2500
        ),
        sections = [
            ledger("Players", kept=10, repeat=2, variant=1),
            ledger("Openings", below=5, kept=5, unread=1)
        ]
    )


def test_a_ledger_reads_every_game_its_files_hold(omissions: Omissions):
    """
    Asserts that a ledger's games are the kept games beside those left out
    under every reason.
    """
    assert [section.read for section in omissions.sections] == [13, 11]


def test_omissions_write_their_figures_and_tables(omissions: Omissions):
    """
    Asserts that the figures count the games read, kept, and left out under
    each reason, that the ledger ranks the reasons by the games each takes,
    and that the floors table splits each decade at the floor.
    """
    assert omissions.figures == {
        "left-below"   : "5",
        "left-kept"    : "15",
        "left-out"     : "9",
        "left-read"    : "24",
        "left-repeat"  : "2",
        "left-unread"  : "1",
        "left-variant" : "1"
    }
    assert omissions.ledger.splitlines()[0] == (
        "| **Section** | **Files** | **Read** | **Kept** | **Below** | **Repeats** | "
        "**Unread** | **Variants** |"
    )
    assert omissions.ledger.splitlines()[2:] == [
        "| Players | 1 | 13 | 10 | 0 | 2 | 0 | 1 |",
        "| Openings | 1 | 11 | 5 | 5 | 0 | 1 | 0 |"
    ]
    assert omissions.floors.splitlines()[2:] == ["| 1990s | 10 | 2 | 3 | 5 |"]
