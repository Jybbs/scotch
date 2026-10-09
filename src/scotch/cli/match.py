"""
Holds `game`, the `scotch match game` command, which matches the first game
of a Portable Game Notation (PGN) file against the index of stored games.
"""

from cyclopts          import Parameter
from cyclopts.types    import ExistingFile
from pathlib           import Path
from polars.exceptions import SchemaError
from typing            import Annotated

from scotch.cli.settings  import Settings
from scotch.games.schemas import Game
from scotch.index.schemas import Export
from scotch.index.tables  import PositionIndex


def game(
    pgn  : Annotated[ExistingFile, Parameter(
        help = "The PGN file whose first game is matched."
    )],
    *,
    json : Annotated[
        Path | None,
        Parameter(
            help = "The file the match is written to as JSON for the site's viewer."
        )
    ] = None
):
    """
    Finds the stored game sharing the longest unbroken run of positions with
    the first game of a PGN file, printing the stored game's players, event,
    and date, the plies the two games share, and the move where they part,
    or a line saying no stored game shares a position with it.

    Reads the index from the `index` folder of the data directory, which is
    `.cache/data` under the project's root unless the `[tool.scotch]` table
    of its `pyproject.toml` or the `SCOTCH_DATA` variable moves it.

    Exits nonzero naming the problem where the file holds no game, where
    python-chess recorded errors reading the game, where its `Variant` tag
    names a variant other than standard chess, or where no index has been
    built or the one built holds another layout.
    """
    if (submitted := next(Game.read(pgn), None)) is None:
        raise SystemExit(f"Found no game in {pgn}")

    if submitted.problems:
        raise SystemExit(
            "\n".join(
                (f"Cannot match the game in {pgn}:", *submitted.problems)
            )
        )

    settings = Settings()

    try:
        index = PositionIndex.read(settings.index)
    except FileNotFoundError:
        raise SystemExit(f"No index has been built under {settings.index}")
    except SchemaError:
        raise SystemExit(f"The index under {settings.index} holds another layout")

    match = index.match(submitted)
    print(match.summary if match else "No stored game shares a position with this game")

    if json:
        json.parent.mkdir(exist_ok=True, parents=True)
        json.write_text(Export.from_match(match, submitted).model_dump_json(indent=2))
