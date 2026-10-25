"""
Exposes the `scotch` command, whose help opens on the summary the package
metadata carries and whose `--version` flag prints the version that metadata
names, each subcommand sitting in a group named for the verb it runs. The
hidden `apply`, `audit`, `lift`, and `render` groups register their commands
by import path, which cyclopts imports only when one runs, since each of
their modules imports this one's `app`.
"""

from cyclopts           import App, Parameter
from importlib.metadata import metadata

from scotch.cli       import fetch, index
from scotch.cli.cite  import source
from scotch.cli.match import game

app = App(
    default_parameter = Parameter(negative=()),
    help              = metadata("scotch")["Summary"],
    name              = "scotch"
)
app.command(
    App(
        help = "Sends the registries under .github/ to the repository on GitHub.",
        name = "apply",
        show = False
    )
)
app["apply"].command("scotch.cli.apply:labels")
app["apply"].command("scotch.cli.apply:rulesets")
app.command(
    App(
        help = "Reports where the repository's configuration has drifted from itself.",
        name = "audit",
        show = False
    )
)
app["audit"].command("scotch.cli.audit:repo")
app.command(
    App(help="Prints the footnote definition citing a source.", name="cite")
)
app["cite"].command(source)
app.command(
    App(help="Downloads the files the store draws its games from.", name="fetch")
)
app["fetch"].command(fetch.games)
app.command(
    App(help="Builds the index of stored games from the fetched files.", name="index")
)
app["index"].command(index.games)
app.command(
    App(
        help = "Lists, tries, and writes the lift of each lagging pin.",
        name = "lift",
        show = False
    )
)
app["lift"].command("scotch.cli.lift:pins")
app.command(
    App(help="Matches a submitted game against the stored games.", name="match")
)
app["match"].command(game)
app.command(
    App(
        help = "Writes the files the site and the Markdown restate from a declaration.",
        name = "render",
        show = False
    )
)
app["render"].command("scotch.cli.render:docs")
