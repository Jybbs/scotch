"""
Pins the counts `Census` draws from an index, meaning each stored game's
file, decade, moves, and result, the games counted by moves for each result
and each decade, each file's games, the positions the index holds, and what
the longest-run rule leaves out over a sample, against the five games of
the `counted` fixture, whose counts a reader checks by hand, and against the
short lines a case indexes to pose one rule.
"""

from collections.abc import Callable, Iterable
from common.games    import line
from polars          import DataFrame
from pytest          import mark, param

from scotch.docs.census   import Census
from scotch.docs.tallies  import Archive, Era, Rules, Tally
from scotch.games.schemas import Game, Origin
from scotch.index.tables  import PositionIndex


def test_counted_reads_the_other_games_reaching_each_position(
    census  : Census,
    counted : tuple[list[Game], PositionIndex]
):
    """
    Asserts that the first game's starting position is reached by the three
    other games playing from it, its next four positions by the two games
    sharing its opening, and its last by the game reaching it in another
    order.
    """
    assert census.counted(1, counted[0][0]).to_list() == [3, 2, 2, 2, 2, 1]


def test_counts_fill_every_number_of_moves_up_to_the_longest():
    """
    Asserts that `counts` gives a zero to each number of moves no game
    plays, from 0 through the longest.
    """
    assert Census.counts(5, DataFrame({"moves": [2, 4, 4]})) == [0, 0, 1, 0, 2, 0]


def test_games_read_each_games_file_decade_moves_and_result(census: Census):
    """
    Asserts that a game's moves count a move of White's and Black's reply
    as one, so five plies play three moves, and that a `Date` tag whose year
    holds anything but digits reads as no decade.
    """
    assert census.games.to_dicts() == [
        {
            "address" : "https://example.com/X.zip",
            "decade"  : 1980,
            "moves"   : 3,
            "result"  : "1-0"
        },
        {
            "address" : "https://example.com/X.zip",
            "decade"  : 1980,
            "moves"   : 3,
            "result"  : "1/2-1/2"
        },
        {
            "address" : "https://example.com/Y.zip",
            "decade"  : 1990,
            "moves"   : 3,
            "result"  : "0-1"
        },
        {
            "address" : "https://example.com/Y.zip",
            "decade"  : None,
            "moves"   : 3,
            "result"  : "1-0"
        },
        {
            "address" : "https://example.com/Z.zip",
            "decade"  : 1870,
            "moves"   : 1,
            "result"  : "1-0"
        }
    ]


@mark.parametrize(
    ("copied", "parting"),
    [
        param(("e4", "e5", "Nf3"), ("e4", "e5", "Nc3"), id="once-through"),
        param(
            ("Nf3", "Nf6", "Ng1", "Ng8", "Nf3"),
            ("Nf3", "d5"),
            id = "repeating-a-position"
        )
    ]
)
def test_rules_count_no_copy_toward_the_crowd_of_a_position(
    copied  : tuple[str, ...],
    parting : tuple[str, ...],
    scanned : Callable[[Iterable[Game]], PositionIndex]
):
    """
    Asserts that a copy holding a sampled game's whole mainline adds nothing
    to how many other games reach the game's positions, however often the
    copy repeats one, so the run of the game parting from the two alone
    counts as crowded.
    """
    assert Census(
        crowd = 1,
        index = scanned([line(*copied), line(*copied), line(*parting)])
    ).rules.crowded == 1


def test_rules_count_what_the_longest_run_leaves_out(
    census  : Census,
    counted : tuple[list[Game], PositionIndex]
):
    """
    Asserts what the longest-run rule leaves out over all five games,
    beside the count of their keys. The game from the kings alone shares no
    position and goes unmatched, and each of the four others ties, the three
    sharing an opening on their five-position runs and the third on the
    starting position. Only the third game's run lies wholly in positions
    more than two other games reach, and only the first game finds a shorter
    run reaching, in another order, a position rarer than any of its longest
    run's.
    """
    keys = {*game.keys for game in counted[0]}

    assert census.rules == Rules(
        accidents  = len(keys) * (len(keys) - 1) / 2**65,
        crowd      = 2,
        crowded    = 1,
        keys       = len(keys),
        matched    = 4,
        sample     = 5,
        tied       = 4,
        transposed = 1
    )


@mark.parametrize(
    ("sans", "copies"),
    [
        param(("Nf3", "d5", "d4", "Nf6", "c4"), 2, id="copied"),
        param(("Nf3", "Nf6", "Ng1", "Ng8", "Nf3"), 2, id="copied-repeating-a-position"),
        param(("Nf3", "Nf6", "Ng1", "Ng8", "Nf3"), 1, id="alone-repeating-a-position")
    ]
)
def test_rules_match_no_game_against_a_game_holding_its_whole_mainline(
    copies  : int,
    sans    : tuple[str, ...],
    scanned : Callable[[Iterable[Game]], PositionIndex]
):
    """
    Asserts that a game stored alone or beside a copy, as an archive
    repeating another's game stores it, matches nothing. The rule leaves out
    every stored game holding the sampled game's whole mainline, the game
    itself among them, together with the shorter runs a repeated position
    gives such a game from another ply.
    """
    assert Census(index=scanned([line(*sans)] * copies)).rules.matched == 0


