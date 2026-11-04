"""
Holds the `scotch match` commands, meaning `game`, which matches one game of
a Portable Game Notation (PGN) file or of standard input against the index
of stored games and prints how the stored game continued, and `games`, which
matches every game a file holds.
"""

from cyclopts       import Parameter
from cyclopts.types import ExistingFile, NonNegativeInt, PositiveInt
from pathlib        import Path
from sys            import stdin
from typing         import Annotated

from scotch.cli.settings  import Settings
from scotch.games.schemas import Game
from scotch.index.schemas import Export


def game(
    pgn    : Annotated[
        Path,
        Parameter(
            allow_leading_hyphen = True,
            help = "The PGN file holding the game, or - for standard input."
        )
    ],
    *,
    chosen : Annotated[
        PositiveInt | None,
        Parameter(
            help = "The game to match, counting from 1, where the file holds several.",
            name = "--game"
        )
    ] = None,
    json   : Annotated[
        Path | None,
        Parameter(
            allow_leading_hyphen = True,
            help                 = (
                "The file the match is written to as JSON, or - to print the JSON"
                " alone."
            )
        )
    ] = None,
    link   : Annotated[
        bool, Parameter(help="Prints the address of the Viewer opening the match.")
    ] = False,
    plies  : Annotated[
        PositiveInt | None,
        Parameter(help="The most plies of the stored game's continuation to print.")
    ] = None,
    top    : Annotated[
        NonNegativeInt,
        Parameter(help="The count of further stored games to list after the match.")
    ] = 0
):
    """
    Finds the stored game sharing the longest unbroken run of positions with
    one game of a PGN file.

    Prints the stored game as `<file>:<n>` beside its players, event, and
    date, the plies the two games share, the Forsyth–Edwards Notation of the
    position where they part with the move each played from it, the stored
    game's moves from there through its result, and the count of other
    stored games sharing a run as long, or a line saying no stored game
    shares a position with it. Stored games tied on the run rank by the mean
    of their players' ratings, highest first, then by the one rating a game
    carries, then in the order the index holds them.

    Reads the index from the `index` folder of the data directory, which is
    `.cache/data` under the project's root unless the `[tool.scotch]` table
    of its `pyproject.toml` or the `SCOTCH_DATA` variable moves it, and
    warns where a fetch since the index was built recorded other bytes for
    the files than the ones the index was read from.

    Exits nonzero naming the problem where the file cannot be read, holds
    no game, holds several with none chosen, or holds fewer than the one
    chosen, where reading the game recorded an error, such as a move illegal
    in the position it was played from or a `FEN` tag setting up a position
    no game reaches, where its `Variant` tag names a variant other than
    standard chess, where `--json` names a path opening on a hyphen other
    than `-`, or where no index has been built or the one built holds
    another layout.
    """
    if json and json != Path("-") and str(json).startswith("-"):
        raise SystemExit(f"Unknown option: {json}")

    try:
        submitted = (
            Game.chosen(
                Game.parse(stdin.buffer.read().decode(errors="replace")),
                "standard input",
                chosen
            )
            if pgn == Path("-")
            else Game.chosen(Game.read(pgn), pgn, chosen)
        )
    except OSError as error:
        raise SystemExit(f"Cannot read {pgn}: {error.strerror}")
    except ValueError as error:
        raise SystemExit(str(error))

    found  = Settings().opened().matches(submitted, top=top + 1)
    export = (
        Export.from_match(found[0] if found else None, submitted)
        if json or link
        else None
    )

    if json == Path("-"):
        print(export.model_dump_json(indent=2))
        return

    print(
        found[0].report(plies)
        if found
        else "No stored game shares a position with this game"
    )

    for match in found[1:]:
        print(match.line)

    if link:
        print(export.link)

    if json:
        json.parent.mkdir(exist_ok=True, parents=True)
        json.write_text(export.model_dump_json(indent=2) + "\n", encoding="utf-8")


def games(pgn: ExistingFile):
    """
    Matches every game of a PGN file against the index of stored games.

    Prints one line per game, naming it as `<file>:<n>` beside the stored
    game closest to it as `scotch match game` ranks them, or saying no
    stored game shares a position with it. Where reading a game recorded an
    error, or its `Variant` tag names a variant other than standard chess,
    its line holds the problem in place of a match, and the rest of the
    report still prints.

    Warns where the files changed since the index was built, and exits
    nonzero naming the problem where the file cannot be read or holds
    no game, where no index has been built, or where the one built holds
    another layout.

    Args:
        pgn: The PGN file holding the games.
    """
    try:
        read = Game.read(pgn)
    except OSError as error:
        raise SystemExit(f"Cannot read {pgn}: {error.strerror}")

    index = Settings().opened()
    place = 0

    for place, submitted in enumerate(read, start=1):
        print(
            f"{pgn.name}:{place}  "
            + (
                ", ".join(submitted.problems)
                or (
                    found.line
                    if (found := index.match(submitted))
                    else "No stored game shares a position with this game"
                )
            )
        )

    if not place:
        raise SystemExit(f"Found no game in {pgn}")
