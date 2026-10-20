"""
Holds the `scotch cite` commands, which print the footnote definition of
a source `docs/references.bib` holds, for pasting into an issue or a pull
request.
"""

from cyclopts import Parameter
from typing   import Annotated

from scotch.citations.schemas import References
from scotch.cli.settings      import root


def source(*keys: Annotated[str, Parameter(required=True)]):
    """
    Prints the footnote definition citing each source named by its key in
    `docs/references.bib`, in the order given, each on one line with a blank
    line between two of them, ready to paste beneath the text of an issue
    or a pull request citing it, since a page takes its own from `scotch
    render docs`.

    Exits nonzero without printing any definition, naming each key no entry
    in the file holds, or naming each block or entry that cannot be read
    where the file holds one.

    Args:
        keys: The key of each source, such as `zobrist1970`.
    """
    try:
        references = References.shipped(root())
    except ValueError as error:
        raise SystemExit(str(error))

    if unknown := references.unknown(*keys):
        raise SystemExit("\n".join(unknown))

    print(references.cite(*keys))
