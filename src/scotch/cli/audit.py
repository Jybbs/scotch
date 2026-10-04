"""
Holds the `scotch audit` commands, which report where the repository's own
configuration has drifted from itself, run by the `repo:audit` task.
"""

from itertools import chain
from pathlib   import Path

from scotch.repo.checkout import Checkout
from scotch.repo.checks   import Check
from scotch.repo.schemas  import Format, Level


def repo(*, output_format: Format = Format.TEXT) -> int:
    """
    Reports every divergence the checks in `scotch.repo` find in the
    repository the command runs from.

    Prints one line per finding and exits with status 1 where any finding
    is an error, whereas a warning that `mise tasks validate` reports is
    printed and fails nothing.

    Args:
        output_format: Whether each finding prints as a line of text or
                       as the workflow command GitHub Actions turns into
                       an annotation.

    Returns:
        The exit status, 1 where any finding is an error and 0 otherwise.
    """
    checkout = Checkout(root=Path())
    findings = list(
        chain.from_iterable(
            check(checkout=checkout).scan() for check in Check.__subclasses__()
        )
    )

    for finding in findings:
        print(finding.render(output_format))

    return int(any(finding.level is Level.ERROR for finding in findings))
