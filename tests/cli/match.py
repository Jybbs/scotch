"""
Pins what `scotch match game` prints and writes for a game read from a PGN
file or from standard input, what `scotch match games` prints for each game
of a file, each against an index built under a directory the `SCOTCH_DATA`
variable names, the problem each names where it exits nonzero, and the
warning each prints where the fetched files changed since the index was
built.
"""

from base64           import urlsafe_b64decode
from collections.abc  import Callable
from common.app       import invoke
from common.games     import line
from common.sources   import declare
from errno            import EACCES, EISDIR, ENOENT
from io               import BytesIO, StringIO
from os               import strerror
from pathlib          import Path
from polars           import read_parquet
from pytest           import CaptureFixture, MonkeyPatch, mark, param
from syrupy.assertion import SnapshotAssertion
from types            import SimpleNamespace
from zlib             import decompress

from scotch.games.schemas   import Game, Origin
from scotch.index.schemas   import Export
from scotch.index.tables    import PositionIndex
from scotch.sources.schemas import Download, Manifest


@mark.parametrize("command", ["game", "games"])
@mark.usefixtures("indexed")
def test_a_file_holding_no_game_exits_naming_it(command: str, pgn: Callable[..., Path]):
    """
    Asserts that either command against a file holding no game exits nonzero
    naming the file.
    """
    path = pgn("")

    assert invoke("match", command, str(path)) == f"Found no game in {path}"


@mark.usefixtures("data")
def test_a_file_holding_several_games_exits_where_none_is_chosen(
    pgn: Callable[..., Path]
):
    """
    Asserts that a match against a file holding two games, with no `--game`
    choosing one, exits nonzero naming the file and the option.
    """
    path = pgn("1. e4 e5 *\n\n1. d4 d5 *\n")

    assert invoke("match", "game", str(path)) == (
        f"Found several games in {path}, which --game chooses among"
    )


@mark.usefixtures("indexed")
def test_game_chooses_one_game_of_a_file_holding_several(
    capsys   : CaptureFixture[str],
    pgn      : Callable[..., Path],
    snapshot : SnapshotAssertion
):
    """
    Asserts that `--game 2` matches the second game of a file, which shares
    five positions with the stored game, rather than the first, which shares
    four.
    """
    path = pgn("1. e4 e5 2. Nf3 d6 *\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 *\n")

    assert invoke("match", "game", str(path), "--game", "2") == 0
    assert capsys.readouterr().out == snapshot


@mark.usefixtures("data")
def test_game_past_the_last_game_of_a_file_exits_naming_both(pgn: Callable[..., Path]):
    """
    Asserts that `--game 2` against a file holding one game exits nonzero
    naming the file and the number.
    """
    path = pgn("1. e4 *")

    assert invoke("match", "game", str(path), "--game", "2") == (
        f"Found no game 2 in {path}"
    )


@mark.parametrize(
    ("code", "name"),
    [param(ENOENT, "missing.pgn", id="missing"), param(EISDIR, ".", id="directory")]
)
@mark.usefixtures("data")
def test_a_file_it_cannot_read_exits_naming_it_and_the_reason(
    code     : int,
    name     : str,
    tmp_path : Path
):
    """
    Asserts that a match against a path holding no file, or holding a
    directory, exits nonzero naming the path and the reason the system
    gives.
    """
    path = tmp_path / name

    assert invoke("match", "game", str(path)) == f"Cannot read {path}: {strerror(code)}"


@mark.usefixtures("indexed")
def test_standard_input_reads_as_a_file(
    capsys      : CaptureFixture[str],
    monkeypatch : MonkeyPatch,
    pgn         : Callable[..., Path]
):
    """
    Asserts that `-` prints for the game on standard input what the same
    game in a file prints, replacing each byte UTF-8 cannot decode.
    """
    monkeypatch.setattr(
        "scotch.cli.match.stdin",
        SimpleNamespace(buffer=BytesIO(b'[Event "caf\xe9"]\n\n1. e4 e5 2. Nf3 d6 *\n'))
    )

    piped, filed = (
        (invoke("match", "game", path), capsys.readouterr().out)
        for path in ("-", str(pgn("1. e4 e5 2. Nf3 d6 *")))
    )

    assert piped == filed
    assert piped[0] == 0


@mark.usefixtures("data")
def test_standard_input_holding_no_game_exits_naming_it(monkeypatch: MonkeyPatch):
    """
    Asserts that `-` with nothing on standard input exits nonzero naming
    standard input.
    """
    monkeypatch.setattr("scotch.cli.match.stdin", SimpleNamespace(buffer=BytesIO()))

    assert invoke("match", "game", "-") == "Found no game in standard input"


