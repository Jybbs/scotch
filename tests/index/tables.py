"""
Pins what `PositionIndex` finds for a submitted game against a store built
from the three games in `fixtures/stored.pgn`, what it reports for one
position, that a store reads back from its files as it was built, that a
read holds each file to its layout, and what a `Batch` keeps of a fetched
file and an index merged from several keeps of a game they repeat, and what
a published store holds.
"""

from collections           import Counter
from collections.abc       import Callable
from common.games          import line
from common.sources        import declare, land
from common.strategies     import games
from hashlib               import sha256
from hypothesis            import given
from hypothesis.strategies import integers, lists
from itertools             import product, takewhile
from json              import loads
from pathlib           import Path
from polars            import DataFrame, read_parquet
from polars.exceptions import SchemaError
from pytest            import TempPathFactory, mark, param, raises
from zlib              import decompressobj

from scotch.games.schemas import Game, Origin
from scotch.index.schemas import Answer, GAMES, LEFT, ROWS, RUNS, Reply, Span
from scotch.index.tables  import Batch, PositionIndex


def shared(first: tuple[int, ...], second: tuple[int, ...]) -> int:
    """
    Counts the keys `first` and `second` share from their first key on.
    """
    return sum(
        1 for _ in takewhile(lambda pair: pair[0] == pair[1], zip(first, second))
    )


def test_a_batch_leaves_out_each_game_with_a_problem(tmp_path: Path):
    """
    Asserts that a batch read from a file lays out each game python-chess
    reads with no problem, and keeps apart a game holding an illegal move
    and one whose `Variant` tag names a variant other than standard chess,
    each with its place in the file.
    """
    source = land(
        tmp_path,
        "Four.pgn",
        body = (
            b'1. e4 *\n\n[Event "?"]\n1. e4 e5 2. Qxf7 *\n\n'
            b'[Variant "Atomic"]\n\n1. d4 *\n\n'
            b'[Event "?"]\n1. c4 *\n'
        )
    )
    batch = Batch.read(tmp_path, source)

    assert [game.origin.place for game in batch.left] == [2, 3]
    assert batch.omitted.select("place", "reason").rows() == [
        (2, "unread"),
        (3, "variant")
    ]
    assert (
        batch.rows.get_column("origin")
             .struct.field("place")
             .to_list()
    ) == [1, 4]


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


def test_a_game_read_from_a_source_reads_back_with_its_origin(tmp_path: Path):
    """
    Asserts that a stored game read from a file of the store's sources reads
    back from the index with the file's address and its place there.
    """
    stored = list(
        land(tmp_path, "Two.pgn", body=b'1. e4 *\n\n[Event "?"]\n1. d4 *\n').games(
            tmp_path
        )
    )

    assert PositionIndex.build(stored).game(1) == stored[1]


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


@mark.parametrize(
    ("floor", "kept", "summary"),
    [
        param(
            0,
            [1, 2, 3],
            "Read 3 games from https://example.com/R.pgn",
            id = "no-floor"
        ),
        param(
            2500,
            [2, 3],
            "Read 3 games from https://example.com/R.pgn, 1 left below 2500",
            id = "floor"
        ),
        param(
            2501,
            [3],
            "Read 3 games from https://example.com/R.pgn, 2 left below 2501",
            id = "floor-past-a-rating"
        )
    ]
)
def test_a_batch_counts_each_game_rated_below_its_floor(
    floor    : int,
    kept     : list[int],
    summary  : str,
    tmp_path : Path
):
    """
    Asserts that a batch keeps each game rated at its floor or above and
    counts the rest on its summary line, a game at the floor kept and one a
    point below it counted.
    """
    source = land(
        tmp_path,
        "R.pgn",
        body = (
            b'[WhiteElo "2499"]\n\n1. e4 *\n\n[WhiteElo "2500"]\n\n1. d4 *\n\n'
            b'[BlackElo "2501"]\n\n1. c4 *\n'
        )
    )
    batch = Batch.read(tmp_path, source, floor)

    assert (
        batch.omitted.filter(reason="below")
             .select("place", "rating")
             .rows()
    ) == [
        (place, rating)
        for place, rating in ((1, 2499), (2, 2500), (3, 2501))
        if rating < floor
    ]
    assert (
        batch.rows.get_column("origin")
             .struct.field("place")
             .to_list()
    ) == kept
    assert batch.summary == summary


