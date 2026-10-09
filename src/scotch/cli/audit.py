"""
Holds the `scotch audit` commands, which report where the repository's own
configuration has drifted from itself, run by the `repo:audit` task.
"""

from scotch.cli.settings  import root
from scotch.repo.checkout import Checkout
from scotch.repo.checks   import Check
from scotch.repo.schemas  import Format, Level


def repo(*, output_format: Format = Format.TEXT) -> int:
    """
    Reports every divergence the checks in `scotch.repo` find in the
    repository at the project's root, printing one line per finding that
    names its file relative to that root, and exits with status 1 where any
    finding is an error rather than a warning.

    Args:
        output_format: Whether each finding prints as a line of text or
                       as the workflow command GitHub Actions turns into
                       an annotation.
    """
    checkout = Checkout(root=root())
    findings = [
        finding.model_copy(update={"path": finding.path.relative_to(checkout.root)})
        for check in Check.__subclasses__()
        for finding in check(checkout=checkout).scan()
    ]

    for finding in findings:
        print(finding.render(output_format))

    return int(any(finding.level is Level.ERROR for finding in findings))
