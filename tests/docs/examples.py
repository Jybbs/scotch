"""
Pins the `Showing` an `Example` draws for the site's pages from a line of
moves matched against an index, meaning the run the two games share, the
next longest run, the move where they part, the frames, tags, and moves of
the `Shown` each game becomes, and the figures a page names about the match,
beside the export of the match an `Example` writes for the Viewer.
"""

from collections.abc import Callable, Iterable
from common.games    import line
from pathlib         import Path
from pytest          import mark, param, raises

from scotch.docs.examples import Example, Shown
from scotch.games.schemas import Game
from scotch.index.schemas import Span
from scotch.index.tables  import PositionIndex


def test_a_showing_counts_the_run_in_the_lines_plies_beside_the_longest_other_run(
    pgn     : Callable[..., Path],
    scanned : Callable[[Iterable[Game]], PositionIndex]
):
    """
    Asserts that a line a stored game reaches four plies late names its run
    by the line's own plies, and that the next run is the longest any other
    stored game shares rather than the shortest.
    """
    path  = pgn("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *\n")
    index = scanned(
        [
            line(
                "Nc3",
                "Nc6",
                "Nb1",
                "Nb8",
                "e4",
                "e5",
                "Nf3",
                "Nc6",
                "Bb5",
                "a6",
                "Ba4"
            ),
            line("e4", "e5", "Nf3", "Nf6"),
            line("d4", "d5")
        ]
    )
    figures = Example(path=Path(path.name), shown=0).drawn(index, path.parent).figures

    assert {name: figures[name] for name in (
        "end", "next", "parting", "run", "start"
    )} == {
        "end"     : "6",
        "next"    : "4",
        "parting" : "6. Ba4",
        "run"     : "7",
        "start"   : "0"
    }


def test_a_showing_writes_the_figures_a_page_names(index: PositionIndex, known: Path):
    """
    Asserts that the demo game's match names the stored game's players by
    surname, its event and year, the run over plies 0 to 42, the move where
    the two part, and the next longest run, writing no parting move where
    the stored game ends with the run and no next run where no other stored
    game shares a position.
    """
    drawn = Example(path=Path("demo.pgn"), shown=0).drawn(index, known)

    assert drawn.figures == {
        "black"   : "Sosonko",
        "end"     : "42",
        "event"   : "Tilburg",
        "next"    : "1",
        "parting" : "22. Bc2",
        "run"     : "43",
        "start"   : "0",
        "white"   : "Kasparov",
        "year"    : "1981"
    }
    assert drawn.model_copy(update={"parting": None}).figures["parting"] == ""
    assert drawn.model_copy(update={"next": None}).figures["next"] == ""


def test_a_shown_game_draws_frames_up_to_the_plies_shown_and_every_move(
    index : PositionIndex,
    known : Path
):
    """
    Asserts that each `Shown` game holds the frames of its first `shown`
    plies beside its starting position, and lists every move of its mainline
    beside the piece the move sets down, such as the king for `13. Ke2`.
    """
    drawn = Example(path=Path("demo.pgn"), shown=2).drawn(index, known)

    assert [[frame.san for frame in game.frames] for game in (
        drawn.stored, drawn.submitted
    )] == [[None, "d4", "Nf6"]] * 2
    assert len(drawn.stored.played) == 57
    assert drawn.stored.played[:3] == (("d4", "P"), ("Nf6", "n"), ("c4", "P"))
    assert ("Ke2", "K") in drawn.stored.played


def test_a_shown_game_names_each_player_by_every_word_before_the_comma():
    """
    Asserts that a game's players are named by their whole surname, the
    words before the comma, so a surname of two words or one outside ASCII
    reaches the page whole, beside its event and the year its date opens on.
    """
    headers = {
        "Black" : "Cobo Arteaga, Eleazar",
        "Date"  : "1963.??.??",
        "Event" : "Havana",
        "White" : "Lékó, Péter"
    }

    assert Shown(frames=(), headers=headers, played=()).figures == {
        "black" : "Cobo Arteaga",
        "event" : "Havana",
        "white" : "Lékó",
        "year"  : "1963"
    }


def test_a_shown_game_refuses_a_new_value_for_a_header():
    """
    Asserts that a shown game's headers are frozen with it, so assigning a
    header raises `TypeError` rather than changing the figures a page sets.
    """
    shown = Shown.from_game(line("e4"), shown=1)

    with raises(TypeError):
        shown.headers["White"] = "Changed"


