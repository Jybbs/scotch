"""
Holds the `scotch apply` commands, which send the registries under
`.github/` to the repository the checkout's remote names on GitHub, run by
the `repo:labels` and `repo:rulesets` tasks once their prompt is answered.
"""

from json       import loads
from pathlib    import Path
from pydantic   import ValidationError
from shlex      import join
from subprocess import PIPE, run

from scotch.cli           import app
from scotch.cli.settings  import root
from scotch.repo.checkout import Checkout


def gh(directory: Path, *arguments: str, payload: str | None = None) -> str:
    """
    Runs `gh` with `arguments` from `directory`, whose remote names the
    repository `gh` fills its placeholders from, passing `payload` on its
    standard input and leaving its errors to reach the terminal.

    Returns:
        What `gh` printed.

    Raises:
        SystemExit: Naming the call, where `gh` exits nonzero, so nothing
                    after it is sent.
    """
    result = run(
        ["gh", *arguments],
        check  = False,
        cwd    = directory,
        input  = payload,
        stdout = PIPE,
        text   = True
    )

    if result.returncode:
        raise SystemExit(
            f"`{join(('gh', *arguments))}` failed, so nothing after it was sent"
        )

    return result.stdout


def labels():
    """
    Creates or updates every label `.github/labels.toml` declares on the
    repository the checkout's remote names, then prints each live label the
    registry omits, which stays on GitHub until it is renamed or deleted
    by hand.

    Exits nonzero before writing anything where the registry fails to read,
    and at the first label `gh` fails to write.
    """
    checkout = Checkout(app=app, root=root())

    try:
        registry = checkout.labels
    except ValidationError as error:
        raise SystemExit(str(error)) from None

    for label in registry.rows:
        gh(checkout.root, *label.arguments)

    live = gh(
        checkout.root,
        "api",
        "--jq",
        ".[].name",
        "--paginate",
        "repos/{owner}/{repo}/labels"
    ).splitlines()

    if omitted := registry.omits(live):
        print(
            "The registry omits these live labels, left for a rename or a "
            "deletion by hand:",
            *omitted,
            sep = "\n"
        )


def rulesets():
    """
    Updates in place each live ruleset sharing the name of a file under
    `.github/rulesets/`, creating the ruleset where none does, then sends
    every setting `.github/settings.toml` declares beside the description
    `pyproject.toml` declares, the domain of its homepage, and its keywords
    as the repository's topics, and prints each live ruleset no file names,
    which stays on GitHub until it is deleted by hand.

    Exits nonzero before writing anything where a ruleset, the settings, or
    the manifest fails to read, and at the first call `gh` fails to send.
    """
    checkout = Checkout(app=app, root=root())

    try:
        files     = checkout.rulesets
        pyproject = checkout.pyproject
        settings  = checkout.settings
    except ValidationError as error:
        raise SystemExit(str(error)) from None

    live = dict(
        map(
            loads,
            gh(
                checkout.root,
                "api",
                "--jq",
                ".[] | [.name, .id]",
                "--paginate",
                "repos/{owner}/{repo}/rulesets?includes_parents=false"
            ).splitlines()
        )
    )
    node = gh(checkout.root, "api", "--jq", ".node_id", "repos/{owner}/{repo}").strip()

    for request in (
        *(ruleset.request(live.get(ruleset.name)) for ruleset in files),
        *settings.requests(node, pyproject)
    ):
        gh(checkout.root, *request.arguments, payload=request.payload)

    if omitted := sorted(live.keys() - {ruleset.name for ruleset in files}):
        print(
            "No file under `.github/rulesets/` names these live rulesets, left "
            "for a deletion by hand:",
            *omitted,
            sep = "\n"
        )
