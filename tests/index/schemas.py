"""
Pins the records a match travels in, meaning the plies a `Span` covers in
each game, what a `Match` prints and names as the move where the two games
part, and the `Export` the site's viewer reads.
"""

from common.games     import line
from pydantic         import ValidationError
from pytest           import mark, param, raises
from syrupy.assertion import SnapshotAssertion

from scotch.index.schemas import Export, Match, Side, Span


def test_a_side_holds_one_placement_more_than_its_moves():
    """
    Asserts that a side holds the game's tags as its headers, its moves in
    SAN, and the placement of each position from the start.
    """
    game = line("e4", "e5")
    side = Side.from_game(game)

    assert side.headers == game.tags
    assert side.moves == ("e4", "e5")
    assert side.placements == game.placements
    assert len(side.placements) == 3


@mark.parametrize(
    "fields",
    [
        param({"length": 0, "offset": 0, "start": 0}, id="no-position"),
        param({"length": 1, "offset": 0, "start": -1}, id="negative-start")
    ]
)
def test_a_span_refuses_a_run_no_game_holds(fields: dict[str, int]):
    """
    Asserts that a span holding no position or starting before the submitted
    game's first ply raises `ValidationError`.
    """
    with raises(ValidationError):
        Span(**fields)


@mark.parametrize(
    ("length", "parting"),
    [
        param(4, "2...Nc6", id="stored-game-goes-on"),
        param(5, None, id="stored-game-ends")
    ]
)
def test_the_parting_move_is_the_stored_games_next_move(
    length  : int,
    parting : str | None
):
    """
    Asserts that the move where two games part is the one the stored game
    played from the last position the two share, and `None` where the stored
    game ends there.
    """
    match = Match(
        game = line("e4", "e5", "Nf3", "Nc6"),
        span = Span(length=length, offset=0, start=0),
        ties = 0
    )

    assert match.parting == parting


@mark.parametrize(
    "span",
    [
        param(Span(length=4, offset=0, start=0), id="stored-game-goes-on"),
        param(Span(length=5, offset=0, start=0), id="stored-game-ends"),
        param(Span(length=2, offset=-2, start=2), id="plies-differ"),
        param(Span(length=1, offset=0, start=0), id="one-position")
    ]
)
def test_a_summary_names_the_stored_game_the_span_and_the_parting(
    snapshot : SnapshotAssertion,
    span     : Span
):
    """
    Asserts that a match prints the stored game's players, event, and date,
    the plies the two games share, and the move where they part or the end
    of the stored game, one to a line.
    """
    match = Match(
        game = line(
            "e4",
            "e5",
            "Nf3",
            "Nc6",
            Black = "Black, B",
            Date  = "2000.01.02",
            Event = "Event",
            White = "White, W"
        ),
        span = span,
        ties = 0
    )

    assert match.summary == snapshot


def test_a_span_lists_the_plies_it_covers_in_each_game():
    """
    Asserts that a span starting at the submitted game's tenth ply, four
    plies past the stored game's, covers plies 10 to 12 of the submitted
    game and 6 to 8 of the stored game.
    """
    span = Span(length=3, offset=-4, start=10)

    assert span.submitted == range(10, 13)
    assert span.stored == range(6, 9)


def test_an_export_holds_both_sides_beside_the_span(snapshot: SnapshotAssertion):
    """
    Asserts that an export of a match holds the submitted game, the stored
    game, and the span the two share, as the JSON the site's viewer reads.
    """
    match = Match(
        game = line("e4", "e5", "Nf3"),
        span = Span(length=3, offset=0, start=0),
        ties = 0
    )

    assert Export.from_match(match, line("e4", "e5", "Bc4")).model_dump_json(
        indent = 2
    ) == snapshot


def test_an_export_reads_back_from_its_json():
    """
    Asserts that the JSON an export writes validates back into the same
    export.
    """
    match = Match(game=line("e4", "c5"), span=Span(length=2, offset=0, start=0), ties=0)
    export = Export.from_match(match, line("e4", "e5"))

    assert Export.model_validate_json(export.model_dump_json()) == export


def test_an_export_without_a_match_leaves_the_stored_side_empty(
    snapshot: SnapshotAssertion
):
    """
    Asserts that an export of a game no stored game shares a position with
    holds the submitted game alone, writing `null` for the span and the
    stored side.
    """
    assert Export.from_match(None, line("e4")).model_dump_json(indent=2) == snapshot
