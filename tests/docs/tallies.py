"""
Pins the tables `Tally` writes beneath the widgets of the Data pages and
the Guide's store page, meaning the games of each decade, the lengths each
decade's games run to, the results of the games ending within each span
of moves, and the largest archives, beside the figures `Tally` and `Rules`
write for the pages' sentences, the quantiles `ended` and an `Era` read, and
the name an `Archive` is filed under.
"""

from collections.abc import Callable
from pytest          import mark, param

from scotch.docs.tallies import Archive, Era, Rank, Rules, Tally, ended, markdown


@mark.parametrize(
    ("address", "name"),
    [
        param("https://www.pgnmentor.com/players/Carlsen.zip", "Carlsen", id="zip"),
        param("https://example.com/games/Tal.pgn", "Tal", id="pgn"),
        param("https://example.com/players/R%C3%A9ti.zip", "Réti", id="percent-encoded")
    ]
)
def test_an_archive_is_named_for_its_file_without_the_extension(
    address : str,
    name    : str
):
    """
    Asserts that an archive's name is the last part of its address with the
    extension and the percent-encoding of a name outside ASCII dropped.
    """
    assert Archive(
        address = address,
        decades = {},
        games   = 1,
        undated = 0
    ).name == name


@mark.parametrize(
    ("counts", "share", "moves"),
    [
        param([0, 0, 1, 1], 0.5, 2, id="even-half-at-the-first"),
        param([0, 1, 0, 2], 0.5, 3, id="half-past-the-first"),
        param([5], 0.5, 0, id="one-count"),
        param([0, 2, 1, 1], 0.5, 1, id="half-reached-exactly"),
        param([0, 2, 1, 1], 0.51, 2, id="just-past-half"),
        param([0, 2, 1, 1], 0.25, 1, id="first-quarter"),
        param([0, 2, 1, 1], 1.0, 3, id="every-game")
    ]
)
def test_ended_reads_the_fewest_moves_a_share_of_the_games_end_by(
    counts : list[int],
    share  : float,
    moves  : int
):
    """
    Asserts that the moves a share of the games end by is the first number
    of moves by which at least that share of the games counted have ended,
    pinned from both sides of the half.
    """
    assert ended(counts, share) == moves


def test_a_tally_counts_no_game_for_a_result_none_records(tally: Tally):
    """
    Asserts that a store holding no drawn game counts none in each span of
    the outcomes table and reads the median of the drawn games at move 0,
    where the store holds no game to end by, rather than failing.
    """
    drawless = tally.model_copy(
        update = {"moves": [[0, 1], [1, 0], [0, 1], [1, 2]], "results": ["0-1", "1-0"]}
    )

    assert drawless.outcomes.splitlines()[2] == "| 0 to 10 | 4 | 0 | 2 |"
    assert (drawless.figures["draw-median"], drawless.figures["white-median"]) == (
        "0", "2"
    )


def test_a_tally_with_no_dated_game_names_no_earliest_decade(tally: Tally):
    """
    Asserts that a store none of whose games names its year writes an empty
    earliest decade and a recent share of none rather than failing.
    """
    figures = tally.model_copy(update={"eras": []}).figures

    assert (figures["earliest"], figures["recent"]) == ("", "0%")


def test_a_tally_writes_each_figure_the_pages_name(archive: Callable[..., Archive]):
    """
    Asserts each figure of a tally of five games whose counts a reader
    checks by hand, a median being the fewest moves at least half the games
    it counts end by.
    """
    tally = Tally(
        eras = [
            Era(decade=1870, moves=[0, 1, 0, 0]),
            Era(decade=1980, moves=[0, 0, 0, 2]),
            Era(decade=1990, moves=[0, 0, 0, 1])
        ],
        files = [
            archive(2, "a"),
            archive(2, "b").model_copy(update={"undated": 1}),
            archive(1, "c")
        ],
        games     = 5,
        moves     = [[0, 0, 1], [1, 0, 0], [0, 1, 0], [0, 0, 0], [0, 2, 0]],
        positions = 26000,
        results   = ["0-1", "1-0", "1/2-1/2"]
    )

    assert tally.figures == {
        "draw-median"  : "0",
        "earliest"     : "1870s",
        "games"        : "5",
        "largest"      : "2",
        "median"       : "2",
        "median-1870"  : "1",
        "median-1980"  : "3",
        "median-1990"  : "3",
        "positions"    : "26,000",
        "recent"       : "60%",
        "recent-from"  : "1980",
        "smallest"     : "1",
        "undated"      : "1",
        "white-median" : "4"
    }


