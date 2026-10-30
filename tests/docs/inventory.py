"""
Pins the files `scotch render docs` writes, meaning the outputs `Outputs`
declares with and without an index, the commands whose help a page carries
and the help it carries for each, the figures the index measures, and the
Markdown files git tracks or would track, and that every declared output
renders into a fresh checkout and then reports no drift.
"""

from chess.svg       import PIECES
from collections.abc import Callable, Iterable
from common.app      import invoke
from common.games    import line
from json            import loads
from pathlib         import Path
from pytest          import CaptureFixture, MonkeyPatch, mark, param
from tomllib         import loads as from_toml

from scotch.cli              import app
from scotch.docs.census      import Census
from scotch.docs.inventory   import Outputs, commands, helped, tracked
from scotch.docs.outputs     import Document, Figures, Footnotes, Region
from scotch.docs.project     import Project
from scotch.docs.tallies     import Tally
from scotch.games.schemas    import Game, Origin
from scotch.identity.schemas import Identity
from scotch.index.tables     import PositionIndex
from scotch.sources.schemas  import Sources


def test_an_index_adds_the_files_written_from_it(
    checkout    : Callable[..., Path],
    index       : PositionIndex,
    monkeypatch : MonkeyPatch,
    tally       : Tally
):
    """
    Asserts that an index adds these files and nothing else, each rendering
    from the index and its census:

    - The examples, holding the front page's and the Methods page's alone
    - The store the Data pages, the store page, and the Viewer read
    - The Viewer's match beside the demo game alone
    - The example run the README and the Guide carry, naming the stored game
      the demo line meets
    - The tables the Data pages and the store page set beneath their
      widgets, each the one its region names
    - The measured figures of each Markdown file, each the count its marker
      names, an example's under the example's name and the figure's
    """
    monkeypatch.setattr(Census, "store", tally)
    pages = {
        "data/index.md": "<!-- decades -->\n<!-- /decades -->\n",

        "data/lengths.md": "<!-- lengths -->\n<!-- /lengths -->\n\n"
                           "<!-- outcomes -->\n<!-- /outcomes -->\n",

        "guide/index.md": (
            "<!-- example -->\n<!-- /example -->\n\n"
            "Holds <!-- games -->0<!-- /games --> games and"
            " <!-- undated -->?<!-- /undated --> undated.\n\n"
            "Shares <!-- demo-run -->0<!-- /demo-run --> positions.\n"
        ),

        "guide/store.md": "<!-- archives -->\n<!-- /archives -->\n"
    }
    readme   = Path(".github/README.md")
    root     = checkout(pages)
    measured = Outputs.measured(index, tracked(root), readme, root)

    assert [(type(output), str(output.path)) for output in measured] == [
        (Document, "docs/.vitepress/lib/rendered/examples.json"),
        (Document, "docs/.vitepress/lib/rendered/store.json"),
        (Document, "docs/.vitepress/lib/rendered/viewer.json"),
        (Region, ".github/README.md"),
        (Region, "docs/pages/guide/index.md"),
        (Region, "docs/pages/data/index.md"),
        (Region, "docs/pages/data/lengths.md"),
        (Region, "docs/pages/data/lengths.md"),
        (Region, "docs/pages/guide/store.md"),
        *((Figures, f"docs/pages/{page}") for page in pages)
    ]
    assert len(Outputs.shipped(app, readme, root, index).root) == (
        len(Outputs.shipped(app, readme, root).root) + len(measured)
    )

    for output in measured:
        if output.path != Path(".github/README.md"):
            output.write(root)

    text = {page: (root / "docs/pages" / page).read_text() for page in pages}

    assert loads((root / "docs/.vitepress/lib/rendered/store.json").read_text())[
        "files"
    ][0]["name"] == "Morphy"
    assert list(
        loads((root / "docs/.vitepress/lib/rendered/examples.json").read_text())
    ) == ["front", "methods"]

    viewer = loads((root / "docs/.vitepress/lib/rendered/viewer.json").read_text())

    assert (viewer["alone"]["span"], viewer["alone"]["stored"]) == (None, None)
    assert viewer["match"]["stored"]["headers"]["White"] == "Kasparov, Gary"
    assert [viewer[name]["submitted"]["moves"][0] for name in ("alone", "match")] == [
        "d4", "Nf3"
    ]
    assert text["guide/index.md"].startswith(
        "<!-- example -->\n```bash\nscotch match game"
        " docs/public/games/demo.pgn\n```\n\n```text\n"
        "Kasparov, Gary vs. Sosonko, Gennadi, Tilburg, 1981.??.??\n"
    )
    assert "Holds <!-- games -->10<!-- /games --> games and" in text["guide/index.md"]
    assert "<!-- undated -->0<!-- /undated --> undated." in text["guide/index.md"]
    assert "<!-- demo-run -->43<!-- /demo-run -->" in text["guide/index.md"]
    assert tally.decades in text["data/index.md"]
    assert text["data/lengths.md"].index(tally.lengths) < text["data/lengths.md"].index(
        tally.outcomes
    )
    assert tally.archives in text["guide/store.md"]