@mark.parametrize(
    ("argv", "continuation"),
    [
        param((), "Continues 2...Nc6 3. Bb5 1-0", id="to-the-end"),
        param(("--plies", "1"), "Continues 2...Nc6", id="cut-short")
    ]
)
@mark.usefixtures("indexed")
def test_plies_cuts_the_continuation_short(
    argv         : tuple[str, ...],
    capsys       : CaptureFixture[str],
    continuation : str,
    pgn          : Callable[..., Path]
):
    """
    Asserts that a match prints the stored game's moves through its result,
    and that `--plies` cuts them short.
    """
    assert invoke("match", "game", str(pgn("1. e4 e5 2. Nf3 d6 *")), *argv) == 0
    assert continuation in capsys.readouterr().out.splitlines()


@mark.parametrize(
    ("copies", "counted"),
    [
        param(2, "1 other stored game shares a run as long", id="singular"),
        param(3, "2 other stored games share a run as long", id="plural")
    ]
)
def test_a_match_counts_the_other_games_sharing_a_run_as_long(
    capsys  : CaptureFixture[str],
    copies  : int,
    counted : str,
    data    : Path,
    pgn     : Callable[..., Path]
):
    """
    Asserts that a match names how many other stored games share a run as
    long, in the singular for one and the plural for two.
    """
    PositionIndex.build([line("e4")] * copies).write(data / "index")

    assert invoke("match", "game", str(pgn("1. e4 *"))) == 0
    assert counted in capsys.readouterr().out.splitlines()


@mark.parametrize("command", ["game", "games"])
def test_a_missing_index_exits_naming_where_it_was_looked_for(
    command : str,
    data    : Path,
    pgn     : Callable[..., Path]
):
    """
    Asserts that either command with no index built under the data directory
    exits nonzero naming the directory it read.
    """
    assert invoke(
        "match",
        command,
        str(pgn("1. e4 *"))
    ) == f"No index has been built under {data / 'index'}"


@mark.parametrize(
    ("text", "problem"),
    [
        param(
            "1. e4 e5 2. Qxf7 *",
            (
                "illegal san: 'Qxf7' in "
                "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
            ),
            id = "illegal-move"
        ),
        param(
            '[Variant "Atomic"]\n\n1. e4 *',
            "unsupported variant: Atomic",
            id = "variant"
        )
    ]
)
@mark.usefixtures("data")
def test_a_game_that_cannot_be_matched_exits_naming_its_problem(
    pgn     : Callable[..., Path],
    problem : str,
    text    : str
):
    """
    Asserts that a match exits nonzero naming the file and the problem where
    python-chess recorded an error reading the game or its `Variant` tag
    names a variant other than standard chess.
    """
    path = pgn(text)

    assert invoke(
        "match",
        "game",
        str(path)
    ) == f"Found problems in the game in {path}:\n{problem}"


@mark.usefixtures("indexed")
def test_a_game_sharing_no_position_prints_a_line_saying_so(
    capsys   : CaptureFixture[str],
    pgn      : Callable[..., Path],
    snapshot : SnapshotAssertion
):
    """
    Asserts that a match of a game set up from a position the stored game
    never reaches prints one line saying no stored game shares a position
    with it.
    """
    path = pgn('[FEN "4k3/8/8/8/8/8/8/4K2R w K - 0 1"]\n\n1. O-O *')

    assert invoke("match", "game", str(path)) == 0
    assert capsys.readouterr().out == snapshot


@mark.usefixtures("indexed")
def test_a_match_prints_the_stored_game_the_span_and_the_parting(
    capsys   : CaptureFixture[str],
    pgn      : Callable[..., Path],
    snapshot : SnapshotAssertion
):
    """
    Asserts that the match of a game sharing its first four positions with
    the stored game prints the stored game's players, event, and date, its
    place in the file it was read from, the plies the two share, and the
    move the stored game played where they part.
    """
    assert invoke(
        "match",
        "game",
        str(pgn("1. e4 e5 2. Nf3 d6 *"))
    ) == 0
    assert capsys.readouterr().out == snapshot


@mark.usefixtures("indexed")
def test_an_index_holding_another_layout_exits_naming_where_it_was_read(
    data : Path,
    pgn  : Callable[..., Path]
):
    """
    Asserts that a run against an index whose games table lacks a column
    exits nonzero naming the directory it read.
    """
    games = PositionIndex.table(data / "index")
    read_parquet(games).drop("errors").write_parquet(games)

    assert invoke(
        "match",
        "game",
        str(pgn("1. e4 *"))
    ) == f"The index under {data / 'index'} holds another layout"


