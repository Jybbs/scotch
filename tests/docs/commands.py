"""
Pins `Commands`, meaning the section the commands page sets for each command
the help lists, written from its docstring, its usage, each parameter's
type, bound, default, and help, and the messages it exits nonzero on, and
the commands `commands` lists.
"""

from cyclopts       import App, Parameter
from cyclopts.types import ExistingFile, NonNegativeInt, PositiveInt
from pathlib        import Path
from typing         import Annotated

from scotch.cli           import app
from scotch.docs.commands import Commands, commands
from scotch.docs.stops    import Stop, Stops


def test_a_flag_answers_only_to_the_names_the_default_parameter_of_its_group_allows():
    """
    Asserts that a flag of a command reads as the one name it answers to
    where the group holding the command, rather than the app, gives a flag
    no negative name.
    """

    def run(*, flag: bool = False):
        """
        Runs.

        Args:
            flag: The flag.
        """

    group  = App(name="do", default_parameter=Parameter(negative=()))
    sample = App(name="sample")
    sample.command(group)
    group.command(run)
    section = Commands(app=sample, stops=Stops(modules=(), stops=())).section(
        "do",
        "run"
    )

    assert "| `--flag` | A flag | Off |" in section
    assert "--no-flag" not in section


def test_a_flag_answers_only_to_the_names_the_default_parameter_of_the_app_allows():
    """
    Asserts that `--link` reads as the one name it answers to, since the
    default parameter of the `scotch` app gives a flag no negative name.
    """
    section = Commands(app=app).section("match", "game")

    assert "| `--link` | A flag | Off |" in section
    assert "--no-link" not in section


def test_a_required_variadic_parameter_takes_one_or_more_words():
    """
    Asserts that the keys `scotch cite source` requires read as one or more
    words a run must pass.
    """
    assert (
        "| `KEYS` | One or more words | Required |"
        in Commands(app=app).section("cite", "source")
    )


def test_a_section_of_a_command_taking_nothing_holds_no_table():
    """
    Asserts that a command taking no parameter and exiting on no message of
    its own writes its heading, its docstring, and its usage alone.
    """
    assert Commands(app=app).section("show", "store").endswith(
        "```text\nscotch show store\n```"
    )


def test_a_section_writes_the_docstring_usage_parameters_and_messages():
    """
    Asserts that a command's section opens on its heading, sets each
    paragraph of its docstring above `Args` on one line, writes its usage, a
    row for each parameter naming what it accepts and its default, and a row
    for each message the registry names for it alone.
    """

    def run(
        pgn    : ExistingFile,
        *words : Annotated[str, Parameter(help="Each word.")],
        game   : Annotated[PositiveInt | None, Parameter(help="The game.")] = None,
        link   : Annotated[bool, Parameter(help="Prints a link.")]          = False,
        name   : Annotated[str, Parameter(help="A name.")]               = "a",
        out    : Annotated[Path | None, Parameter(help="The file.")]     = None,
        quiet  : Annotated[bool, Parameter(help="Prints less.")]         = True,
        top    : Annotated[NonNegativeInt, Parameter(help="The count.")] = 0
    ):
        """
        Runs the sample command over every game the file holds, printing one
        line for each game it reads and naming the file it read them from.

        Prints a line.

        Args:
            pgn: The file.
        """

    sample = App(name="sample")
    sample.command(App(name="do")).command(run)
    stops = Stops(
        modules = (),
        stops   = (
            Stop(
                clears   = "Fix it",
                commands = ("do run",),
                message  = "Bad <x>",
                when     = "Bad"
            ),
            Stop(
                clears   = "No",
                commands = ("do other",),
                message  = "Other",
                when     = "Never"
            ),
            Stop(
                clears   = "Rerun",
                commands = ("do run",),
                message  = "Run `scotch do run`",
                when     = "Later"
            )
        )
    )

    assert Commands(app=sample, stops=stops).section("do", "run") == "\n".join(
        (
            "## `sample do run`",
            "",
            "Runs the sample command over every game the file holds, printing one line"
            " for each game it reads and naming the file it read them from.",
            "",
            "Prints a line.",
            "",
            "```text",
            "sample do run [OPTIONS] PGN [ARGS...]",
            "```",
            "",
            "| **Parameter** | **Accepts** | **Default** | **Meaning** |",
            "|---|---|---|---|",
            "| `PGN` | An existing file | Required | The file. |",
            "| `WORDS` | Any number of words | None | Each word. |",
            "| `--game` | An integer from 1 | None | The game. |",
            "| `--link`, `--no-link` | A flag | Off | Prints a link. |",
            "| `--name` | A word | `a` | A name. |",
            "| `--out` | A path | None | The file. |",
            "| `--quiet`, `--no-quiet` | A flag | On | Prints less. |",
            "| `--top` | An integer from 0 | `0` | The count. |",
            "",
            "It exits nonzero on each message below.",
            "",
            "| **Message** | **When** | **Clears It** |",
            "|---|---|---|",
            "| `Bad <x>` | Bad | Fix it |",
            "| `` Run `scotch do run` `` | Later | Rerun |"
        )
    )


def test_commands_lists_each_command_the_help_shows():
    """
    Asserts that the commands the page describes are the verb and noun of
    every command `scotch --help` lists, leaving out each hidden group.
    """
    assert list(commands(app)) == [
        ("cite", "source"),
        ("fetch", "games"),
        ("index", "games"),
        ("match", "game"),
        ("match", "games"),
        ("show", "game"),
        ("show", "position"),
        ("show", "store")
    ]
