"""
Pins the figures and the table `Tie` writes for the Tags page, meaning the
line in numbered moves, the games it ties, and the order a match shows them
in, beside the number of the move played once the line ends.
"""

from pytest import mark, param

from scotch.docs.ties import Tie, Tied


def test_a_tie_writes_its_figures_and_order():
    """
    Asserts that the line is written in numbered moves, and that the order
    lists each game with a dash for a rating or a next move it lacks.
    """
    tie = Tie(
        games = [
            tied(next=["Nf3"], rating="2785", white="Fischer"),
            tied(next=[], rating="", white="Spassky")
        ],
        line  = ["e4", "e5"],
        plies = 4
    )

    assert tie.figures == {"tie-games": "2", "tie-line": "`1.e4 e5`"}
    assert tie.order.splitlines()[2:] == [
        "| 1 | Fischer – Tal, 1972 | 2785 | – | 2.Nf3 |",
        "| 2 | Spassky – Tal, 1972 | – | – | – |"
    ]


@mark.parametrize(
    ("line", "after"),
    [
        param(["e4"], "1…", id="black-replies"),
        param(["e4", "e5"], "2.", id="white-moves"),
        param(["e4", "e5", "Nf3"], "2…", id="black-replies-later")
    ]
)
def test_a_tie_numbers_the_move_after_its_line(line: list[str], after: str):
    """
    Asserts that the move after the line is numbered behind a period for
    White and an ellipsis for Black.
    """
    assert Tie(games=[], line=line, plies=4).after == after


def tied(next: list[str], rating: str, white: str) -> Tied:
    """
    Builds a game White plays as `white` rated `rating`, playing `next`.
    """
    return Tied(
        file       = "Z.zip",
        game       = 0,
        next       = next,
        placements = [],
        tags       = {
            "Black"    : "Tal",
            "BlackElo" : "",
            "Date"     : "1972.01.01",
            "White"    : white,
            "WhiteElo" : rating
        }
    )