@mark.parametrize(
    ("played", "sentence"),
    [
        param(
            [("e4", {"Date": "2000.01.02", "Result": "1-0"})],
            "From the <!-- earliest -->2000s<!-- /earliest -->,"
            " <!-- tied --><!-- /tied --> tie.\n",
            id = "one-game"
        ),
        param(
            [
                ("e4", {"Result": "1-0"}),
                ("d4", {"Result": "0-1"}),
                ("c4", {"Result": "1/2-1/2"})
            ],
            "From the <!-- earliest --><!-- /earliest -->,"
            " <!-- tied -->100%<!-- /tied --> tie.\n",
            id = "no-dated-game"
        )
    ]
)
def test_an_index_too_small_for_a_figure_renders_every_file_written_from_it(
    checkout : Callable[..., Path],
    played   : list[tuple[str, dict[str, str]]],
    scanned  : Callable[[Iterable[Game]], PositionIndex],
    sentence : str
):
    """
    Asserts that an index of one game, which no other stored game meets
    and which ends in one result, and an index of no dated game each render
    every file written from them, leaving empty each figure the index holds
    no value for.
    """
    index = scanned(
        line(
            san,
            origin = Origin(address="https://example.com/Mine.zip", place=place),
            **tags
        )
        for place, (san, tags) in enumerate(played, start=1)
    )
    readme = Path(".github/README.md")
    root   = checkout(
        {
            "data/index.md": (
                "<!-- decades -->\n<!-- /decades -->\n\nFrom the"
                " <!-- earliest -->1740s<!-- /earliest -->,"
                " <!-- tied -->47%<!-- /tied --> tie.\n"
            ),

            "data/lengths.md": "<!-- lengths -->\n<!-- /lengths -->\n\n"
                               "<!-- outcomes -->\n<!-- /outcomes -->\n",

            "guide/index.md" : "<!-- example -->\n<!-- /example -->\n",
            "guide/store.md" : "<!-- archives -->\n<!-- /archives -->\n"
        }
    )

    for output in Outputs.measured(index, tracked(root), readme, root):
        if output.path != readme:
            output.write(root)

    assert (root / "docs/pages/data/index.md").read_text().endswith(sentence)


@mark.parametrize(
    "tokens",
    [param(tokens, id="-".join(tokens)) for tokens in commands(app)]
)
def test_helped_writes_the_help_the_command_prints(
    capsys      : CaptureFixture[str],
    monkeypatch : MonkeyPatch,
    tokens      : tuple[str, str]
):
    """
    Asserts that the help a page carries for a command is the help the
    command prints under `--help` at eighty columns, with each line's
    trailing spaces removed.
    """
    monkeypatch.setenv("COLUMNS", "80")
    invoke(*tokens, "--help")

    assert helped(app, *tokens) == "\n".join(
        line.rstrip() for line in (
            capsys.readouterr()
                  .out.strip()
                  .splitlines()
        )
    )


def test_commands_lists_each_command_the_help_shows():
    """
    Asserts that the commands a page carries the help of are the verb and
    noun of every command `scotch --help` lists, leaving out each hidden
    group.
    """
    assert list(commands(app)) == [
        ("cite", "source"),
        ("fetch", "games"),
        ("index", "games"),
        ("match", "game")
    ]


