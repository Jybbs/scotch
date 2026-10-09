"""
Pins what `PositionIndex` finds for a submitted game against a store built
from the three games in `fixtures/stored.pgn`, and that a store reads back
from Parquet as it was built.
"""

from collections.abc       import Callable
from common.games          import line
from common.strategies     import games
from dataclasses           import fields
from hypothesis            import given
from hypothesis.strategies import lists
from itertools             import product, takewhile
from pathlib               import Path
from pytest                import TempPathFactory, mark, param, raises

from scotch.games.schemas import Game
from scotch.index.schemas import Span
from scotch.index.tables  import PositionIndex


def shared(first: tuple[int, ...], second: tuple[int, ...]) -> int:
    """
    Counts the keys `first` and `second` share from their first key on.
    """
    return sum(
        1 for _ in takewhile(lambda pair: pair[0] == pair[1], zip(first, second))
    )


def test_a_game_reaching_a_stored_game_by_another_move_order_matches_it(
    demo   : Game,
    index  : PositionIndex,
    stored : list[Game]
):
    """
    Asserts that a game opening `1. Nf3 Nf6 2. c4 e6 3. Nc3 d5 4. d4 Bb4`
    and then playing the demo game's moves matches Kasparov–Sosonko over
    plies 7 to 42, rather than Pachman–Cobo Arteaga (1965) over the four
    positions the two share from the start.
    """
    match = index.match(
        line("Nf3", "Nf6", "c4", "e6", "Nc3", "d5", "d4", "Bb4", *demo.sans[8:])
    )

    assert match.game == stored[0]
    assert match.span == Span(length=36, offset=0, start=7)


def test_a_game_sharing_no_position_matches_nothing(index: PositionIndex):
    """
    Asserts that a game set up from a position no stored game reaches finds
    no match.
    """
    assert index.match(line("O-O", FEN="4k3/8/8/8/8/8/8/4K2R w K - 0 1")) is None


def test_a_game_that_leaves_a_stored_game_and_returns_matches_the_longer_run(
    index  : PositionIndex,
    stored : list[Game]
):
    """
    Asserts that a game following Kasparov–Sosonko for six plies, then
    withdrawing both knights and replaying them, matches over the nine
    positions after its return, each four plies later than Kasparov's.
    """
    match = index.match(
        line(
            "d4",
            "Nf6",
            "c4",
            "e6",
            "Nf3",
            "d5",
            "Ng1",
            "Ng8",
            "Nf3",
            "Nf6",
            "Nc3",
            "Bb4",
            "cxd5",
            "exd5",
            "Bg5",
            "h6",
            "Bh4",
            "c5"
        )
    )

    assert match.game == stored[0]
    assert match.span == Span(length=9, offset=-4, start=10)


def test_a_stored_game_reaching_a_position_four_times_ties_with_no_other_game():
    """
    Asserts that a stored game holding the starting position at plies 0,
    4, 8, and 12 ranks its four runs by ply, matches at the earliest, and
    counts as one game among the ties.
    """
    index = PositionIndex.build([line(*["Nf3", "Nf6", "Ng1", "Ng8"] * 3)])
    match = index.match(line("h4"))

    assert (
        index.runs(line("h4"))
             .get_column("offset")
             .to_list()
    ) == [0, 4, 8, 12]
    assert match.span == Span(length=1, offset=0, start=0)
    assert match.ties == 0


def test_a_tie_goes_to_the_game_the_index_holds_first(
    index  : PositionIndex,
    stored : list[Game]
):
    """
    Asserts that a game sharing its first four positions with both of
    Pachman's games matches the 1965 game, which the index holds first, and
    counts the 1963 game as sharing a run as long.
    """
    match = index.match(line("Nf3", "Nf6", "c4", "d6"))

    assert match.game == stored[1]
    assert match.span == Span(length=4, offset=0, start=0)
    assert match.ties == 1


def test_a_tie_goes_to_the_run_starting_earliest(
    index  : PositionIndex,
    stored : list[Game]
):
    """
    Asserts that a game sharing its first three positions with both of
    Pachman's games, and three more with Kasparov–Sosonko once its knights
    return home, matches the 1965 game, whose run starts earlier, although
    the index holds Kasparov–Sosonko first.
    """
    match = index.match(line("Nf3", "Nf6", "Ng1", "Ng8", "d4", "Nf6"))

    assert match.game == stored[1]
    assert match.span == Span(length=3, offset=0, start=0)
    assert match.ties == 2


