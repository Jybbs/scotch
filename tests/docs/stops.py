"""
Pins `Stops`, meaning the shape `StopCheck` reads each message in, the table
each command takes, and the registry the package ships, which covers the
module of every command the help lists and names no other command, and the
tables a command's messages and the steps of several commands take.
"""

from inspect import getmodule
from pytest  import mark, param

from scotch.cli           import app
from scotch.docs.commands import commands
from scotch.docs.stops    import Stop, Stops


@mark.parametrize(
    ("message", "template"),
    [
        param("Found no game in <pgn>", "Found no game in {}", id="one-part"),
        param("Found no game <n> in <pgn>", "Found no game {} in {}", id="two-parts"),
        param("names no move: '<word>'", "names no move: '{}'", id="quoted"),
        param("Found problems in <pgn>:", "Found problems in {}:", id="closing-colon")
    ]
)
def test_a_stop_writes_each_part_a_run_fills_in_as_braces(message: str, template: str):
    """
    Asserts that each name between `<` and `>` reads as `{}`, the rest of
    the message kept as it stands.
    """
    assert Stop(
        clears   = "",
        commands = (),
        message  = message,
        when     = ""
    ).template == template


def test_a_command_exiting_on_no_message_takes_no_table():
    """
    Asserts that the table of a command no stop names is empty, and that a
    message holding a backtick sits between doubled backticks.
    """
    stops = Stops(
        modules = (),
        stops   = (
            Stop(
                clears   = "Run it",
                commands = ("a b",),
                message  = "Run `x`",
                when     = "Late"
            ),
        )
    )

    assert (stops.table("a b"), stops.table("c d")) == (
        "| **Message** | **When** | **Clears It** |\n|---|---|---|\n"
        "| `` Run `x` `` | Late | Run it |",
        ""
    )


def test_a_table_holding_a_name_keeps_the_messages_naming_it():
    """
    Asserts that a table given a name keeps only the messages of its command
    that hold the name.
    """
    stops = Stops(
        modules = (),
        stops   = tuple(
            Stop(
                clears   = "Fix it",
                commands = ("a b",),
                message  = message,
                when     = "Then"
            )
            for message in ("Bad <pgn>", "No index under <index>")
        )
    )

    assert stops.table("a b", naming="<pgn>") == (
        "| **Message** | **When** | **Clears It** |\n|---|---|---|\n"
        "| `Bad <pgn>` | Then | Fix it |"
    )


def test_the_registry_covers_each_command_the_help_lists():
    """
    Asserts that the registry the package ships names the module of every
    command the help lists among its files, and that each of its messages
    names only such commands.
    """
    stops  = Stops.read()
    listed = {f"{verb} {noun}" for verb, noun in commands(app)}

    assert {
        "src/" + getmodule(app[verb][noun].default_command).__name__.replace(".", "/")
        + ".py"
        for verb, noun in commands(app)
    } <= set(stops.modules)
    assert {command for stop in stops.stops for command in stop.commands} <= listed


def test_the_steps_table_names_each_command_in_the_order_given():
    """
    Asserts that the table of several commands lists each command's messages
    in the order the commands are given, each beside its command linked to
    its section of the commands page, and leaves out the messages of every
    other command.
    """
    stops = Stops(
        modules = (),
        stops   = (
            Stop(
                clears   = "One",
                commands = ("a b",),
                message  = "First",
                when     = "Early"
            ),
            Stop(
                clears   = "Two",
                commands = ("c d",),
                message  = "Second",
                when     = "Late"
            ),
            Stop(
                clears   = "Three",
                commands = ("e f",),
                message  = "Third",
                when     = "Never"
            )
        )
    )

    assert stops.steps(("c d", "a b")).splitlines() == [
        "| **Command** | **Message** | **When** | **Clears It** |",
        "|---|---|---|---|",
        "| [`scotch c d`](../reference/commands.md#scotch-c-d) | `Second` | Late"
        " | Two |",
        "| [`scotch a b`](../reference/commands.md#scotch-a-b) | `First` | Early"
        " | One |"
    ]
