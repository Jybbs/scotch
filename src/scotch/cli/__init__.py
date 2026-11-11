"""
Exposes the `scotch` command, whose help opens on the sentence
`[project].description` declares and whose `--version` flag prints
the version the package metadata names, beside `root`, which finds the
`pyproject.toml` holding that sentence. Each verb's group sits in the module
under `cli/` named for the verb, which the app imports only once a command
of that group, or its help, is run.
"""

from cyclopts           import App, Parameter
from importlib.metadata import distributions
from pathlib            import Path
from tomllib            import loads


def root() -> Path:
    """
    Reads the directory the `scotch` distribution was installed from, which
    an installer records in the `direct_url.json` PEP 610 specifies, or the
    working directory where it recorded none.
    """
    origin = next(distributions(name="scotch")).origin

    return Path.from_uri(origin.url) if hasattr(origin, "dir_info") else Path.cwd()


app = App(
    default_parameter = Parameter(negative=()),
    help              = loads((root() / "pyproject.toml").read_text(encoding="utf-8"))[
        "project"
    ]["description"],
    name = "scotch"
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
