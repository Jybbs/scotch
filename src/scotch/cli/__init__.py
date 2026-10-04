"""
Exposes the `scotch` command, whose help opens on the summary the package
metadata carries and whose `--version` flag prints the version that metadata
names. Each subcommand sits in a group named for the verb it runs.
"""

from cyclopts           import App, Parameter
from importlib.metadata import metadata

from scotch.cli.match import game

app = App(
    default_parameter = Parameter(negative=()),
    help              = metadata("scotch")["Summary"],
    name              = "scotch"
)

(
    app.command(
        App(help="Matches a submitted game against the stored games.", name="match")
    )
       .command(game)
)
