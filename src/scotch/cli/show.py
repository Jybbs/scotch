"""
Holds the `scotch show` commands, meaning `game`, which prints a stored game
as Portable Game Notation (PGN), `position`, which reports what the stored
games played from one position, and `store`, which reports what the store
holds.
"""

from cyclopts          import Parameter
from cyclopts.types    import PositiveInt
from polars.exceptions import SchemaError
from re                import match
from typing            import Annotated

from scotch.cli.settings    import Settings
from scotch.index.tables    import PositionIndex
from scotch.sources.schemas import Manifest, Sources


def game(reference: str):
    """
    Prints the stored game a `<file>:<n>` reference names as PGN, for any
    chess program to open, its tags then its mainline.

    Warns where the files changed since the index was built, and exits
    nonzero naming the problem where the index holds no such game, where no
    index has been built, or where the one built holds another layout.

    Args:
        reference: The stored game, as `scotch match game` names it.
    """
    if (found := Settings().opened().referenced(reference)) is None:
        raise SystemExit(f"No stored game is named {reference}")

    print(found.pgn)


def position(
    *position : Annotated[
        str,
        Parameter(
            allow_leading_hyphen = True,
            help                 = (
                "The Forsyth–Edwards Notation of the position or a line of moves from"
                " the start, quoted or not, the starting position where left out."
            )
        )
    ],
    top       : Annotated[
        PositiveInt, Parameter(help="The count of games to list, the newest first.")
    ] = 20
):
    """
    Reports what the stored games played from one position.

    Prints how many stored games reach it, each move they played from it
    with how many games played it and how those games ended, the games
    ending at the position under `end`, and then the games themselves,
    newest first, each named as `<file>:<n>`. A game reaching the position
    twice counts once, under the move it played from its first reach. A line
    of moves is read as PGN, which skips a token that names no move.

    Warns where the files changed since the index was built, and exits
    nonzero naming the problem where a token opening on a hyphen names no
    option, where a Forsyth–Edwards Notation names no position or stops
    short of its first four fields, since a placement alone would read as
    white to move with no castling rights, where a line of moves holds an
    illegal move, where no index has been built, or where the one built
    holds another layout.
    """
    for token in position:
        if match(r"-+[^-\s]", token):
            raise SystemExit(f"Unknown option: {token}")

    try:
        print(Settings().opened().answer(" ".join(position), top).summary)
    except ValueError as error:
        raise SystemExit(str(error))


def store():
    """
    Reports what the store holds.

    Prints each file `sources.toml` declares with its size and fetch date,
    the games and positions the index holds, whether the files have changed
    since the index was built from them, and the command to run next.
    """
    settings = Settings()
    manifest = Manifest.read(settings.downloads)
    sources  = Sources.read().sources

    for source in sources:
        download = manifest.downloads.get(source.address)
        print(f"{source.file}  {download.summary if download else 'not fetched'}")

    try:
        positions = PositionIndex.read(settings.index).positions
    except FileNotFoundError, SchemaError:
        current = False
        print(f"No index in this layout has been built under {settings.index}")
    else:
        count   = positions.games
        current = not settings.stale
        print(
            f"The index holds {count:,} {'game' if count == 1 else 'games'} and"
            f" {positions.positions:,} positions"
        )
        print(
            "The index was built from the files as fetched"
            if current
            else "The files have changed since the index was built from them"
        )

    print(
        "Next: scotch fetch games"
        if any(source.address not in manifest.downloads for source in sources)
        else "Next: scotch match game <pgn>"
        if current
        else "Next: scotch index games"
    )