def test_a_game_two_batches_repeat_is_indexed_once_under_the_first(tmp_path: Path):
    """
    Asserts that a game a second file repeats, with the same Seven Tag
    Roster and moves but other supplemental tags, is indexed once with the
    first file's origin. A game differing from it in one tag of the roster
    is indexed beside it.
    """
    sources = (
        land(tmp_path, "First.pgn", body=b'[Round "1"]\n[ECO "C20"]\n\n1. e4 e5 *\n'),
        land(
            tmp_path,
            "Second.pgn",
            body = b'[Round "1"]\n\n1. e4 e5 *\n\n[Round "2"]\n\n1. e4 e5 *\n'
        )
    )
    index = PositionIndex.merge(Batch.read(tmp_path, source) for source in sources)

    assert (
        index.left.collect()
             .select("address", "place", "reason")
             .rows()
    ) == [("https://example.com/Second.pgn", 1, "repeat")]
    assert [
        (game.tags["Round"], game.origin.address, game.origin.place)
        for game in map(index.game, range(index.positions.games))
    ] == [
        ("1", "https://example.com/First.pgn", 1),
        ("2", "https://example.com/Second.pgn", 2)
    ]


def test_a_published_store_holds_each_piece_and_the_tags_of_its_games(
    index    : PositionIndex,
    stored   : list[Game],
    tmp_path : Path
):
    """
    Asserts that a published store opens on a head as long as its manifest
    names, then holds each key piece as `positions.bin` holds it, then one
    block of raw DEFLATE per game piece holding the piece and the tags of
    each stored game its slots hold, under a name hashed from its bytes.
    """
    path           = index.publish(tmp_path)
    data           = path.read_bytes()
    manifest       = loads((tmp_path / "manifest.json").read_text())
    keyed, shelved = index.positions.pieces
    keys           = b"".join(index.positions.part(True, at) for at in range(keyed))
    rest           = data[manifest["head"] + len(keys) :]
    shelves        = []

    for _ in range(shelved):
        block = decompressobj(wbits=-15)
        whole = block.decompress(rest)
        rest  = block.unused_data
        size  = int.from_bytes(whole[:4], "little")
        shelves.append((whole[4 : 4 + size], loads(whole[4 + size :])))

    assert manifest["store"] == path.name == f"{sha256(data).hexdigest()[:16]}.bin"
    assert data[manifest["head"] :].startswith(keys)
    assert rest == b""
    assert shelves == [
        (
            index.positions.part(False, at),
            [stored[number].tags for number in index.positions.numbers(at)]
        )
        for at in range(shelved)
    ]


def test_a_reference_names_the_stored_game_read_from_it():
    """
    Asserts that `<file>:<n>` finds the game at the place `n` of the file
    whose address names the path `file` under its host, read without its
    percent-encoding and possibly holding a colon, so two files of one name
    under two folders name their games apart, and that a reference naming
    no stored game finds nothing, a place written with a leading zero and a
    file named without its folder among them.
    """
    games = [
        line(
            "e4",
            origin = Origin(address="https://example.com/a/My%20File.zip", place=2)
        ),
        line("d4", origin=Origin(address="https://example.com/b/Other.zip", place=2)),
        line("c4", origin=Origin(address="https://example.com/c/A%3AB.zip", place=2)),
        line("g3", origin=Origin(address="https://example.com/c/Other.zip", place=2))
    ]
    index = PositionIndex.build(games)

    assert index.referenced("a/My File.zip:2") == games[0]
    assert index.referenced("b/Other.zip:2") == games[1]
    assert index.referenced("c/A:B.zip:2") == games[2]
    assert index.referenced("c/Other.zip:2") == games[3]
    assert index.referenced("b/Other.zip:02") is None
    assert index.referenced("b/Other.zip:3") is None
    assert index.referenced("Other.zip:2") is None
    assert index.referenced("a/Missing.zip:2") is None
    assert index.referenced("b/Other.zip") is None


