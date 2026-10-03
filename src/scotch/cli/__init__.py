"""
Exposes the `scotch` command, whose help opens on the summary the package
metadata carries and whose `--version` flag prints the version that metadata
names.
"""

from cyclopts           import App, Parameter
from importlib.metadata import metadata

app = App(
    default_parameter = Parameter(negative=()),
    help              = metadata("scotch")["Summary"],
    name              = "scotch"
)
