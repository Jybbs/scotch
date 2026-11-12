"""
Pins the tables and figures `Shared` writes for the Shared Positions page,
meaning the positions by the games reaching each, the share still sharing
at every fifth move, and each decade's parting, beside the moves by which a
share of a `Parting` stands alone and the name of a `Crowd`.
"""

from pytest import fixture, mark, param

from scotch.docs.shared import Crowd, Line, Parting, Shared


@fixture
def shared() -> Shared:
    """
    Builds the sharing of twenty games over 21 moves, two of them standing
    alone at once, sixteen at move 10, and two never, beside three ranges
    of reach, the second straddling the crowd, one decade holding no game
    standing alone, and one opening line.
    """
    every = Parting(
        alone   = [2, *[0] * 9, 16, *[0] * 10],
        games   = 20,
        name    = "Every game",
        playing = [20] * 11 + [4] * 10,
        sharing = [18] * 11 + [2] * 10
    )

    return Shared(
        crowd   = 5,
        decades = [every.model_copy(update={"alone": [0] * 21, "name": "1990s"})],
        every   = every,
        lines   = [Line(games=12, reach=14, sans=["e4", "e5", "Nf3"])],
        reach   = [
            Crowd(
                high  = 1,
                keys  = 50,
                low   = 1,
                stood = 50
            ),
            Crowd(
                high  = 10,
                keys  = 40,
                low   = 2,
                stood = 150
            ),
            Crowd(
                high  = 20,
                keys  = 10,
                low   = 11,
                stood = 200
            )
        ]
    )


@mark.parametrize(
    ("low", "high", "name"),
    [
        param(1, 1, "1", id="one"),
        param(11, 20, "11 to 20", id="range"),
        param(1001, 2000, "1,001 to 2,000", id="thousands")
    ]
)
def test_a_crowd_is_named_for_its_range(low: int, high: int, name: str):
    """
    Asserts that a range of one count is named for it alone and a wider
    range for both ends, each written with thousands separators.
    """
    assert Crowd(
        high  = high,
        keys  = 0,
        low   = low,
        stood = 0
    ).name == name


def test_a_parting_reads_none_past_its_last_move(shared: Shared):
    """
    Asserts that the moves by which a share stands alone fall at the move
    reaching it, and that a share only the games never standing alone reach
    reads as `None`.
    """
    assert (shared.every.by(0.1), shared.every.half, shared.every.by(0.95)) == (
        0, 10, None
    )


def test_shared_writes_its_figures(shared: Shared):
    """
    Asserts that the figures name the move half the games stand alone by,
    the shares crowded and reached once, and the shares sharing at moves
    10 and 20.
    """
    assert shared.figures == {
        "alone-half"    : "10",
        "crowded-stood" : "50%",
        "once"          : "50%",
        "sharing-10"    : "90%",
        "sharing-20"    : "50%"
    }


def test_shared_writes_its_tables(shared: Shared):
    """
    Asserts that the crowding tables mark each range whose fewest games pass
    the crowd and list each opening line in numbered moves, that the parting
    table lists every fifth move, and that the partings table writes a dash
    for a decade no share reaches.
    """
    crowding, lines = shared.crowding.split("\n\n")

    assert lines.splitlines()[2:] == ["| `1.e4 e5 2.Nf3` | 12 | 14 |"]
    assert crowding.splitlines()[2:] == [
        "| 1 | 50 | 50.00% | 12.5% | No |", "| 2 to 10 | 40 | 40.00% | 37.5% | No |",
        "| 11 to 20 | 10 | 10.00% | 50.0% | Yes |"
    ]
    assert shared.parting.splitlines()[2:] == [
        "| 0 | 20 | 90.0% | 10.0% |", "| 5 | 20 | 90.0% | 0.0% |",
        "| 10 | 20 | 90.0% | 80.0% |", "| 15 | 4 | 50.0% | 0.0% |",
        "| 20 | 4 | 50.0% | 0.0% |"
    ]
    assert shared.partings.splitlines()[2:] == ["| 1990s | 20 | – | – to – |"]