@mark.parametrize(
    ("ratings", "first"),
    [
        param(({}, {}), 0, id="unrated-in-index-order"),
        param(({}, {"BlackElo": "1"}), 1, id="one-rating-over-none"),
        param(
            ({"WhiteElo": "2800"}, {"BlackElo": "1", "WhiteElo": "1"}),
            1,
            id = "both-ratings-over-one"
        ),
        param(
            (
                {"BlackElo": "2000", "WhiteElo": "2000"},
                {"BlackElo": "2000", "WhiteElo": "2800"}
            ),
            1,
            id = "higher-mean-first"
        ),
        param(
            ({"WhiteElo": "2100"}, {"BlackElo": "2000"}),
            0,
            id = "higher-one-rating-first"
        ),
        param(
            ({"BlackElo": "0", "WhiteElo": "0"}, {"WhiteElo": "1"}),
            1,
            id = "a-rating-of-zero-is-no-rating"
        ),
        param(
            ({"WhiteElo": "unknown"}, {"WhiteElo": "1"}),
            1,
            id = "a-rating-holding-no-number-is-no-rating"
        )
    ]
)
def test_a_tie_goes_to_the_game_whose_ratings_rank_highest(
    first   : int,
    ratings : tuple[dict[str, str], dict[str, str]]
):
    """
    Asserts that two stored games sharing runs as long rank by the mean of
    both ratings, above a game carrying one, then by that one rating, above
    a game carrying none, then in the order the index holds them.
    """
    games = [line("e4", "e5", **tags) for tags in ratings]
    match = PositionIndex.build(games).match(line("e4", "e5"))

    assert match.game == games[first]
    assert match.ties == 1


@given(stored=lists(games(plies=12), max_size=4))
def test_any_store_reads_back_as_it_was_built(
    stored           : list[Game],
    tmp_path_factory : TempPathFactory
):
    """
    Asserts that every game an index is built from reads back from its
    files, in the order it was built, with the tags, the moves, and the
    errors it held.
    """
    directory = tmp_path_factory.mktemp("store")
    PositionIndex.build(stored).write(directory)

    assert list(map(PositionIndex.read(directory).game, range(len(stored)))) == stored


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


def test_a_stored_game_set_up_from_a_fen_shares_the_positions_it_reaches():
    """
    Asserts that a stored game a `FEN` tag sets up reads back with the tag,
    that a game reaching that position by moves shares a run with it from
    there, and that the answer for that position counts its move.
    """
    fen   = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
    index = PositionIndex.build(
        [line("d4"), line("Nf3", "Nc6", FEN=fen, Result="1-0")]
    )

    assert index.game(1).tags["FEN"] == fen
    assert index.match(line("e4", "e5", "Nf3", "Nf6")).span == Span(
        length = 2,
        offset = -2,
        start  = 2
    )
    assert index.answer("1. e4 e5", top=1).replies == (
        Reply(outcomes=(1, 0, 0, 0), san="Nf3"),
    )


@given(
    stored    = lists(games(plies=12, width=3), max_size=4, min_size=1),
    submitted = games(plies=12, width=3)
)
def test_a_match_is_the_longest_run_any_stored_game_shares(
    stored    : list[Game],
    submitted : Game
):
    """
    Asserts that every run the index finds for any submitted game is one a
    search over every pair of plies finds, and that the match is the longest
    of them, with ties going to the game whose ratings rank highest, then to
    the game the index holds first, then to the run starting earliest in the
    submitted game, then to the run starting earliest in that game, and that
    `top` lists each game once at its longest run in that order.
    """
    runs = sorted(
        (-length, -game.standing, number, start, ply - start)
        for number, game in enumerate(stored)
        for start, ply in product(range(len(submitted.keys)), range(len(game.keys)))
        if (start == 0 or ply == 0 or submitted.keys[start - 1] != game.keys[ply - 1])
        and (length := shared(submitted.keys[start:], game.keys[ply:]))
    )
    index   = PositionIndex.build(stored)
    length  = -runs[0][0]
    longest = [
        next(run for run in runs if run[2] == number)
        for number in dict.fromkeys(run[2] for run in runs)
    ]

    assert index.runs(submitted).rows() == [
        (number, offset, start, -negated)
        for negated, _, number, start, offset in runs
    ]
    assert [
        (stored.index(match.game), match.span, match.ties)
        for match in index.matches(submitted, top=len(stored))
    ] == [
        (
            stored.index(stored[number]),
            Span(length=-negated, offset=offset, start=start),
            len({run[2] for run in runs if -run[0] == length}) - 1
        )
        for negated, _, number, start, offset in longest
    ]


