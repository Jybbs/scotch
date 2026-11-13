"""
Exposes the `scotch` command, whose help opens on the summary the package
metadata carries and whose `--version` flag prints the version that metadata
names. Each verb's group sits in the module under `cli/` named for the verb,
which the app imports the first time a run looks that group up, so `scotch
--help` imports none of them.
"""

from cyclopts           import App, Parameter
from importlib.metadata import distributions

app = App(
    default_parameter = Parameter(negative=()),
    help              = next(distributions(name="scotch")).metadata["Summary"],
    name              = "scotch"
)
app.command(
    "scotch.cli.apply:apply_group",
    help = "Sends the registries under .github/ to the repository on GitHub.",
    name = "apply",
    show = False
)
app.command(
    "scotch.cli.audit:audit_group",
    help = "Reports where the repository's configuration has drifted from itself.",
    name = "audit",
    show = False
)
app.command(
    "scotch.cli.cite:cite_group",
    help = "Prints the footnote definition citing a source.",
    name = "cite"
)
app.command(
    "scotch.cli.fetch:fetch_group",
    help = "Downloads the files the store draws its games from.",
    name = "fetch"
)
app.command(
    "scotch.cli.index:index_group",
    help = "Builds the index of stored games from the fetched files.",
    name = "index"
)
app.command(
    "scotch.cli.lift:lift_group",
    help = "Lists, tries, and writes the lift of each lagging pin.",
    name = "lift",
    show = False
)
app.command(
    "scotch.cli.match:match_group",
    help = "Matches a submitted game against the stored games.",
    name = "match"
)
app.command(
    "scotch.cli.publish:publish_group",
    help = "Writes the store the site matches a game against.",
    name = "publish",
    show = False
)
app.command(
    "scotch.cli.render:render_group",
    help = "Writes the files the site and the Markdown restate from a declaration.",
    name = "render",
    show = False
)
app.command(
    "scotch.cli.show:show_group",
    help = "Prints a stored game, a position, or what the store holds.",
    name = "show"
)
