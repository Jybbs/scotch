"""
Holds the `scotch render` commands, which write the files the site and the
repository's Markdown carry from the declarations they restate, run by the
`docs:render` task.
"""

from polars.exceptions import SchemaError

from scotch.cli            import app
from scotch.cli.settings   import Settings, root
from scotch.docs.inventory import Outputs
from scotch.index.tables   import PositionIndex
from scotch.repo.schemas   import Pyproject


def docs():
    """
    Writes each file a declaration in the repository renders into, meaning
    the JSON the site's theme reads, the favicon and each lockup, the part
    of a page a declaration fills in, the figures a page sets inside its
    sentences, and the footnote definitions closing each Markdown file,
    printing the path of each file it changed.

    Writes the files the index renders into as well where one has been built
    under the data directory, which is `.cache/data` under the project's
    root unless the `[tool.scotch]` table of its `pyproject.toml` or the
    `SCOTCH_DATA` variable moves it, and otherwise prints that it left them
    as they stand.

    Exits nonzero naming the index where the one built there holds another
    layout, and otherwise naming the file it was writing, where a page's
    markers enclose other than one region, where a page cites a key no entry
    of `docs/references.bib` holds, where that file holds a block or an
    entry that cannot be read, or where an example line the pages draw holds
    no game read with no error or shares no position with a stored game.
    """
    settings = Settings()

    try:
        index = PositionIndex.read(settings.index)
    except FileNotFoundError:
        index = None
        print(
            f"Left the files the index renders into as they stand, since no index"
            f" has been built under {settings.index}"
        )
    except SchemaError:
        raise SystemExit(f"The index under {settings.index} holds another layout")

    repository = root()
    readme     = Pyproject.read(repository / "pyproject.toml").readme

    for output in Outputs.shipped(app, readme, repository, index):
        try:
            written = output.write(repository)
        except ValueError as error:
            raise SystemExit(f"{output.path}: {error}")

        if written:
            print(f"Rendered {output.path}")
