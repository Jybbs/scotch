"""
Holds the `scotch lift` commands, which report every pin of the repository
lagging its newest release, try the lift in a scratch clone, and write it,
run by the `lock:lift` task.
"""

from cyclopts   import Parameter
from datetime   import date
from os         import environ, fsdecode
from pydantic   import ValidationError
from shlex      import join
from subprocess import CalledProcessError
from sys        import stderr
from typing     import Annotated

from scotch.cli           import app
from scotch.cli.settings  import root
from scotch.pins.managers import Pins
from scotch.pins.schemas  import Report, coupled
from scotch.pins.trees    import Tree
from scotch.repo.checkout import Checkout


def pins(
    *,
    hold  : Annotated[tuple[str, ...], Parameter(
        help = (
            "A pin the trial and the write leave where it stands, together with "
            "each pin `repo:audit` holds to it, such as `@vitest/coverage-v8` "
            "for `vitest`, given once per pin."
        )
    )] = (),
    trial : Annotated[bool, Parameter(
        help = (
            "Tries the lift in a scratch clone of the checkout and runs every "
            "check a pull request runs there."
        ),
        name = "--try"
    )] = False,
    write : Annotated[bool, Parameter(
        help = (
            "Writes the lift into the checkout as one diff, relocking every "
            "lockfile through its own manager, once `mise audit` passes on it."
        )
    )] = False
) -> int:
    """
    Prints one Markdown table of every pin the repository at the project's
    root declares that lags its newest release, naming the file declaring
    it, its current and newest versions, the newest release's age in days,
    whether the lift is major, and the advisories it clears. The lift
    of `node` stops inside the major of the newest `@types/node`, since
    `repo:audit` holds the two to one major.

    Under `--try`, writes every lift the table lists but those of the pins
    `--hold` names and of each pin `repo:audit` holds to one of them, such
    as `@types/node` beside `node`, into a scratch clone of the checkout,
    carrying its uncommitted and untracked files, and runs `mise ci` there.
    Where that fails, the trial runs again holding back each major lift in
    turn together with the pins `repo:audit` holds to it, printing whether
    each passes, and the log of each attempt lands under `.cache/lift/`.
    Under `--write`, relocks the lift in a scratch clone and, once `mise
    audit` passes there, writes it into the checkout as one diff, after a
    passing trial where `--try` is given as well.

    Exits with status 2 where `--hold` names a pin the table lists nowhere,
    and with status 1 naming the problem where a trial fails, where the
    lift's relock or the `mise audit` after it fails, where a file of the
    checkout or a tool's answer fails to read as its record, naming the
    file or the record, or where a command the run starts fails, such as one
    reading a pin's newest release or the `git apply` writing the lift into
    a checkout whose files changed while the trial ran.
    """
    try:
        tree   = Tree.scrubbed(Checkout(app=app, root=root()), environ)
        report = Report(
            lifts = tuple(
                lift
                for manager in Pins.__subclasses__()
                for lift in manager(tree=tree).lifts()
            )
        )
        print(report.table(date.today()))

        if unknown := sorted(set(hold) - report.names):
            print(f"The table lists no pin named {', '.join(unknown)}", file=stderr)

            return 2

        held  = report.without(hold)
        patch = None

        if not held.lifts or not (trial or write):
            return 0

        if trial:
            patch = tree.attempt(held.rows, tree.logs / "trial.log", checked=True)

            if patch is None:
                for name in held.majors:
                    passes = tree.attempt(
                        held.without({name}).rows,
                        tree.logs / f"held-{name.replace('/', '-')}.log",
                        checked = True
                    ) is not None
                    named = " and ".join(f"`{pin}`" for pin in sorted(coupled(name)))
                    print(
                        f"Holding back {named} {'passes' if passes else 'still fails'}"
                    )

                raise SystemExit(f"The lift fails its trial, logged under {tree.logs}")

            print("The lift passes `mise ci`")

        if write:
            if patch is None and (
                patch := tree.attempt(held.rows, tree.logs / "write.log", checked=False)
            ) is None:
                raise SystemExit(
                    "The lift fails to relock or to pass `mise audit`, logged under "
                    f"{tree.logs}"
                )

            for path in tree.apply(patch):
                print(f"Lifted {path}")

        return 0
    except CalledProcessError as error:
        raise SystemExit(
            f"`{join(map(str, error.cmd))}` exited with status {error.returncode}"
            f"\n{fsdecode(error.stderr or '')}".rstrip()
        )
    except ValidationError as error:
        raise SystemExit(str(error)) from None