@mark.parametrize("name", ["games.parquet", "left.parquet", "positions.bin"])
def test_reading_an_index_missing_a_file_raises(
    name     : str,
    stored   : list[Game],
    tmp_path : Path
):
    """
    Asserts that reading an index missing any of its files raises
    `FileNotFoundError`, whichever file is the one missing.
    """
    PositionIndex.build(stored).write(tmp_path)
    (tmp_path / name).rename(tmp_path / "moved")

    with raises(FileNotFoundError):
        PositionIndex.read(tmp_path)


@mark.parametrize(
    "layout",
    [
        param(lambda frame: frame.drop("game"), id="column-missing"),
        param(lambda frame: frame.with_row_index("row"), id="column-added"),
        param(lambda frame: frame.cast({"game": str}), id="other-dtype"),
        param(lambda frame: frame.select(reversed(frame.columns)), id="other-order")
    ]
)
def test_reading_a_table_written_under_another_layout_raises(
    layout   : Callable[[DataFrame], DataFrame],
    stored   : list[Game],
    tmp_path : Path
):
    """
    Asserts that scanning an index whose table of games lacks a declared
    column, carries one more, holds one under another type, or holds its
    columns in another order raises `SchemaError` at the read.
    """
    PositionIndex.build(stored).write(tmp_path)
    path = PositionIndex.table(tmp_path)
    layout(read_parquet(path)).write_parquet(path)

    with raises(SchemaError):
        PositionIndex.read(tmp_path)


def test_a_stored_null_move_reads_back_and_counts_as_a_move():
    """
    Asserts that a stored game holding a null move reads back with it, that
    the answer for the position before it counts it as `--`, and that a line
    of moves passes through it.
    """
    game  = line("e4", "--", "d4", Result="1-0")
    index = PositionIndex.build([game])

    assert index.game(0).moves == game.moves
    assert index.answer("1. e4", top=1).replies == (
        Reply(outcomes=(1, 0, 0, 0), san="--"),
    )
    assert index.answer("1. e4 --", top=1).replies == (
        Reply(outcomes=(1, 0, 0, 0), san="d4"),
    )


@mark.parametrize(
    "body",
    [param(b"", id="empty"), param(b"parquet\0\0" * 16, id="another-layout")]
)
def test_reading_a_positions_file_under_another_layout_raises(
    body     : bytes,
    stored   : list[Game],
    tmp_path : Path
):
    """
    Asserts that reading an index whose file of positions holds no bytes or
    bytes another layout wrote raises `SchemaError` naming the folder.
    """
    PositionIndex.build(stored).write(tmp_path)
    PositionIndex.path(tmp_path).write_bytes(body)

    with raises(SchemaError, match=str(tmp_path)):
        PositionIndex.read(tmp_path)


def test_a_tie_among_unrated_games_goes_to_the_game_the_index_holds_first(
    index  : PositionIndex,
    stored : list[Game]
):
    """
    Asserts that a game sharing its first four positions with both of
    Pachman's games, neither rated, matches the 1965 game, which the index
    holds first, and counts the 1963 game as sharing a run as long.
    """
    match = index.match(line("Nf3", "Nf6", "c4", "d6"))

    assert match.game == stored[1]
    assert match.span == Span(length=4, offset=0, start=0)
    assert match.ties == 1


def test_a_tie_goes_to_the_game_whose_ratings_rank_highest_over_an_earlier_run(
    index  : PositionIndex,
    stored : list[Game]
):
    """
    Asserts that a game sharing its first three positions with both of
    Pachman's unrated games, and three more with Kasparov–Sosonko once its
    knights return home, matches Kasparov–Sosonko, whose ratings rank it
    above the two, although their runs start earlier.
    """
    match = index.match(line("Nf3", "Nf6", "Ng1", "Ng8", "d4", "Nf6"))

    assert match.game == stored[0]
    assert match.span == Span(length=3, offset=-4, start=4)
    assert match.ties == 2