def test_an_example_dumps_only_what_the_site_reads(index: PositionIndex, known: Path):
    """
    Asserts that the JSON the site reads for an example holds the run, the
    move where the games part, and each game's frames and moves, leaving out
    the longest other run, the summary, and the tags the figures alone read.
    """
    dumped = Example(path=Path("demo.pgn"), shown=0).drawn(index, known).model_dump(
        mode = "json"
    )

    assert set(dumped) == {"parting", "span", "stored", "submitted"}
    assert set(dumped["stored"]) == set(dumped["submitted"]) == {"frames", "played"}


@mark.parametrize(
    ("text", "problem"),
    [
        param("", "Found no game in .*line.pgn", id="empty"),
        param(
            "1. e4 e5 2. Qxh7 *\n",
            "Found problems in the game in .*line.pgn:\nillegal san",
            id = "illegal"
        )
    ]
)
def test_an_example_a_game_cannot_be_read_from_raises(
    index    : PositionIndex,
    problem  : str,
    text     : str,
    tmp_path : Path
):
    """
    Asserts that drawing a line whose file holds no game, or whose game
    carries a move python-chess cannot read, raises `ValueError` naming the
    file and the problem rather than returning the game cut short.
    """
    (tmp_path / "line.pgn").write_text(text)

    with raises(ValueError, match=problem):
        Example(path=Path("line.pgn"), shown=0).drawn(index, tmp_path)


def test_an_example_exports_the_match_the_viewer_reads(
    index : PositionIndex,
    known : Path
):
    """
    Asserts that the demo game exports beside Kasparov–Sosonko and the run
    the two share where an index is given, and alone, with no span and no
    stored game, where none is.
    """
    example = Example(path=Path("demo.pgn"), shown=0)
    matched = example.exported(known, index)
    alone   = example.exported(known)

    assert matched.span == Span(length=43, offset=0, start=0)
    assert matched.stored is not None
    assert matched.stored.headers["White"] == "Kasparov, Gary"
    assert (alone.span, alone.stored) == (None, None)
    assert alone.submitted == matched.submitted


def test_an_example_no_stored_game_meets_raises(index: PositionIndex, tmp_path: Path):
    """
    Asserts that drawing a line sharing no position with any stored game
    raises `ValueError` naming its file.
    """
    (tmp_path / "kings.pgn").write_text(
        '[FEN "4k3/8/8/8/8/8/8/4K3 w - - 0 1"]\n[SetUp "1"]\n\n1. Ke2 *\n'
    )

    with raises(ValueError, match="No stored game shares a position with kings.pgn"):
        Example(path=Path("kings.pgn"), shown=0).drawn(index, tmp_path)


def test_an_example_reads_the_match_and_both_games(index: PositionIndex, known: Path):
    """
    Asserts that the demo game, which plays Kasparov–Sosonko through
    `21...b6`, shares its first 43 positions with that game, parts where
    the stored game played `22. Bc2`, and shares no more than the starting
    position with either other stored game.
    """
    drawn = Example(path=Path("demo.pgn"), shown=2).drawn(index, known)

    assert drawn.span == Span(length=43, offset=0, start=0)
    assert (drawn.next, drawn.parting) == (1, "22. Bc2")
    assert drawn.summary.splitlines()[0] == (
        "Kasparov, Gary vs. Sosonko, Gennadi, Tilburg, 1981.??.??"
    )
    assert drawn.stored.headers["White"] == "Kasparov, Gary"
    assert len(drawn.submitted.played) == 107


def test_the_next_run_leaves_out_every_run_of_the_matched_game(
    pgn     : Callable[..., Path],
    scanned : Callable[[Iterable[Game]], PositionIndex]
):
    """
    Asserts that a stored game returning to its starting position, whose
    second pass shares three positions with the line, counts toward no next
    run, which the other stored game's one shared position sets.
    """
    path  = pgn("1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. e4 *\n")
    index = scanned(
        [line("Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "e4"), line("e4", "e5")]
    )
    drawn = Example(path=Path(path.name), shown=0).drawn(index, path.parent)

    assert (drawn.span.length, drawn.next) == (8, 1)


def test_the_viewers_example_meets_kasparov_sosonko_by_another_move_order(
    index : PositionIndex,
    known : Path
):
    """
    Asserts that the example the Viewer opens on, which reaches the demo
    game's position after `4...Bb4` through `1. Nf3 Nf6 2. c4` rather than
    `1. d4`, meets Kasparov–Sosonko at ply 7 and shares the 36 positions
    from there through ply 42, where the stored game played `22. Bc2`.
    """
    exported = Example(path=Path("viewer.pgn"), shown=0).exported(known, index)

    assert exported.span == Span(length=36, offset=0, start=7)
    assert exported.stored is not None
    assert exported.stored.moves[42] == "Bc2"
