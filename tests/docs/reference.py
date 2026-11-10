"""
Pins `Reference`, meaning the table of each setting, of each task under
its group, of each color and role with its contrast, of each face with its
package, and of each piece with its reach.
"""

from chess   import Piece
from json    import dumps
from pathlib import Path
from pytest  import MonkeyPatch, fixture, mark, param
from pytest_subprocess.fake_process import FakeProcess

from scotch.cli.settings     import Settings
from scotch.docs.reference   import Reference, kind, reach
from scotch.identity.schemas import Identity


@fixture
def reference(tmp_path: Path) -> Reference:
    """
    Builds the reference of a checkout under `tmp_path` pinning each face's
    package at one version.
    """
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs/package.json").write_text(
        dumps(
            {
                "devDependencies": {
                    face.package: "^1.2.3" for _, face in Identity().faces
                }
            }
        )
    )

    return Reference(root=tmp_path)


@mark.parametrize(
    ("field", "worded"),
    [
        param({"format": "path", "type": "string"}, "A path", id="path"),
        param(
            {"minimum": 1, "type": "integer"},
            "An integer from 1",
            id = "bounded-integer"
        ),
        param(
            {"exclusiveMinimum": 0, "type": "number"},
            "A number above 0",
            id = "bounded-number"
        ),
        param({"type": "boolean"}, "boolean", id="otherwise")
    ]
)
def test_kind_writes_the_type_a_setting_declares(field: dict[str, object], worded: str):
    """
    Asserts that a setting's type reads as its schema declares it, with any
    bound it holds.
    """
    assert kind(field) == worded


@mark.parametrize(
    ("symbol", "square", "squares"),
    [
        param("Q", "d4", 27, id="queen"),
        param("R", "d4", 14, id="rook"),
        param("B", "d4", 13, id="bishop"),
        param("N", "d4", 8, id="knight"),
        param("K", "d4", 8, id="king"),
        param("P", "d2", 2, id="pawn-at-home"),
        param("p", "d7", 2, id="black-pawn-at-home")
    ]
)
def test_reach_counts_the_squares_a_piece_moves_to_on_an_empty_board(
    symbol  : str,
    square  : str,
    squares : int
):
    """
    Asserts the count of squares each kind of piece reaches, a pawn's double
    step from its home rank among them.
    """
    assert reach(Piece.from_symbol(symbol), square) == squares


def test_played_names_a_mix_after_the_roles_taking_a_color_whole(reference: Reference):
    """
    Asserts that the roles taking a color in a mix are named apart from
    those taking it whole.
    """
    assert "mixed in `alert`" in reference.played("critical")
    assert reference.played("primary").startswith("`run`")
    assert (
        reference.played("dark")
                 .startswith("`front_hollow`, `ink`, `page`, mixed in")
    )


@mark.parametrize(
    ("token", "worded"),
    [
        param("series_6", "No role, a chart series", id="series"),
        param("warning", "No role", id="state")
    ]
)
def test_played_names_a_chart_series_only_for_a_series_color(
    reference : Reference,
    token     : str,
    worded    : str
):
    """
    Asserts that a color no role takes reads as a chart's series only where
    the palette counts it among its series.
    """
    assert reference.played(token) == worded


def test_the_faces_table_reads_each_faces_version_from_the_manifest(
    reference: Reference
):
    """
    Asserts that a face's row holds its slot, its family, its package at the
    version the manifest pins, and its license.
    """
    assert (
        "| `body` | Petrona | `@fontsource-variable/petrona` ^1.2.3"
        " | SIL Open Font License 1.1 |"
    ) in reference.faces


def test_the_palette_tables_hold_each_color_and_its_contrast(reference: Reference):
    """
    Asserts that the first table names the roles a color takes, a color no
    role takes reading as a chart's alone, and that the second states each
    color against each ground in each scheme, to two decimals.
    """
    described, contrasts = reference.palette.split("\n\n")
    identity             = Identity()
    palette              = identity.palette
    grounds              = [
        palette.painted(getattr(role, scheme))
        for _, role in identity.roles
        if role.kind == "ground"
        for scheme in ("light", "dark")
    ]
    light, dark = (
        palette.painted(identity.roles.page.light),
        palette.painted(identity.roles.page.dark)
    )
    ratios = " | ".join(
        f"{palette.primary.contrast(ground):.2f}:1" for ground in grounds
    )

    assert "No role, a chart series" in described
    assert "| **Token** | **On `page`, Light** | **On `page`, Dark** |" in contrasts
    assert f"| `primary` | {ratios} |" in contrasts
    assert (
        f"| `primary` | {palette.primary.contrast(light):.2f}:1"
        f" | {palette.primary.contrast(dark):.2f}:1 |"
    ) in contrasts


def test_the_pieces_tables_hold_the_board_the_license_and_each_reach(
    reference: Reference
):
    """
    Asserts that the first table holds each square's color and the set's
    license from python-chess, and the second a row per piece stating its
    reach.
    """
    assert "| Pieces | Colin M.L. Burnett's set | python-chess | GFDL, BSD, GPL |" in (
        reference.pieces
    )
    assert "| White queen | `Q` | d4 | 27 |" in reference.pieces
    assert "| Black pawn | `p` | d7 | 2 |" in reference.pieces