@mark.parametrize(
    ("games", "transposed"),
    [
        param(
            [
                line("e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4"),
                line("Nf3", "d6", "e4", "c5", "d4", "cxd4", "Nxd4", "Nf6"),
                line("Nf3", "d6", "e4", "c5", "d4", "cxd4", "Nxd4", "Nc6"),
                line("Nc3", "Nf6", "Nb1", "Ng8", "e4", "c5", "a3")
            ],
            1,
            id = "opening-reached-after-a-detour"
        ),
        param(
            [
                line("e4", "c5", "Nf3", "d6", "d4"),
                line("Nf3", "d6", "e4", "c5", "d3"),
                line("e4", "e5", "Nf3", "d6", "d4")
            ],
            0,
            id = "as-rare-as-the-longest-run"
        )
    ]
)
def test_rules_count_a_transposition_only_through_a_strictly_rarer_position(
    games      : list[Game],
    scanned    : Callable[[Iterable[Game]], PositionIndex],
    transposed : int
):
    """
    Asserts that a shorter run reaching the opening positions after a detour
    reaches them by another order of moves, and that a position exactly as
    rare as the rarest of the longest run marks no transposition.
    """
    assert Census(index=scanned(games)).rules.transposed == transposed


def test_rules_leave_out_a_same_order_opening_and_a_lone_longest_run(
    scanned: Callable[[Iterable[Game]], PositionIndex]
):
    """
    Asserts the measures over four games where 1. e4 e5 2. Nf3 Nc6 3. Bc4
    meets two games reaching its last three positions from 1. Nf3 and one
    sharing only its opening move. That first game alone ties and alone runs
    through positions more than one other game reaches, and no game counts
    as transposed, since a run opening on the first position in the same
    order reaches nothing by another order of moves, however rare.
    """
    games = [
        line("e4", "e5", "Nf3", "Nc6", "Bc4"),
        line("e4", "d5"),
        line("Nf3", "e5", "e4", "Nc6", "Bc4", "Nf6"),
        line("Nf3", "e5", "e4", "Nc6", "Bc4", "Bc5")
    ]
    rules = Census(crowd=1, index=scanned(games)).rules

    assert (rules.crowded, rules.matched, rules.tied, rules.transposed) == (1, 4, 1, 0)


def test_rules_sample_as_many_games_as_named_drawing_the_same_with_one_seed(
    scanned: Callable[[Iterable[Game]], PositionIndex]
):
    """
    Asserts that a census of an index holding more stored games than its
    sample draws that many distinct games, the same ones on every run under
    one seed and others under another seed.
    """
    index = scanned(
        [
            line(san)
            for san in (
                "a3", "a4", "b3", "b4", "c3", "c4", "d3",
                "d4", "e3", "e4", "f3", "f4", "g3", "g4",
                "h3", "h4", "Na3", "Nc3", "Nf3", "Nh3"
            )
        ]
    )
    drawn = Census(index=index, sample=5)

    assert len(set(drawn.sampled)) == drawn.rules.sample == 5
    assert drawn.sampled == Census(index=index, sample=5).sampled
    assert drawn.sampled != Census(index=index, sample=5, seed=1954).sampled


def test_rules_sample_every_game_of_an_index_holding_fewer_than_the_sample(
    scanned: Callable[[Iterable[Game]], PositionIndex]
):
    """
    Asserts that a census of an index holding fewer stored games than its
    sample samples every one of them rather than failing.
    """
    assert Census(index=scanned([line("e4"), line("d4")])).rules.sample == 2


def test_store_counts_the_games_by_moves_result_decade_and_file(
    census  : Census,
    counted : tuple[list[Game], PositionIndex]
):
    """
    Asserts that the store lists each result in order beside one count per
    result for each number of moves from 0, one count per number of moves
    for each decade the dated games fall in, each file's games, its games by
    decade, and its undated games, beside the positions the index holds, one
    for each position of each stored game.
    """
    assert census.store == Tally(
        eras = [
            Era(decade=1870, moves=[0, 1, 0, 0]),
            Era(decade=1980, moves=[0, 0, 0, 2]),
            Era(decade=1990, moves=[0, 0, 0, 1])
        ],
        files = [
            Archive(
                address = "https://example.com/X.zip",
                decades = {"1980": 2},
                games   = 2,
                undated = 0
            ),
            Archive(
                address = "https://example.com/Y.zip",
                decades = {"1990": 1},
                games   = 2,
                undated = 1
            ),
            Archive(
                address = "https://example.com/Z.zip",
                decades = {"1870": 1},
                games   = 1,
                undated = 0
            )
        ],
        games     = 5,
        moves     = [[0, 0, 0], [0, 1, 0], [0, 0, 0], [1, 2, 1]],
        positions = sum(len(game.keys) for game in counted[0]),
        results   = ["0-1", "1-0", "1/2-1/2"]
    )


def test_store_lists_each_files_decades_from_the_earliest(
    scanned: Callable[[Iterable[Game]], PositionIndex]
):
    """
    Asserts that a file's decades run from the earliest, whatever order its
    games come in.
    """
    games = [
        line(
            "e4",
            Date   = f"{year}.01.01",
            origin = Origin(address="https://example.com/X.zip", place=place)
        )
        for place, year in enumerate((2015, 1955, 1985, 1965, 2005, 1975), start=1)
    ]

    assert list(Census(index=scanned(games)).store.files[0].decades) == [
        "1950", "1960", "1970", "1980", "2000", "2010"
    ]


def test_store_lists_the_files_in_the_order_of_their_addresses(
    scanned: Callable[[Iterable[Game]], PositionIndex]
):
    """
    Asserts that the store lists each file in the order of its address,
    whatever order the index holds their games in.
    """
    games = [
        line("e4", origin=Origin(address="https://example.com/Z.zip", place=1)),
        line("d4", origin=Origin(address="https://example.com/X.zip", place=1))
    ]

    assert [file.name for file in Census(index=scanned(games)).store.files] == [
        "X", "Z"
    ]