def test_an_index_of_no_game_matches_nothing(demo: Game, tmp_path: Path):
    """
    Asserts that an index built from no game writes, reads back, and finds
    no match for any submitted game.
    """
    PositionIndex.build([]).write(tmp_path)

    assert PositionIndex.read(tmp_path).match(demo) is None


def test_each_position_holds_the_move_played_from_it():
    """
    Asserts that the positions table holds one row per position of a stored
    game, keyed by its Zobrist hash beside the move in UCI played from it,
    with no move at the game's last position.
    """
    game = line("e4", "e5")

    assert (
        PositionIndex.build([game])
                     .positions.collect()
                     .rows(named=True)
    ) == [
        {
            "game" : 0,
            "key"  : key,
            "move" : move,
            "ply"  : ply
        }
        for ply, (key, move) in enumerate(
            zip(game.keys, ("e2e4", "e7e5", None), strict=True)
        )
    ]


@given(stored=lists(games(plies=12), max_size=4))
def test_any_store_reads_back_as_it_was_built(
    stored           : list[Game],
    tmp_path_factory : TempPathFactory
):
    """
    Asserts that every game an index is built from reads back from Parquet,
    in the order it was built, with the tags, the moves, and the errors
    it held.
    """
    directory = tmp_path_factory.mktemp("store")
    PositionIndex.build(stored).write(directory)

    assert list(map(PositionIndex.read(directory).game, range(len(stored)))) == stored


@given(
    stored    = lists(games(plies=12, width=3), max_size=4, min_size=1),
    submitted = games(plies=12, width=3)
)
def test_a_match_is_the_longest_run_any_stored_game_shares(
    stored    : list[Game],
    submitted : Game
):
    """
    Asserts that the match for any submitted game is the longest run of
    shared positions a search over every pair of plies finds, with ties
    going to the run starting earliest, then to the game the index holds
    first, then to the run starting earliest in that game.
    """
    runs = [
        (length, start, number, ply - start)
        for number, game in enumerate(stored)
        for start, ply in product(range(len(submitted.keys)), range(len(game.keys)))
        if (start == 0 or ply == 0 or submitted.keys[start - 1] != game.keys[ply - 1])
        and (length := shared(submitted.keys[start:], game.keys[ply:]))
    ]
    length, start, number, offset = min(runs, key=lambda run: (-run[0], *run[1:]))
    match = PositionIndex.build(stored).match(submitted)

    assert match.game == stored[number]
    assert match.span == Span(length=length, offset=offset, start=start)
    assert match.ties == len({run[2] for run in runs if run[0] == length}) - 1


@mark.parametrize(
    "table",
    [param(table.name, id=table.name) for table in fields(PositionIndex)]
)
def test_reading_an_index_missing_a_table_raises(
    stored   : list[Game],
    table    : str,
    tmp_path : Path
):
    """
    Asserts that scanning an index missing either table raises
    `FileNotFoundError` at once, although the other table reads.
    """
    PositionIndex.build(stored).write(tmp_path)
    (tmp_path / f"{table}.parquet").rename(tmp_path / "moved.parquet")

    with raises(FileNotFoundError):
        PositionIndex.read(tmp_path)


def test_the_demo_game_matches_the_game_it_follows(
    demo   : Game,
    index  : PositionIndex,
    stored : list[Game]
):
    """
    Asserts that the demo game matches Kasparov–Sosonko over the 43
    positions from the start through `21...b6`, parting where Kasparov
    played `22. Bc2`.
    """
    match = index.match(demo)

    assert match.game == stored[0]
    assert match.span == Span(length=43, offset=0, start=0)
    assert match.parting == "22. Bc2"
    assert match.ties == 0


@mark.parametrize(
    "tag",
    [
        param('[FEN "garbage"]', id="unreadable-fen"),
        param('[Variant "Bughouse"]', id="unknown-variant")
    ]
)
def test_a_game_python_chess_cannot_set_up_is_stored_without_positions(
    pgn    : Callable[..., Path],
    stored : list[Game],
    tag    : str
):
    """
    Asserts that a game whose `FEN` or `Variant` tag python-chess rejects
    builds into the games table with the error its reader recorded and into
    no row of the positions table, so no match returns it.
    """
    [rejected] = Game.read(pgn(f"{tag}\n\n1. e4 *\n"))
    index      = PositionIndex.build([rejected, *stored])

    assert rejected.errors
    assert index.game(0) == rejected
    assert 0 not in index.positions.collect().get_column("game")
    assert index.match(line("e4")).game == stored[0]