@mark.usefixtures("indexed")
def test_an_index_of_an_earlier_layout_exits_naming_where_it_was_read(
    data : Path,
    pgn  : Callable[..., Path]
):
    """
    Asserts that a folder holding a games table under another layout and
    no file of positions exits nonzero as another layout rather than as
    no index.
    """
    games = PositionIndex.table(data / "index")
    read_parquet(games).drop("errors").write_parquet(games)
    PositionIndex.path(data / "index").rename(data / "moved")

    assert invoke(
        "match",
        "game",
        str(pgn("1. e4 *"))
    ) == f"The index under {data / 'index'} holds another layout"


@mark.usefixtures("indexed")
@mark.parametrize(
    "option",
    [param("--link", id="declared"), param("--top", id="takes-a-value")]
)
def test_json_refuses_an_option_as_its_path(option: str, pgn: Callable[..., Path]):
    """
    Asserts that `--json` standing before another option exits naming that
    option rather than writing a file under its name.
    """
    assert invoke(
        "match",
        "game",
        str(pgn("1. e4 e5 *")),
        "--json",
        option
    ) == f"Unknown option: {option}"


@mark.parametrize(
    "argv",
    [param((), id="alone"), param(("--link", "--top", "1"), id="beside-the-others")]
)
def test_json_of_a_lone_hyphen_prints_the_export_alone(
    argv    : tuple[str, ...],
    capsys  : CaptureFixture[str],
    indexed : Game,
    pgn     : Callable[..., Path]
):
    """
    Asserts that `--json -` prints the export of the match and no other
    line, whatever other option stands beside it, so a program can read
    standard output as JSON.
    """
    path   = pgn("1. e4 e5 2. Nf3 d6 *")
    [game] = Game.read(path)

    assert invoke("match", "game", str(path), "--json", "-", *argv) == 0
    assert Export.model_validate_json(capsys.readouterr().out) == Export.from_match(
        PositionIndex.build([indexed]).match(game),
        game
    )


def test_json_writes_the_export_of_the_match(indexed: Game, pgn: Callable[..., Path]):
    """
    Asserts that `--json` writes the export of the match to the file it
    names, creating the folder that holds it and closing the file on a
    newline, with the submitted game beside the stored game.
    """
    path     = pgn("1. e4 e5 2. Nf3 d6 *")
    exported = path.parent / "missing" / "match.json"

    assert invoke("match", "game", str(path), "--json", str(exported)) == 0
    assert exported.read_text().endswith("}\n")

    export = Export.model_validate_json(exported.read_text())
    [game] = Game.read(path)

    assert export == Export.from_match(PositionIndex.build([indexed]).match(game), game)


def test_link_prints_after_the_games_top_lists(
    capsys : CaptureFixture[str],
    data   : Path,
    pgn    : Callable[..., Path]
):
    """
    Asserts that `--link` prints its address on the last line, beneath the
    games `--top` lists.
    """
    PositionIndex.build([line("e4", "e5"), line("e4", White="Other")]).write(
        data / "index"
    )

    assert invoke("match", "game", str(pgn("1. e4 e5 *")), "--top", "1", "--link") == 0

    printed = capsys.readouterr().out.splitlines()

    assert printed[-2].startswith("Other vs. ?")
    assert "/viewer#match=" in printed[-1]


def test_link_prints_the_address_opening_the_export_last(
    capsys  : CaptureFixture[str],
    indexed : Game,
    pgn     : Callable[..., Path]
):
    """
    Asserts that `--link` prints, after the report, the address of the
    Viewer holding the export of the match in its fragment.
    """
    path   = pgn("1. e4 e5 2. Nf3 d6 *")
    [game] = Game.read(path)

    assert invoke("match", "game", str(path), "--link") == 0

    printed = capsys.readouterr().out.splitlines()

    assert printed[0].startswith("White.zip:1  White, W vs. Black, B")
    assert Export.model_validate_json(
        decompress(urlsafe_b64decode(printed[-1].partition("/viewer#match=")[2]))
    ) == Export.from_match(PositionIndex.build([indexed]).match(game), game)


@mark.usefixtures("indexed")
def test_link_of_a_game_sharing_no_position_opens_the_submitted_game_alone(
    capsys : CaptureFixture[str],
    pgn    : Callable[..., Path]
):
    """
    Asserts that `--link` still prints an address where no stored game
    shares a position, beneath the line saying so.
    """
    path = pgn('[FEN "4k3/8/8/8/8/8/8/4K2R w K - 0 1"]\n\n1. O-O *')

    assert invoke("match", "game", str(path), "--link") == 0

    printed = capsys.readouterr().out.splitlines()

    assert printed[0] == "No stored game shares a position with this game"
    assert "/viewer#match=" in printed[1]


