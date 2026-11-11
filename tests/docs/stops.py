"""
Pins `Stops`, meaning the shape `StopCheck` reads each message in, the table
each command takes, and the registry the package ships, which covers the
module of every command the help lists and names no other command.
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