def test_every_declared_output_renders_and_then_holds_its_rendering(
    checkout: Callable[..., Path]
):
    """
    Asserts that each output declared without an index writes into a fresh
    checkout whose pages hold their markers, and that each then reports
    no drift, the pieces written in the order of their names, the favicon
    colored in Walnut on a light ground and Cashmere on a dark one, and the
    front page's tagline filled in from the identity.
    """
    root = checkout(
        {
            "data/index.md": (
                "Holds <!-- files -->0<!-- /files --> files.\n\n"
                "<!-- sources -->\n<!-- /sources -->\n"
            ),

            "guide/index.md" : "<!-- install -->\n<!-- /install -->\n",
            "guide/store.md" : "<!-- source -->\n<!-- /source -->\n",
            "index.md"       : "<!-- tagline --><!-- /tagline -->\n",

            "guide/commands.md": "".join(
                f"<!-- help-{verb}-{noun} -->\n<!-- /help-{verb}-{noun} -->\n\n"
                for verb, noun in commands(app)
            )
        }
    )
    outputs = Outputs.shipped(app, Path(".github/README.md"), root)

    for output in outputs:
        output.write(root)

    data  = (root / "docs/pages/data/index.md").read_text()
    front = (root / "docs/pages/index.md").read_text()
    help_ = (root / "docs/pages/guide/commands.md").read_text()
    store = (root / "docs/pages/guide/store.md").read_text()

    assert [*output.problems(root) for output in outputs] == []
    assert f"<!-- files -->{len(Sources.read().sources):,}<!-- /files -->" in data
    assert "|---|---|---|" in data
    assert front == f"<!-- tagline -->{Identity().tagline}<!-- /tagline -->\n"
    assert from_toml(store.split("```toml\n")[1].split("\n```")[0]) == {
        "sources": [Sources.read().sources[0].model_dump(mode="json")]
    }
    assert all(
        f"<!-- help-{verb}-{noun} -->\n```text\n{helped(app, verb, noun)}\n```" in help_
        for verb, noun in commands(app)
    )
    assert Project.installed().badges(Path(".github/README.md")) in (
        root / ".github/README.md"
    ).read_text()
    assert [
        (root / "docs/assets" / f"lockup-{name}.svg").read_text().count(hexed)
        for name, hexed in (("cashmere", "#e3c3a3"), ("walnut", "#764017"))
    ] == [1, 1]
    assert loads((root / "docs/.vitepress/lib/rendered/identity.json").read_text())[
        "tagline"
    ] == "Find the grandmaster game closest to yours."
    assert list(
        loads((root / "docs/.vitepress/lib/rendered/pieces.json").read_text())
    ) == sorted(PIECES)
    assert (root / "docs/public/favicon.svg").read_text() == (
        '<svg viewBox="0 0 1 1"><style>path{fill:#764017}'
        "@media (prefers-color-scheme:dark){path{fill:#e3c3a3}}</style>"
        '<path d="M0 0"/></svg>'
    )


def test_shipped_declares_the_files_written_from_declarations(
    checkout: Callable[..., Path]
):
    """
    Asserts that the outputs declared with no index are these, in
    this order:

    - The identity's and the pieces' JSON
    - The favicon and each lockup
    - The README's badges, then the install steps of the README and the
      Guide
    - The table of sources, then the row of sources the store page copies
    - The help of each command the help lists
    - The figures and the footnotes of each Markdown file
    """
    readme  = Path(".github/README.md")
    outputs = list(Outputs.shipped(app, readme, checkout({"page.md": ""})))

    assert [(type(output), str(output.path)) for output in outputs] == [
        (Document, "docs/.vitepress/lib/rendered/identity.json"),
        (Document, "docs/.vitepress/lib/rendered/pieces.json"),
        (Document, "docs/public/favicon.svg"),
        (Document, "docs/assets/lockup-cashmere.svg"),
        (Document, "docs/assets/lockup-walnut.svg"),
        (Region, ".github/README.md"),
        (Region, ".github/README.md"),
        (Region, "docs/pages/guide/index.md"),
        (Region, "docs/pages/data/index.md"),
        (Region, "docs/pages/guide/store.md"),
        *[(Region, "docs/pages/guide/commands.md")] * len(list(commands(app))),
        (Figures, "docs/pages/page.md"),
        (Footnotes, "docs/pages/page.md")
    ]


def test_tracked_lists_each_markdown_file_gitignore_leaves_in_with_no_repository(
    tmp_path: Path
):
    """
    Asserts that the Markdown files read under a folder no git repository
    holds, as in an export with no `.git`, are each one holding text that
    `.gitignore` leaves in, in path order, so an ignored folder and an empty
    file stay out.
    """
    for name, text in {
        ".cache/n.md" : "Cached.\n",
        ".gitignore"  : "/.cache/\n",
        "a/c.md"      : "C.\n",
        "b.md"        : "B.\n",
        "empty.md"    : "",
        "notes.txt"   : "Text.\n"
    }.items():
        (path := tmp_path / name).parent.mkdir(exist_ok=True, parents=True)
        path.write_text(text)

    assert tracked(tmp_path) == [Path("a/c.md"), Path("b.md")]
