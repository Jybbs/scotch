"""
Exposes the `scotch` command, whose help opens on the summary the package
metadata carries and whose `--version` flag prints the version that metadata
names. Each subcommand sits in a group named for the verb it runs, among
them the `audit` group the repository's own checks run under, which the help
leaves out.
"""

from cyclopts           import App, Parameter
from importlib.metadata import metadata

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
    App(help="Matches a submitted game against the stored games.", name="match")
)
app["match"].command(game)
