"""
Holds `Reference`, the tables the Reference section's pages set beneath
their drawings, each written from what declares it, meaning `Settings`,
what `mise tasks` reports, the `Identity`, `Marks`, `Terms`, and what
python-chess ships, so a change to any of them reaches its page through the
next `scotch render docs`.
"""

from chess     import Board, COLOR_NAMES, Piece, parse_square, piece_name
from inspect   import getdoc
from itertools import groupby
from json      import loads
from operator  import attrgetter
from pathlib   import Path
from pydantic  import BaseModel
from pydantic_settings import (
    DotEnvSettingsSource,
    EnvSettingsSource,
    InitSettingsSource,
    PyprojectTomlConfigSettingsSource,
    SecretsSettingsSource
)
from typing    import ClassVar

from scotch.cli.settings     import Settings, root
from scotch.docs.marks       import Marks
from scotch.docs.tallies     import markdown
from scotch.docs.terms       import Terms
from scotch.identity.schemas import Color, Identity, Role
from scotch.repo.schemas     import Task


class Reference(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The declarations under `root` the Reference section's pages describe.
    """

    homes: ClassVar[dict[str, str]] = {
        "B" : "d4",
        "K" : "d4",
        "N" : "d4",
        "P" : "d2",
        "Q" : "d4",
        "R" : "d4",
        "b" : "d5",
        "k" : "d5",
        "n" : "d5",
        "p" : "d7",
        "q" : "d5",
        "r" : "d5"
    }
    """
    The square the pieces drawing first stands each piece on, by its symbol.
    """

    root: Path
    """
    The repository's root.
    """

    identity: Identity = Identity()
    """
    The identity the section's identity page draws.
    """

    @property
    def construction(self) -> str:
        """
        Writes the table of each length of the mark.
        """
        return Marks.read(self.root).lengths

    @property
    def faces(self) -> str:
        """
        Writes a table of each face, what it sets, and the package and the
        license it ships under, beside the version `docs/package.json` pins.
        """
        versions = loads((self.root / "docs/package.json").read_text(encoding="utf-8"))[
            "devDependencies"
        ]

        return markdown(
            headers = ("Slot", "Face", "Package", "License", "Sets"),
            right   = False,
            rows    = (
                (
                    f"`{slot}`",
                    face.family,
                    f"`{face.package}` {versions[face.package]}",
                    face.license,
                    self.identity.meanings["faces"][slot]
                )
                for slot, face in self.identity.faces
            )
        )

    @property
    def marks(self) -> str:
        """
        Writes the table of each place a mark stands.
        """
        return Marks.read(self.root).sizes

    @property
    def order(self) -> str:
        """
        Writes a numbered list of the sources `Settings` reads a setting
        from, in the order `settings_customise_sources` returns them, ending
        on the default every setting falls back to.
        """
        said = {
            EnvSettingsSource  : lambda source: f"The `{source.env_prefix}` variable",
            InitSettingsSource : lambda _:
                f"A keyword argument passed to `{Settings.__name__}`",
            PyprojectTomlConfigSettingsSource: lambda source: (
                f"The `[{'.'.join(source.toml_table_header)}]` table of the "
                f"project's `{source.toml_file_path.name}`"
            )
        }
        sources = Settings.settings_customise_sources(
            Settings,
            dotenv_settings      = DotEnvSettingsSource(Settings),
            env_settings         = EnvSettingsSource(Settings),
            file_secret_settings = SecretsSettingsSource(Settings),
            init_settings        = InitSettingsSource(Settings, {})
        )

        return "\n".join(
            f"{number}. {line}" for number, line in enumerate(
                (
                    *(said[type(source)](source) for source in sources),
                    "The default the table above lists"
                ),
                start = 1
            )
        )

    @property
    def origin(self) -> str:
        """
        Writes what a relative path is read against, naming the default of
        the `data` setting, above the summary the docstring of `root` gives,
        which closes on the marker citing PEP 610.
        """
        summary = " ".join(getdoc(root).split())

        return (
            "A relative path is read against the project's root, so the "
            f"default `{Settings.model_fields['data'].default}` lands under the "
            "clone `mise run` builds from, wherever a command runs inside it."
            f"\n\n`{root.__module__}.{root.__name__}` "
            f"{summary[0].lower()}{summary[1:]}[^bidoul2019]"
        )

    @property
    def palette(self) -> str:
        """
        Writes a table of each color, what it means, and the roles it takes,
        above a table of each color's contrast against each ground in both
        schemes.
        """
        palette = self.identity.palette
        grounds = [
            (role, scheme, palette.painted(getattr(entry, scheme)))
            for role, entry in self.identity.roles
            if entry.kind == "ground"
            for scheme in ("light", "dark")
        ]
        heads = [f"On `{role}`, {scheme.title()}" for role, scheme, _ in grounds]

        return "\n\n".join(
            (
                markdown(
                    headers = ("Color", "Token", "Hex", "Meaning", "Roles"),
                    right   = False,
                    rows    = (
                        (
                            color.name,
                            f"`{token}`",
                            f"`{color.hex}`",
                            self.identity.meanings["palette"][token],
                            self.played(token)
                        )
                        for token, color in palette
                    )
                ),
                markdown(
                    headers = ("Token", *heads),
                    rows    = (
                        (
                            f"`{token}`",
                            *(ratio(color, ground) for *_, ground in grounds)
                        )
                        for token, color in palette
                    )
                )
            )
        )

    @property
    def pieces(self) -> str:
        """
        Writes a table of the board's two squares and the set's license,
        above a table of what each piece reaches from the square the drawing
        stands it on, on an empty board.
        """
        palette = self.identity.palette

        return "\n\n".join(
            (
                markdown(
                    headers = ("Part", "Name", "Source", "Value"),
                    right   = False,
                    rows    = (
                        (
                            "Light square", palette.light.name, "Palette",
                            f"`{palette.light.hex}`"
                        ),
                        (
                            "Dark square", palette.primary.name, "Palette",
                            f"`{palette.primary.hex}`"
                        ),
                        (
                            "Pieces", "Colin M.L. Burnett's set",
                            "python-chess", "GFDL, BSD, GPL"
                        )
                    )
                ),
                markdown(
                    headers = ("Piece", "Symbol", "Square", "Squares Reached"),
                    rows    = (
                        (
                            named(piece),
                            f"`{piece.symbol()}`",
                            square,
                            f"{reach(piece, square)}"
                        )
                        for piece, square in (
                            (Piece.from_symbol(symbol), square)
                            for symbol, square in self.homes.items()
                        )
                    )
                )
            )
        )

    @property
    def roles(self) -> str:
        """
        Writes a table of each role, what it means, and the color it
        resolves to in each scheme, beside the paint behind that color and
        its contrast against the page.
        """
        palette = self.identity.palette
        roles   = self.identity.roles

        def worded(role: Role, scheme: str) -> str:
            """
            Writes one scheme's cell of `role`.
            """
            color = palette.painted(getattr(role, scheme))
            page  = palette.painted(getattr(roles.page, scheme))

            return f"`{color.hex}`, {role.worded(scheme)}, {ratio(color, page)}"

        return markdown(
            headers = ("Role", "Kind", "Meaning", "Light", "Dark"),
            right   = False,
            rows    = (
                (
                    f"`{name}`",
                    role.kind,
                    self.identity.meanings["roles"][name],
                    worded(role, "light"),
                    worded(role, "dark")
                )
                for name, role in roles
            )
        )

    @property
    def settings(self) -> str:
        """
        Writes a table of each setting, its `SCOTCH_` variable, its key
        under `[tool.scotch]`, its type, its default, and its meaning.
        """
        return markdown(
            headers = ("Variable", "Key", "Type", "Default", "Meaning"),
            right   = False,
            rows    = (
                (
                    f"`{Settings.model_config['env_prefix']}{name.upper()}`",
                    f"`{name}`",
                    kind(field),
                    f"`{field['default']}`",
                    " ".join(field["description"].split())
                )
                for name, field in Settings.model_json_schema()["properties"].items()
            )
        )

    @property
    def tasks(self) -> str:
        """
        Writes a heading and a table for each group of tasks `mise tasks`
        lists, each row holding the task, its alias, and its description.
        """
        return "\n\n".join(
            f"## `{group}`\n\n" + markdown(
                headers = ("Task", "Alias", "Description"),
                right   = False,
                rows    = (
                    (
                        f"`{task.name}`",
                        ", ".join(f"`{alias}`" for alias in task.aliases),
                        task.description.replace("|", r"\|")
                    )
                    for task in tasks
                )
            )
            for group, tasks in groupby(
                sorted(Task.listed(self.root), key=attrgetter("name")),
                key = lambda task: task.name.partition(":")[0]
            )
        )

    @property
    def terms(self) -> str:
        """
        Writes each term's heading above its sentence and its link.
        """
        return Terms.read().page

    def played(self, token: str) -> str:
        """
        Writes the roles the palette color `token` takes in either scheme,
        those that mix it with another color named after those that take it
        whole, or a sentence where it takes none, naming a chart's series
        where `token` is one.
        """
        taken  = [(name, *role.takes(token)) for name, role in self.identity.roles]
        whole  = [f"`{name}`" for name, pure, mix in taken if pure and not mix]
        mixed  = [f"`{name}`" for name, _, mix in taken if mix]
        series = token in self.identity.palette.series

        return ", ".join(
            (*whole, *((f"mixed in {', '.join(mixed)}",) if mixed else ()))
        ) or ("No role, a chart series" if series else "No role")


def kind(field: dict[str, object]) -> str:
    """
    Writes the type a setting's JSON schema `field` declares, with its
    bound.
    """
    match field:
        case {"format": "path"}: return "A path"
        case {"minimum": bound, "type": "integer"}: return f"An integer from {bound}"
        case {"exclusiveMinimum": bound, "type": "number"}:
            return f"A number above {bound}"
        case _: return f"{field['type']}"


def named(piece: Piece) -> str:
    """
    Writes the color and the name of `piece`.
    """
    return f"{COLOR_NAMES[piece.color].title()} {piece_name(piece.piece_type)}"


def ratio(color: Color, ground: Color) -> str:
    """
    Writes the contrast ratio of `color` against `ground`, to two decimals.
    """
    return f"{color.contrast(ground):.2f}:1"


def reach(piece: Piece, square: str) -> int:
    """
    Counts the squares `piece` reaches from `square` on an otherwise empty
    board.
    """
    board = Board(None)
    board.set_piece_at(parse_square(square), piece)
    board.turn = piece.color

    return board.pseudo_legal_moves.count()