@mark.usefixtures("indexed")
def test_games_against_a_file_it_cannot_read_exits_naming_the_reason(
    pgn: Callable[..., Path]
):
    """
    Asserts that `scotch match games` against a file it holds no permission
    to read exits nonzero naming the file and the reason the system gives.
    """
    path = pgn("1. e4 *")
    path.chmod(0)

    assert invoke("match", "games", str(path)) == (
        f"Cannot read {path}: {strerror(EACCES)}"
    )


@mark.usefixtures("indexed")
def test_games_prints_one_line_for_each_game_of_a_file(
    capsys   : CaptureFixture[str],
    pgn      : Callable[..., Path],
    snapshot : SnapshotAssertion
):
    """
    Asserts that `scotch match games` prints a line naming each game of a
    file as `<file>:<n>`, beside its match, a line saying no stored game
    shares a position, or the problem reading the game recorded, so a game
    that cannot be matched leaves the rest of the report printing.
    """
    path = pgn(
        "1. e4 e5 2. Nf3 d6 *\n\n"
        "1. e4 e5 2. Qxf7 *\n\n"
        '[Variant "Atomic"]\n\n1. e4 *\n\n'
        '[FEN "4k3/8/8/8/8/8/8/4K2R w K - 0 1"]\n\n1. O-O *\n\n'
        "1. e4 e5 2. Nf3 Nc6 3. Bc4 *\n"
    )

    assert invoke("match", "games", str(path)) == 0
    assert capsys.readouterr().out.replace(path.name, "game.pgn") == snapshot


def test_top_lists_the_next_games_each_at_its_longest_run(
    capsys : CaptureFixture[str],
    data   : Path,
    pgn    : Callable[..., Path]
):
    """
    Asserts that `--top 2` prints the match, then a line for each of the
    next two stored games, each once, the longest run first, then the game
    whose ratings rank highest.
    """
    PositionIndex.build(
        [
            line(
                *moves,
                origin = Origin(address="https://example.com/A.zip", place=place),
                **tags
            )
            for place, (moves, tags) in enumerate(
                (
                    (("e4", "c5"), {"White": "Three"}),
                    (("e4", "e5", "Nf3"), {"White": "One"}),
                    (("e4", "e5"), {"White": "Unrated"}),
                    (("e4", "e5"), {"White": "Two", "WhiteElo": "2000"})
                ),
                start = 1
            )
        ]
    ).write(data / "index")

    assert invoke(
        "match", "game", str(pgn("1. e4 e5 2. Nf3 Nf6 *")), "--top", "2"
    ) == 0
    assert [
        printed
        for printed in capsys.readouterr().out.splitlines()
        if printed.startswith("A.zip")
    ] == [
        "A.zip:2  One vs. ?, ?, ????.??.??",
        "A.zip:4  Two vs. ?, ?, ????.??.??, 3 positions",
        "A.zip:3  Unrated vs. ?, ?, ????.??.??, 3 positions"
    ]


@mark.parametrize("command", ["game", "games"])
@mark.parametrize(
    ("recorded", "warned"),
    [param(b"a", False, id="files-as-indexed"), param(b"b", True, id="files-changed")]
)
@mark.usefixtures("indexed")
def test_a_match_warns_where_the_files_changed_since_the_index_was_built(
    capsys      : CaptureFixture[str],
    command     : str,
    data        : Path,
    monkeypatch : MonkeyPatch,
    pgn         : Callable[..., Path],
    recorded    : bytes,
    warned      : bool
):
    """
    Asserts that either command prints its report either way and writes a
    line naming the `downloads` folder to stderr only where the manifest
    there records a file the index's copy of the manifest records with other
    bytes.
    """
    for folder, body in (("index", b"a"), ("downloads", recorded)):
        (data / "file.zip").write_bytes(body)
        Manifest().recording(
            declare("file.zip").address,
            Download.from_file(data / "file.zip", etag=None)
        ).write(data / folder)

    monkeypatch.setattr("scotch.cli.settings.stderr", stderr := StringIO())

    assert invoke("match", command, str(pgn("1. e4 e5 2. Nf3 d6 *"))) == 0
    assert "White.zip:1  White, W vs. Black, B" in capsys.readouterr().out
    assert stderr.getvalue() == (
        f"The files under {data / 'downloads'} have changed since the index was"
        " built from them, so run `scotch index games` to rebuild it\n"
        if warned
        else ""
    )
