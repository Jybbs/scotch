"""
Exposes the `scotch` command, whose help opens on the summary the package
metadata carries and whose `--version` flag prints the version that metadata
names, each subcommand sitting in a group named for the verb it runs.
"""

from cyclopts           import App, Parameter
from importlib.metadata import metadata

from scotch.cli       import fetch, index
from scotch.cli.audit import repo
from scotch.cli.match import game

app = App(
    default_parameter = Parameter(negative=()),
    help              = metadata("scotch")["Summary"],
    name              = "scotch"
)
app.command(
    App(
        help = "Reports where the repository's configuration has drifted from itself.",
        name = "audit",
        show = False
    )
)
app["audit"].command(repo)
app.command(
    App(help="Downloads the files the store draws its games from.", name="fetch")
)
app["fetch"].command(fetch.games)
app.command(
    App(help="Builds the index of stored games from the fetched files.", name="index")
)
app["index"].command(index.games)
app.command(
    App(help="Matches a submitted game against the stored games.", name="match")
)
app["match"].command(game)
