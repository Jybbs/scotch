"""
Pins the records describing a match, meaning the `Side` each game becomes
for the Viewer, the plies a `Span` covers in each game, what a `Match`
prints and names as the move where the two games part, the `Export` the
Viewer reads and the address opening it there, and what an `Answer` prints
for a position.
"""

from base64           import urlsafe_b64decode
from common.games     import line
from pydantic         import ValidationError
from pytest           import mark, param, raises
from syrupy.assertion import SnapshotAssertion
from urllib.parse     import urlsplit
from zlib             import decompress

from scotch.docs.project  import Project
from scotch.games.schemas import Origin
from scotch.index.schemas import Answer, Export, Match, Reply, Side, Span


def test_a_continuation_at_the_stored_games_end_holds_its_result_alone():
    """
    Asserts that a continuation from the stored game's last position holds
    its result alone.
    """
    game = line("e4", Result="0-1")

    assert Match(
        game      = game,
        span      = Span(length=2, offset=0, start=0),
        submitted = game,
        ties      = 0
    ).continuation() == "0-1"


def test_a_link_opens_the_export_on_the_homepage_with_it_in_the_fragment():
    """
    Asserts that the address of an export names the Viewer at the homepage
    the manifest declares and holds the export's JSON in its `match`
    fragment field, as a ZLIB stream in unpadded base64url, leaving the
    query empty so no request carries any of it.
    """
    export           = Export.from_match(None, line("e4", "e5"))
    parts            = urlsplit(export.link)
    field, _, packed = parts.fragment.partition("=")

    assert f"{parts.scheme}://{parts.netloc}" == Project.installed().homepage
    assert (parts.path, parts.query, field) == ("/viewer", "", "match")
    assert "=" not in packed
    assert Export.model_validate_json(
        decompress(urlsafe_b64decode(packed))
    ) == export


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
    game  = line("e4", "e5", "Nf3", "Nc6")
    match = Match(
        game      = game,
        span      = Span(length=length, offset=0, start=0),
        submitted = game,
        ties      = 0
    )

    assert match.parting == parting


@mark.parametrize(
    ("length", "played"),
    [
        param(3, "2. Nf3", id="submitted-game-goes-on"),
        param(4, None, id="submitted-game-ends")
    ]
)
def test_the_played_move_is_the_submitted_games_next_move(
    length : int,
    played : str | None
):
    """
    Asserts that the move the submitted game played where the two part is
    the one it played from the last position the two share, and `None` where
    the submitted game ends there, and that the position before both is
    written in FEN.
    """
    match = Match(
        game      = line("e4", "e5", "Nf3", "Nc6"),
        span      = Span(length=length, offset=0, start=0),
        submitted = line("e4", "e5", "Nf3"),
        ties      = 0
    )

    assert match.played == played
    assert match.before == match.submitted.at(length - 1).fen()


@mark.parametrize(
    ("plies", "continuation"),
    [
        param(None, "2...Nc6 3. Bb5 1-0", id="to-the-end"),
        param(1, "2...Nc6", id="cut-short"),
        param(2, "2...Nc6 3. Bb5 1-0", id="exactly-to-the-end"),
        param(9, "2...Nc6 3. Bb5 1-0", id="past-the-end")
    ]
)
def test_a_continuation_runs_to_the_stored_games_result_unless_cut_short(
    continuation : str,
    plies        : int | None
):
    """
    Asserts that the continuation holds the stored game's moves from the
    last position the two share behind its result, and that `plies` cuts it
    short and leaves the result out where the moves stop before the game's
    end.
    """
    match = Match(
        game      = line("e4", "e5", "Nf3", "Nc6", "Bb5", Result="1-0"),
        span      = Span(length=4, offset=0, start=0),
        submitted = line("e4", "e5", "Nf3", "d6"),
        ties      = 0
    )

    assert match.continuation(plies) == continuation


def test_a_report_names_the_file_the_stored_game_was_read_from(
    snapshot: SnapshotAssertion
):
    """
    Asserts that a match whose stored game was read from a file of the
    store's sources names the game as `<file>:<n>` beside the players, the
    event, and the date.
    """
    match = Match(
        game = line(
            "e4",
            "e5",
            Black  = "Black, B",
            Date   = "2000.01.02",
            Event  = "Event",
            White  = "White, W",
            origin = Origin(address="https://example.com/players/White.zip", place=1234)
        ),
        span      = Span(length=2, offset=0, start=0),
        submitted = line("e4", "e5"),
        ties      = 1
    )

    assert match.report() == snapshot
    assert match.line == (
        "White.zip:1234  White, W vs. Black, B, Event, 2000.01.02, 2 positions"
    )