def test_the_read_order_and_the_root_follow_a_change_to_the_settings(
    monkeypatch : MonkeyPatch,
    reference   : Reference
):
    """
    Asserts that the prefix, the table, and the default of `data` reach both
    sections from `Settings` rather than from a copy of them.
    """
    monkeypatch.setattr(Settings.model_fields["data"], "default", Path("games"))
    monkeypatch.setitem(Settings.model_config, "env_prefix", "CHESS_")
    monkeypatch.setitem(
        Settings.model_config,
        "pyproject_toml_table_header",
        ("tool", "chess")
    )

    assert reference.order.splitlines()[1:3] == [
        "2. The `CHESS_` variable",
        "3. The `[tool.chess]` table of the project's `pyproject.toml`"
    ]
    assert "the default `games` lands under the clone" in reference.origin


def test_the_read_order_follows_a_change_to_the_sources(
    monkeypatch : MonkeyPatch,
    reference   : Reference
):
    """
    Asserts that a reordered or narrowed tuple of sources reaches the list,
    so the page drifts from the code only where the render is not rerun.
    """
    monkeypatch.setattr(
        Settings,
        "settings_customise_sources",
        classmethod(
            lambda _, settings_cls, **sources: (
                sources["env_settings"],
                sources["init_settings"]
            )
        )
    )

    assert reference.order.splitlines() == [
        "1. The `SCOTCH_` variable", "2. A keyword argument passed to `Settings`",
        "3. The default the table above lists"
    ]


def test_the_read_order_lists_the_sources_in_the_order_settings_reads_them(
    reference: Reference
):
    """
    Asserts that the read order numbers each source in the order
    `settings_customise_sources` returns it, ending on the default.
    """
    assert reference.order.splitlines() == [
        "1. A keyword argument passed to `Settings`", "2. The `SCOTCH_` variable",
        "3. The `[tool.scotch]` table of the project's `pyproject.toml`",
        "4. The default the table above lists"
    ]


def test_the_roles_table_writes_each_schemes_hex_paint_and_contrast(
    reference: Reference
):
    """
    Asserts that each role's row holds its kind, and in each scheme the
    color it resolves to, the paint behind it, and its contrast against that
    scheme's page.
    """
    identity = Identity()
    color    = identity.palette.painted(identity.roles.run.light)
    page     = identity.palette.painted(identity.roles.page.light)

    assert f"`{color.hex}`, primary, {color.contrast(page):.2f}:1" in reference.roles
    assert reference.roles.count("\n") == 1 + len(type(identity.roles).model_fields)


def test_the_root_follows_a_change_to_what_root_reads(
    monkeypatch : MonkeyPatch,
    reference   : Reference
):
    """
    Asserts that the root section is written from the summary `root` carries
    at render time rather than from a copy of it.
    """

    def root() -> Path:
        """
        Reads the working directory alone.
        """
        return Path.cwd()

    monkeypatch.setattr("scotch.docs.reference.root", root)

    assert reference.origin.endswith(
        f"`{__name__}.root` reads the working directory alone.[^bidoul2019]"
    )


def test_the_root_names_the_default_and_what_root_reads(reference: Reference):
    """
    Asserts that the root section names the default of the `data` setting
    and opens its second paragraph on `root` and the summary of its
    docstring, closing on the marker citing PEP 610.
    """
    rested, summed = reference.origin.split("\n\n")

    assert "the default `.cache/data` lands under the clone" in rested
    assert summed == (
        "`scotch.cli.settings.root` reads the directory the `scotch` distribution "
        "was installed from, which an installer records in the `direct_url.json` "
        "PEP 610 specifies, or the working directory where it recorded none."
        "[^bidoul2019]"
    )


def test_the_settings_table_writes_a_row_per_field(reference: Reference):
    """
    Asserts that the table holds a row for each field `Settings` declares,
    under its `SCOTCH_` variable, its key, and its default.
    """
    rows = reference.settings.splitlines()

    assert rows[0] == (
        "| **Variable** | **Key** | **Type** | **Default** | **Meaning** |"
    )
    assert len(rows) == 2 + len(Settings.model_fields)
    assert all(
        f"`SCOTCH_{name.upper()}` | `{name}`" in reference.settings
        for name in Settings.model_fields
    )


def test_the_tasks_table_sets_each_group_under_its_heading(
    fp        : FakeProcess,
    reference : Reference
):
    """
    Asserts that the tasks `mise tasks` lists sort under a heading for each
    group, each row holding the task's aliases and its description, a pipe
    in which is escaped so it stays inside its cell.
    """
    fp.register(
        ["mise", "tasks", "ls", "--json", "--local"],
        stdout = dumps(
            [
                {
                    "description" : "Tests.",
                    "file"        : None,
                    "name"        : "py:test",
                    "aliases"     : [],
                    "depends"     : []
                },
                {
                    "description" : "A | B.",
                    "file"        : None,
                    "name"        : "repo:ci",
                    "aliases"     : ["ci"],
                    "depends"     : []
                },
                {
                    "description" : "Checks.",
                    "file"        : None,
                    "name"        : "py:check",
                    "aliases"     : ["a", "b"],
                    "depends"     : []
                }
            ]
        )
    )

    assert reference.tasks == "\n".join(
        (
            "## `py`", "",
            "| **Task** | **Alias** | **Description** |", "|---|---|---|",
            "| `py:check` | `a`, `b` | Checks. |", "| `py:test` |  | Tests. |",
            "", "## `repo`",
            "", "| **Task** | **Alias** | **Description** |",
            "|---|---|---|", r"| `repo:ci` | `ci` | A \| B. |"
        )
    )