def test_an_archive_dumps_its_name_beside_its_counts(archive: Callable[..., Archive]):
    """
    Asserts that the name an archive is filed under reaches the JSON the
    site reads, beside the counts it holds, leaving out the count of its
    undated games the figures alone read.
    """
    assert archive(4, "Morphy", {"1850": 4}).model_dump(mode="json") == {
        "address" : "https://www.pgnmentor.com/players/Morphy.zip",
        "games"   : 4,
        "name"    : "Morphy",
        "decades" : {"1850": 4}
    }


@mark.parametrize(
    ("right", "alignment"),
    [param(True, "|---|---:|", id="right"), param(False, "|---|---|", id="left")]
)
def test_markdown_bolds_each_header_and_aligns_every_column_but_the_first_right(
    alignment : str,
    right     : bool
):
    """
    Pins the header row, the alignment row, and a body row of a table, every
    column after the first aligned right unless `right` is false.
    """
    assert markdown(("Name", "Games"), [("Tal", "1,000")], right=right) == (
        f"| **Name** | **Games** |\n{alignment}\n| Tal | 1,000 |"
    )


def test_an_era_and_the_largest_archives_reach_the_json_the_site_reads(tally: Tally):
    """
    Asserts that the store the site reads names each decade and ranks the
    largest archives, each row beside the share it and the rows above it
    hold.
    """
    dumped = tally.model_dump(mode="json")

    assert [era["name"] for era in dumped["eras"]] == ["1850s", "1990s"]
    assert dumped["largest"] == [
        {
            "games"  : 6,
            "held"   : 0.6,
            "name"   : "Kasparov",
            "others" : False
        },
        {
            "games"  : 4,
            "held"   : 1.0,
            "name"   : "Morphy",
            "others" : False
        }
    ]


def test_an_era_counts_its_games():
    """
    Asserts that an era's games are the sum of its counts by moves.
    """
    assert Era(decade=1900, moves=[1, 2, 3]).games == 6


def test_endings_count_each_result_at_each_number_of_moves(tally: Tally):
    """
    Asserts that `endings` reads, for each result, the games ending in it at
    each number of moves from 0, one column of `moves` for each result.
    """
    assert tally.endings == {
        "*"       : (0, 0, 0, 0),
        "0-1"     : (0, 1, 1, 0),
        "1-0"     : (1, 0, 1, 1),
        "1/2-1/2" : (0, 1, 1, 3)
    }


def test_rules_write_each_figure_the_methods_pages_name():
    """
    Asserts that the counts take a comma between each group of three digits,
    each measure its share of the matched games, and the accidents as the
    odds against any two distinct positions of the index sharing a key,
    rounded to two figures.
    """
    rules = Rules(
        accidents  = 2.13e-05,
        crowd      = 100,
        crowded    = 1,
        keys       = 14000,
        matched    = 4,
        sample     = 1000,
        tied       = 4,
        transposed = 2
    )

    assert rules.figures == {
        "accidents"  : "47,000",
        "crowd"      : "100",
        "crowded"    : "25%",
        "keys"       : "14,000",
        "sample"     : "1,000",
        "tied"       : "100%",
        "transposed" : "50%"
    }


def test_the_archives_table_gathers_every_file_past_the_tenth(
    archive : Callable[..., Archive],
    tally   : Tally
):
    """
    Asserts that past ten files every remaining one joins one row naming how
    many it gathers, on which the running share reaches the whole store, and
    that files holding as many games rank by name.
    """
    files = [archive(10, f"Player{index:02}") for index in reversed(range(12))]
    many  = tally.model_copy(update={"files": files, "games": 120})
    table = many.archives.splitlines()

    assert table[2] == "| Player00 | 10 | 8.3% | 8.3% |"
    assert table[-1] == "| 2 others | 20 | 16.7% | 100.0% |"
    assert many.largest[-1] == Rank(
        games  = 20,
        held   = 1.0,
        name   = "2 others",
        others = True
    )
    assert len(table) == 2 + 11


def test_the_archives_table_ranks_the_files_with_no_others_row_under_ten(tally: Tally):
    """
    Asserts that two files rank by their games, each beside its share of the
    store and the running share, with no row gathering the rest.
    """
    assert tally.archives == markdown(
        headers = ("Archive", "Games", "Share of the Store", "Held Down to Here"),
        rows = [("Kasparov", "6", "60.0%", "60.0%"), ("Morphy", "4", "40.0%", "100.0%")]
    )