@mark.parametrize(
    "span",
    [
        param(Span(length=4, offset=0, start=0), id="stored-game-goes-on"),
        param(Span(length=5, offset=0, start=0), id="both-games-end"),
        param(Span(length=2, offset=-2, start=2), id="plies-differ"),
        param(Span(length=1, offset=-2, start=2), id="one-position")
    ]
)
def test_a_report_names_the_stored_game_the_span_and_the_parting(
    snapshot : SnapshotAssertion,
    span     : Span
):
    """
    Asserts that a match prints the stored game's players, event, and date,
    the plies the two games share, the position where they part with the
    move each played from it, or the end of either game, the stored game's
    moves from there, and the count of other games sharing a run as long,
    one to a line.
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
        span      = span,
        submitted = line("e4", "e5", "Nf3", "d6"),
        ties      = 2
    )

    assert match.report() == snapshot


def test_a_report_writes_a_null_move_either_game_played():
    """
    Asserts that a match parting on a null move prints it as `--` for the
    submitted game and for the stored game, and through the continuation.
    """
    game = line("e4", "--", "d4", "d5")

    assert Match(
        game      = game,
        span      = Span(length=2, offset=0, start=0),
        submitted = game,
        ties      = 0
    ).report().splitlines()[2:4] == [
        f"Parts at {game.at(1).fen()}, where the submitted game played 1...-- and"
        " the stored game played 1...--",
        "Continues 1...-- 2. d4 d5 *"
    ]


def test_a_side_holds_one_placement_more_than_its_moves():
    """
    Asserts that a side holds the game's tags as its headers, its moves in
    SAN, and the placement of each position from the start, one more than
    its moves.
    """
    game = line("e4", "e5")
    side = Side.from_game(game)

    assert side.headers == game.tags
    assert side.moves == ("e4", "e5")
    assert side.placements == game.placements
    assert len(side.placements) == 3


def test_a_side_refuses_a_new_value_for_a_header():
    """
    Asserts that a side's headers are frozen with it, so assigning a header
    raises `TypeError` rather than changing the side the Viewer reads.
    """
    side = Side.from_game(line("e4"))

    with raises(TypeError):
        side.headers["White"] = "Changed"


def test_a_span_lists_the_plies_it_covers_in_each_game():
    """
    Asserts that a span starting at ply 10 of the submitted game, four plies
    past the stored game's, covers plies 10 to 12 of the submitted game and
    6 to 8 of the stored game.
    """
    span = Span(length=3, offset=-4, start=10)

    assert span.submitted == range(10, 13)
    assert span.stored == range(6, 9)


def test_an_answer_for_a_position_no_game_reaches_says_so():
    """
    Asserts that an answer holding no move and no game prints its count
    alone.
    """
    assert Answer(
        ended   = Reply(outcomes=(0, 0, 0, 0), san="end"),
        games   = (),
        replies = ()
    ).summary == "0 stored games reach this position"


def test_an_answer_prints_each_move_then_the_games(snapshot: SnapshotAssertion):
    """
    Asserts that an answer prints how many games reach the position, each
    move with the games playing it and how they ended, the games ending
    there, and the games themselves.
    """
    assert Answer(
        ended = Reply(outcomes=(0, 0, 0, 1), san="end"),
        games = [
            line(
                "e4",
                Black  = "Black, B",
                Date   = "2000.01.02",
                Event  = "Event",
                White  = "White, W",
                origin = Origin(address="https://example.com/White.zip", place=3)
            )
        ],
        replies = [
            Reply(outcomes=(1200, 300, 100, 0), san="e4"),
            Reply(outcomes=(1, 0, 0, 0), san="Nf3")
        ]
    ).summary == snapshot


def test_an_export_holds_both_sides_beside_the_span(snapshot: SnapshotAssertion):
    """
    Asserts that an export of a match holds the submitted game, the stored
    game, the span the two share, and the count of other stored games tied
    with the stored game, as the JSON the Viewer reads.
    """
    submitted = line("e4", "e5", "Bc4")
    match     = Match(
        game      = line("e4", "e5", "Nf3"),
        span      = Span(length=3, offset=0, start=0),
        submitted = submitted,
        ties      = 2
    )

    assert Export.from_match(match, submitted).model_dump_json(
        indent = 2
    ) == snapshot


def test_an_export_reads_back_from_its_json():
    """
    Asserts that the JSON an export writes validates back into the same
    export.
    """
    submitted = line("e4", "e5")
    match     = Match(
        game      = line("e4", "c5"),
        span      = Span(length=2, offset=0, start=0),
        submitted = submitted,
        ties      = 0
    )
    export = Export.from_match(match, submitted)

    assert Export.model_validate_json(export.model_dump_json()) == export


def test_an_export_without_a_match_leaves_the_stored_side_empty(
    snapshot: SnapshotAssertion
):
    """
    Asserts that an export of a game no stored game shares a position with
    holds the submitted game alone, writing `null` for the span and the
    stored side and 0 for the ties.
    """
    assert Export.from_match(None, line("e4")).model_dump_json(indent=2) == snapshot