def test_an_answer_counts_a_result_outside_the_four_as_unfinished():
    """
    Asserts that a stored game whose `Result` tag holds none of the results
    `RESULTS` names counts under `*` among the games playing its move.
    """
    assert PositionIndex.build([line("e4", Result="abandoned")]).answer(
        "",
        top = 1
    ).replies == (Reply(outcomes=(0, 0, 0, 1), san="e4"),)


def test_an_answer_for_a_position_no_game_reaches_holds_nothing(index: PositionIndex):
    """
    Asserts that the answer for a position no stored game reaches holds no
    move and no game.
    """
    assert index.answer("1. h4 h5", top=1) == Answer(
        ended   = Reply(outcomes=(0, 0, 0, 0), san="end"),
        games   = (),
        replies = ()
    )


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
    builds into the games table with the error its reader recorded, holding
    no moves and reaching no position, so no match returns it.
    """
    [rejected] = Game.read(pgn(f"{tag}\n\n1. e4 *\n"))
    index      = PositionIndex.build([rejected, *stored])

    assert rejected.errors
    assert index.game(0) == rejected.model_copy(update={"moves": ()})
    assert index.positions.positions == sum(len(game.keys) for game in stored)
    assert index.match(line("e4")).game == stored[0]


@mark.parametrize(
    "sans",
    [
        param(("Nf3", "Nf6", "Ng1", "Ng8", "e4"), id="plays-on"),
        param(("Nf3", "Nf6", "Ng1", "Ng8"), id="ends-at-the-second-reach")
    ]
)
def test_an_answer_counts_a_game_reaching_a_position_twice_once(sans: tuple[str, ...]):
    """
    Asserts that a game reaching the starting position again counts once,
    under the move it played from its first reach, and never as ending there
    although it may end at the second reach.
    """
    game   = line(*sans)
    answer = PositionIndex.build([game]).answer("", top=1)

    assert answer.replies == (Reply(outcomes=(0, 0, 0, 1), san="Nf3"),)
    assert answer.ended.games == 0
    assert answer.games == (game,)


@given(
    chosen = integers(0),
    stored = lists(games(plies=12, width=3), max_size=4, min_size=1)
)
def test_an_answer_counts_each_game_under_the_move_from_its_first_reach(
    chosen : int,
    stored : list[Game]
):
    """
    Asserts that the answer for any position a stored game reaches counts
    every game holding its key once, under the move played from that key's
    first place in the game or as ending there, the most played move first,
    and lists those games in the order the index holds them.
    """
    ply     = chosen % len(stored[0].keys)
    key     = stored[0].keys[ply]
    reached = [(game, game.keys.index(key)) for game in stored if key in game.keys]
    played  = Counter(
        game.sans[first] for game, first in reached if first < len(game.moves)
    )
    answer = PositionIndex.build(stored).answer(
        stored[0].at(ply).fen(),
        top = len(stored)
    )

    assert [(reply.san, reply.games) for reply in answer.replies] == sorted(
        played.items(),
        key = lambda pair: (-pair[1], pair[0])
    )
    assert answer.ended.games == len(reached) - played.total()
    assert answer.games == tuple(game for game, _ in reached)


def test_an_answer_reads_a_move_the_reader_takes_short_of_its_last_letter():
    """
    Asserts that `Nf3x`, whose `Nf3` the PGN reader reads as the move,
    leaves the position `Nf3` reaches.
    """
    index = PositionIndex.build([line("e4", "e5", "Nf3", "Nc6")])

    assert index.answer("1. e4 e5 2. Nf3x", top=1) == index.answer(
        "1. e4 e5 2. Nf3",
        top = 1
    )


def test_an_index_counts_every_position_and_each_distinct_key():
    """
    Asserts that an index counts each position of each game it holds, the
    game's first position included, and each distinct key once.
    """
    positions = PositionIndex.build([line("e4", "e5"), line("e4", "c5")]).positions

    assert (positions.positions, positions.keys) == (6, 4)
    assert positions.moves(1) == ["e2e4", "c7c5"]


@mark.parametrize(
    "position",
    [
        param("1 e4 2 e5", id="move-numbers-with-no-period"),
        param("1.e4 1...e5", id="move-numbers-running-into-the-moves"),
        param("1. e4 ... e5", id="an-ellipsis-standing-alone"),
        param("1. e4 {a note} e5", id="comment"),
        param("1. e4 ; a rest of a line\ne5", id="comment-to-the-end-of-the-line"),
        param("1. e4 $1 e5 $14", id="numeric-annotation-glyphs"),
        param("1. e4! e5?!", id="annotation-marks"),
        param("1. e4 (1. d4 d5) e5", id="variation"),
        param("1. e4 e5 *", id="unfinished-result"),
        param("1. e4 e5 1-0", id="result"),
        param("1. e4+ e5#", id="check-and-mate-marks"),
        param("1. e2-e4 e7e5", id="long-algebraic"),
        param('[Event "A"]\n\n1. e4 e5', id="tag-pair")
    ]
)
def test_an_answer_reads_what_a_line_of_moves_holds_beside_its_moves(position: str):
    """
    Asserts that move numbers, comments, annotations, a variation, a result,
    and each spelling of a move the PGN reader takes leave the position the
    moves alone reach.
    """
    index = PositionIndex.build([line("e4", "e5", "Nf3"), line("d4")])

    assert index.answer(position, top=1) == index.answer("1. e4 e5", top=1)


def test_an_index_of_no_game_matches_nothing(demo: Game, tmp_path: Path):
    """
    Asserts that an index built from no game writes, reads back, and finds
    no match for any submitted game.
    """
    PositionIndex.build([]).write(tmp_path)

    assert PositionIndex.read(tmp_path).match(demo) is None


def test_each_frame_holds_the_columns_its_declaration_names(index: PositionIndex):
    """
    Asserts that the table read back, the runs frame, and the rows laid
    out before an index numbers them carry the columns `GAMES`, `RUNS`, and
    `ROWS` declare, in that order.
    """
    assert index.games.collect().schema == GAMES
    assert index.runs(line("e4")).schema == RUNS
    assert PositionIndex.rows([line("e4")]).schema == ROWS


def test_reading_a_left_out_table_under_another_layout_raises(
    stored   : list[Game],
    tmp_path : Path
):
    """
    Asserts that reading an index whose table of the games left out lacks a
    declared column raises `SchemaError`.
    """
    PositionIndex.build(stored).write(tmp_path)
    path = PositionIndex.omitted(tmp_path)
    read_parquet(path).drop("reason").write_parquet(path)

    with raises(SchemaError):
        PositionIndex.read(tmp_path)


@mark.parametrize(
    "position",
    [
        param("1. e4 e5 2. Nf3", id="line-of-moves"),
        param(
            "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
            id = "fen"
        ),
        param(
            "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -",
            id = "fen-of-four-fields"
        ),
        param(
            " rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R  b KQkq - 1 2",
            id = "fen-behind-spaces"
        ),
        param(
            '[FEN "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"]\n\n'
            "2. Nf3",
            id = "fen-tag-pair"
        )
    ]
)
def test_an_answer_counts_the_moves_played_from_a_position(position: str):
    """
    Asserts that the answer for a position reached through a line of moves
    or named by a FEN, a `FEN` tag pair included, counts each move the
    stored games played from it and how those games ended, the games ending
    there apart, and lists the games newest first.
    """
    games = [
        line("e4", "e5", "Nf3", "Nc6", Date="2000.01.01", Result="1-0"),
        line("e4", "e5", "Nf3", "Nc6", Date="2010.01.01", Result="0-1"),
        line("e4", "e5", "Nf3", "Nf6", Date="2005.??.??", Result="1/2-1/2"),
        line("e4", "e5", "Nf3", Date="2015.01.01", Result="*"),
        line("d4", Date="2020.01.01")
    ]

    assert PositionIndex.build(games).answer(position, top=3) == Answer(
        ended   = Reply(outcomes=(0, 0, 0, 1), san="end"),
        games   = [games[3], games[1], games[2]],
        replies = [
            Reply(outcomes=(1, 0, 1, 0), san="Nc6"),
            Reply(outcomes=(0, 1, 0, 0), san="Nf6")
        ]
    )


def test_reading_a_table_holding_no_parquet_raises(stored: list[Game], tmp_path: Path):
    """
    Asserts that reading an index whose table of games holds bytes no
    Parquet writer wrote raises `SchemaError` rather than the error Polars
    raises for the file.
    """
    PositionIndex.build(stored).write(tmp_path)
    PositionIndex.table(tmp_path).write_bytes(b"")

    with raises(SchemaError):
        PositionIndex.read(tmp_path)


def test_reading_a_table_under_another_layout_raises_with_no_positions_file(
    stored   : list[Game],
    tmp_path : Path
):
    """
    Asserts that a table of games under another layout raises `SchemaError`
    ahead of the file of positions, so a folder an earlier layout wrote,
    which holds no such file, reads as another layout rather than as no
    index.
    """
    PositionIndex.build(stored).write(tmp_path)
    path = PositionIndex.table(tmp_path)
    read_parquet(path).drop("game").write_parquet(path)
    PositionIndex.path(tmp_path).rename(tmp_path / "moved")

    with raises(SchemaError):
        PositionIndex.read(tmp_path)


@mark.parametrize(
    ("position", "problem"),
    [
        param(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
            "stops short",
            id = "placement"
        ),
        param(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq",
            "stops short",
            id = "three-fields"
        ),
        param("x/8/8/8/8/8/8/8 w - -", "x/8", id="fen-naming-no-position"),
        param("1. e4 e4", "illegal san", id="illegal-move"),
        param("1. e4 hello", "names no move: 'hello'", id="word-naming-no-move"),
        param("1. e4 e5 Qh9", "names no move: 'Qh9'", id="square-off-the-board"),
        param("[hello 1. e4", "names no move: '\\[hello 1. e4'", id="no-tag-pair"),
        param('[Variant "Atomic"]\n\n1. e4', "unsupported variant", id="variant")
    ]
)
def test_an_answer_refuses_a_position_it_cannot_read(
    index    : PositionIndex,
    position : str,
    problem  : str
):
    """
    Asserts that a FEN stopping short of its first four fields, a FEN
    naming no position, a line holding an illegal move or a word naming no
    move, and a line naming a variant other than standard chess each raise
    `ValueError` naming the problem.
    """
    with raises(ValueError, match=problem):
        index.answer(position, top=1)


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


def test_the_games_left_out_read_back_as_they_were_merged(tmp_path: Path):
    """
    Asserts that the games a merge records as left out, a game its reader
    could not read and a repeat among them, write to the index's folder and
    read back under `LEFT`, a rating past what 16 bits hold among them.
    """
    source = land(
        tmp_path,
        "Twice.pgn",
        body = (
            b'[WhiteElo "204269"]\n\n1. e4 *\n\n[WhiteElo "204269"]\n\n1. e4 *\n\n'
            b'[Event "?"]\n1. e4 e5 2. Qxf7 *\n'
        )
    )
    PositionIndex.merge([Batch.read(tmp_path, source)]).write(tmp_path / "index")
    left = PositionIndex.read(tmp_path / "index").left.collect()

    assert left.schema == LEFT
    assert left.rows(named=True) == [
        {
            "address" : str(source.address),
            "dated"   : 0,
            "place"   : 3,
            "rating"  : 0,
            "reason"  : "unread"
        },
        {
            "address" : str(source.address),
            "dated"   : 0,
            "place"   : 2,
            "rating"  : 204269,
            "reason"  : "repeat"
        }
    ]


@given(batches=lists(lists(games(plies=4, width=2), max_size=3), max_size=3))
def test_a_merge_keeps_the_first_of_each_game_in_order(batches: list[list[Game]]):
    """
    Asserts that merging batches of games, which repeat one another within
    a batch and across batches, indexes exactly the first game of each Seven
    Tag Roster and line of moves, in the order the batches hold them.
    """
    stored = [*batch for batch in batches]
    index  = PositionIndex.merge(
        Batch(
            floor   = 0,
            left    = (),
            omitted = DataFrame(schema=LEFT),
            rows    = PositionIndex.rows(batch),
            source  = declare(f"{number}.pgn")
        )
        for number, batch in enumerate(batches)
    )

    assert list(map(index.game, range(index.positions.games))) == [
        game
        for number, game in enumerate(stored)
        if (
            game.roster, game.moves
        ) not in {(other.roster, other.moves) for other in stored[:number]}
    ]