def test_the_decades_table_counts_each_decade_and_the_share_played_by_its_end(
    tally: Tally
):
    """
    Pins the table of decades, each with its games and the running share of
    the dated games it closes on, which leaves the undated games out.
    """
    assert tally.model_copy(update={"games": 12}).decades == markdown(
        headers = ("Decade", "Games", "Played by Its End"),
        rows    = [("1850s", "4", "40.0%"), ("1990s", "6", "100.0%")]
    )


@mark.parametrize(
    ("moves", "span"),
    [
        param(10, "0 to 10", id="10"),
        param(11, "11 to 20", id="11"),
        param(80, "71 to 80", id="80"),
        param(81, "81 and over", id="81"),
        param(85, "81 and over", id="85")
    ]
)
def test_the_outcomes_table_counts_a_game_in_the_one_span_holding_its_moves(
    moves : int,
    span  : str,
    tally : Tally
):
    """
    Pins the span one game Black won is counted in at each edge of the
    spans, the first closing on move 10 and the last opening on move 81 and
    running on past the longest game, no other row counting it.
    """
    endings = [[0, 0, 0, 0]] * moves + [[0, 1, 0, 0]]
    rows    = tally.model_copy(update={"moves": endings}).outcomes.splitlines()[2:]

    assert [row for row in rows if not row.endswith("| 0 | 0 | 0 |")] == [
        f"| {span} | 0 | 0 | 1 |"
    ]


@mark.parametrize(
    ("decade", "recent"),
    [param(1970, "0%", id="1970s"), param(1980, "100%", id="1980s")]
)
def test_the_recent_share_counts_the_games_from_1980_on(
    decade : int,
    recent : str,
    tally  : Tally
):
    """
    Pins the threshold of the share of games played from 1980 on from both
    sides, the 1980s counting toward it and the 1970s not.
    """
    figures = tally.model_copy(
        update = {"eras": [Era(decade=decade, moves=[0, 1])], "games": 1}
    ).figures

    assert (figures["recent"], figures["recent-from"]) == (recent, "1980")


def test_the_lengths_table_names_each_decade_s_median_and_middle_half(tally: Tally):
    """
    Pins the table of lengths, each decade with its games, its median move,
    and the moves its middle half ends between.
    """
    assert tally.lengths == markdown(
        headers = ("Decade", "Games", "Median Move", "Middle Half"),
        rows    = [("1850s", "4", "1", "1 to 2"), ("1990s", "6", "2", "1 to 3")]
    )


def test_the_outcomes_table_counts_each_result_within_each_span(tally: Tally):
    """
    Pins the spans of ten moves the table opens with, the last span running
    from move 81 to the most any game plays, and the results read in the
    order White won, drawn, and Black won whatever order `results` names.
    """
    table = tally.outcomes.splitlines()

    assert table[:3] == [
        "| **Moves** | **White Won** | **Drawn** | **Black Won** |",
        "|---|---:|---:|---:|",
        "| 0 to 10 | 3 | 5 | 2 |"
    ]
    assert table[-1] == "| 81 and over | 0 | 0 | 0 |"
    assert [row.split(" | ")[0] for row in table[2:]] == [
        "| 0 to 10", "| 11 to 20", "| 21 to 30", "| 31 to 40", "| 41 to 50",
        "| 51 to 60", "| 61 to 70", "| 71 to 80", "| 81 and over"
    ]


@mark.parametrize(
    ("counts", "figures"),
    [
        param(
            {
                "accidents" : 2.13e-05,
                "keys"      : 14000,
                "matched"   : 0
            },
            {
                "accidents"  : "47,000",
                "crowded"    : "",
                "tied"       : "",
                "transposed" : ""
            },
            id = "no-game-matched"
        ),
        param(
            {
                "accidents" : 0.0,
                "keys"      : 1,
                "matched"   : 0
            },
            {
                "accidents"  : "",
                "crowded"    : "",
                "tied"       : "",
                "transposed" : ""
            },
            id = "one-key"
        )
    ]
)
def test_rules_leave_empty_each_figure_holding_no_value(
    counts  : dict[str, float],
    figures : dict[str, str]
):
    """
    Asserts that each share of the matched games is empty where no sampled
    game matched, and the odds against two positions sharing a key are empty
    where the index holds no two keys, rather than failing.
    """
    rules = Rules(crowd=100, crowded=0, sample=1, tied=0, transposed=0, **counts)

    assert {name: rules.figures[name] for name in figures} == figures
