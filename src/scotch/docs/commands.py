"""
Holds `Commands`, the sections the commands page sets for each command the
help of the `scotch` app lists, each written from what the command line
declares, meaning the command's docstring, its usage, the type, the bound,
the default, and the help of each parameter, and the messages `Stops` names
for it, so a change to any of them reaches the page through the next `scotch
render docs`.
"""

from collections.abc   import Iterator
from cyclopts          import App, validators
from cyclopts.argument import Argument
from cyclopts.help     import format_usage
from functools         import reduce
from inspect           import Parameter, getdoc
from operator          import getitem
from pydantic          import BaseModel, Field, InstanceOf
from types             import NoneType
from typing            import get_args

from scotch.docs.stops   import Stops
from scotch.docs.tallies import markdown


class Commands(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The commands of `app` the commands page describes.
    """

    app: InstanceOf[App]
    """
    The command line the page describes.
    """

    stops: Stops = Field(default_factory=Stops.read)
    """
    The messages each command exits nonzero on.
    """

    def section(self, *tokens: str) -> str:
        """
        Writes the section of the command its verb and its noun in `tokens`
        name, meaning its heading, each paragraph of its docstring above
        the `Args` block with its lines joined, its usage, a table of its
        parameters, and a table of the messages it exits nonzero on.
        """
        command    = reduce(getitem, tokens, self.app)
        paragraphs = [
            " ".join(paragraph.split())
            for paragraph in getdoc(command.default_command).split("\n\n")
            if not paragraph.startswith("Args:")
        ]
        with self.app.app_stack(list(tokens)):
            arguments = command.assemble_argument_collection(parse_docstring=True)
        stops = self.stops.table(" ".join(tokens))
        usage = format_usage(self.app, list(tokens)).plain.strip()

        return "\n\n".join(
            filter(
                None,
                (
                    f"## `{' '.join((*self.app.name, *tokens))}`",
                    *paragraphs,
                    f"```text\n{usage}\n```",
                    markdown(
                        headers = ("Parameter", "Accepts", "Default", "Meaning"),
                        right   = False,
                        rows    = (
                            (
                                spelled(argument),
                                accepted(argument),
                                fallback(argument),
                                argument.parameter.help
                            )
                            for argument in arguments
                        )
                    ) if arguments else "",
                    stops and f"It exits nonzero on each message below.\n\n{stops}"
                )
            )
        )


def accepted(argument: Argument) -> str:
    """
    Writes what `argument` accepts, from its type and the bound its
    validator sets.
    """
    hint = next(
        kind for kind in (*get_args(argument.hint), argument.hint)
        if kind is not NoneType
    )
    bounds = [
        check for check in argument.parameter.validator
        if isinstance(check, validators.Number)
    ]

    match hint, bounds, argument.field_info.kind:
        case _, _, Parameter.VAR_POSITIONAL:
            return "One or more words" if argument.required else "Any number of words"
        case _ if hint is bool: return "A flag"
        case _, [bound], _:
            return f"An integer from {bound.gte if bound.gt is None else bound.gt + 1}"
        case _ if any(
            isinstance(check, validators.Path) and check.exists
            for check in argument.parameter.validator
        ):
            return "An existing file"
        case _ if hint is str : return "A word"
        case _                : return "A path"


def commands(app: App) -> Iterator[tuple[str, str]]:
    """
    Yields the verb and the noun of each command the help of `app` lists,
    leaving out each group it hides.
    """
    for verb in app:
        if not verb.startswith("-") and app[verb].show:
            yield from ((verb, noun) for noun in app[verb] if not noun.startswith("-"))


def fallback(argument: Argument) -> str:
    """
    Writes the default of `argument`, or that a run must pass it.
    """
    default = argument.field_info.default

    match default:
        case _ if argument.required : return "Required"
        case Parameter.empty | None : return "None"
        case bool()                 : return "On" if default else "Off"
        case _: return f"`{default}`"


def spelled(argument: Argument) -> str:
    """
    Writes the name of `argument` as the help lists it, a positional one in
    capitals and an option under each name it answers to.
    """
    if argument.field_info.kind is Parameter.KEYWORD_ONLY:
        return ", ".join(f"`{name}`" for name in argument.names)

    return f"`{argument.field_info.name.upper()}`"
