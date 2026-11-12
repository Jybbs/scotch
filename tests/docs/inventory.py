"""
Pins the files `scotch render docs` writes, meaning the outputs `Outputs`
declares with and without an index, the section and the example run the
commands page carries for each command, the figures the index measures, and
the Markdown files git tracks or would track, and that every declared output
renders into a fresh checkout and then reports no drift.
"""

from chess.svg        import PIECES
from collections.abc  import Callable, Iterable
from common.app       import invoke
from common.games     import line
from json             import loads
from pathlib          import Path
from pytest           import CaptureFixture, MonkeyPatch, mark, param
from syrupy.assertion import SnapshotAssertion
from tomllib          import loads as from_toml

from scotch.cli              import app
from scotch.cli.settings     import Settings
from scotch.docs.census      import Census
from scotch.docs.commands    import Commands, commands
from scotch.docs.inventory   import Outputs, tracked
from scotch.docs.outputs     import Document, Figures, Footnotes, Region
from scotch.docs.project     import Project
from scotch.docs.tallies     import Tally
from scotch.games.schemas    import Game, Origin
from scotch.identity.schemas import Identity
from scotch.index.tables     import PositionIndex
from scotch.sources.schemas  import Sources

RUNS = (
    "index-games", "match-game", "match-games",
    "show-game", "show-position", "show-store"
)
STUDIED = ("plies", *RUNS[1:])


def marked(*names: str) -> str:
    """
    Writes an empty region for each of `names`, as a page holds it before
    its first render.
    """
    return "".join(f"<!-- {name} -->\n<!-- /{name} -->\n\n" for name in names)


def test_an_index_adds_the_files_written_from_it(
    checkout    : Callable[..., Path],
    monkeypatch : MonkeyPatch,
    scanned     : Callable[[Iterable[Game]], PositionIndex],
    snapshot    : SnapshotAssertion,
    stored      : list[Game],
    tally       : Tally,
    tmp_path    : Path
):
    """
    Asserts that an index adds these files and nothing else, each rendering
    from the index and its census:

    - The examples, holding the front page's and the Methods page's alone
    - The files the Data page lists, each beside its games by decade
    - The store the Data pages, the store page, and the Viewer read
    - The Viewer's match beside the demo game alone
    - The example run the README and the Guide carry, naming the stored game
      the demo line meets
    - The tables the Data pages, the store page, and the identity page set
      beneath their widgets, each the one its region names
    - The demo game's match file
    - The example run of each command whose output the index sets, the
      commands page's
    - The demo's match, each line of its report beside what it holds, then
      the Guide's example runs of a match, one cut to its first plies, the
      walkthrough pages holding the text their snapshot holds
    - The measured figures of each Markdown file, each the count its marker
      names, an example's under the example's name and the figure's, the
      length of the demo's address, and the bytes the downloads and the
      index take
    """
    monkeypatch.setattr(Census, "store", tally)
    index = scanned(
        game.model_copy(
            update = {
                "origin": Origin(
                    address = "https://www.pgnmentor.com/players/Kasparov.zip",
                    place   = place
                )
            }
        )
        for place, game in enumerate(stored, start=1)
    )
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

        "guide/setup.md": (
            "Take <!-- downloads-size -->0 bytes<!-- /downloads-size --> and"
            " <!-- index-size -->0 bytes<!-- /index-size -->.\n"
        ),

        "guide/store.md"        : "<!-- archives -->\n<!-- /archives -->\n",
        "reference/commands.md" : marked(*(f"run-{run}" for run in RUNS)),
        "reference/identity.md" : "<!-- series -->\n<!-- /series -->\n",
        "reference/match.md"    : "Runs to <!-- link -->0<!-- /link --> characters.\n",
        **walked()
    }
    readme   = Path(".github/README.md")
    root     = checkout(pages)
    settings = Settings.model_construct(data=tmp_path / "data")

    (settings.downloads / "players").mkdir(parents=True)
    (settings.downloads / "players/Kasparov.zip").write_bytes(bytes(1_500))

    measured = Outputs.measured(index, tracked(root), readme, root, settings)

    assert [(type(output), str(output.path)) for output in measured] == [
        (Document, "docs/.vitepress/lib/rendered/examples.json"),
        (Document, "docs/public/matches/demo.json"),
        (Document, "docs/.vitepress/lib/rendered/files.json"),
        (Document, "docs/.vitepress/lib/rendered/store.json"),
        (Document, "docs/.vitepress/lib/rendered/viewer.json"),
        (Region, ".github/README.md"),
        (Region, "docs/pages/guide/index.md"),
        (Region, "docs/pages/data/index.md"),
        (Region, "docs/pages/data/lengths.md"),
        (Region, "docs/pages/data/lengths.md"),
        (Region, "docs/pages/guide/store.md"),
        (Region, "docs/pages/reference/identity.md"),
        *[(Region, "docs/pages/reference/commands.md")] * len(RUNS),
        (Region, "docs/pages/guide/matching.md"),
        *[(Region, "docs/pages/guide/studying.md")] * len(STUDIED),
        *((Figures, f"docs/pages/{page}") for page in sorted(pages))
    ]
    assert len(Outputs.shipped(app, readme, root, index, settings).root) == (
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
        "players/Kasparov.zip:1  Kasparov, Gary vs. Sosonko, Gennadi, Tilburg,"
        " 1981.??.??\n"
    )
    assert "Holds <!-- games -->10<!-- /games --> games and" in text["guide/index.md"]
    assert "<!-- undated -->0<!-- /undated --> undated." in text["guide/index.md"]
    assert "<!-- demo-run -->43<!-- /demo-run -->" in text["guide/index.md"]
    assert tally.decades in text["data/index.md"]
    assert text["data/lengths.md"].index(tally.lengths) < text["data/lengths.md"].index(
        tally.outcomes
    )
    assert tally.archives in text["guide/store.md"]
    assert loads((root / "docs/public/matches/demo.json").read_text())["stored"][
        "headers"
    ]["White"] == "Kasparov, Gary"
    assert "<!-- link -->1,766<!-- /link -->" in text["reference/match.md"]
    assert all(
        f"<!-- run-{run} -->\n```bash\nscotch {run.replace('-', ' ', 1)}"
        in text["reference/commands.md"]
        for run in RUNS
    )
    assert "Indexed 3 games into .cache/data/index\n" in text["reference/commands.md"]
    assert '\n[White "Kasparov, Gary"]\n' in text["reference/commands.md"]
    assert "The index holds 3 games and" in text["reference/commands.md"]
    assert "scotch show game players/Kasparov.zip:1\n" in text["reference/commands.md"]
    assert text["guide/matching.md"].startswith(
        "<!-- gloss -->\n1. `players/Kasparov.zip:1  Kasparov, Gary vs. Sosonko,"
        " Gennadi, Tilburg, 1981.??.??` names the stored game as its file and its"
        " place there"
    )
    assert [
        line.split(". ", 1)[0]
        for line in text["guide/matching.md"].split(
            "<!-- /gloss -->"
        )[0].splitlines()[1:]
    ] == [str(number) for number in range(1, len(Outputs.glosses) + 1)]
    assert all(
        text["reference/commands.md"].split(f"<!-- run-{run} -->")[1].split(
            f"<!-- /run-{run} -->"
        )[0] in text["guide/studying.md"]
        for run in RUNS[1:]
    )
    assert (
        f"scotch match game docs/public/games/demo.pgn --plies {Outputs.plies}\n"
        in text["guide/studying.md"]
    )
    assert "\n".join(
        text[page] for page in ("guide/matching.md", "guide/studying.md")
    ) == snapshot
    assert "<!-- downloads-size -->1.5 kB<!-- /downloads-size -->" in text[
        "guide/setup.md"
    ]
    assert "<!-- index-size -->0 bytes<!-- /index-size -->" in text["guide/setup.md"]


def test_every_declared_output_renders_and_then_holds_its_rendering(
    checkout : Callable[..., Path],
    snapshot : SnapshotAssertion
):
    """
    Asserts that each output declared without an index writes into a fresh
    checkout whose pages hold their markers, and that each then reports
    no drift, the pieces written in the order of their names, the favicon
    colored in Walnut on a light ground and Cashmere on a dark one, each
    lockup's wordmark and tagline filled in the colors their roles take in
    its scheme, the front page's tagline filled in from the identity, and
    the walkthrough pages holding the text their snapshot holds.
    """
    root = checkout(
        {
            "data/index.md": (
                "Holds <!-- files -->0<!-- /files --> files.\n\n"
                "<!-- sources -->\n<!-- /sources -->\n"
            ),

            "guide/index.md"    : "<!-- install -->\n<!-- /install -->\n",
            "guide/matching.md" : marked("refused"),
            "guide/setup.md"    : marked("steps", "checks", "stops"),
            "guide/store.md"    : "<!-- source -->\n<!-- /source -->\n",
            "index.md"          : "<!-- tagline --><!-- /tagline -->\n",

            "reference/identity.md": "".join(
                f"<!-- {name} -->\n<!-- /{name} -->\n\n"
                for name in (
                    "palette", "roles", "faces", "pieces", "marks", "construction"
                )
            ),

            "reference/settings.md": "".join(
                f"<!-- {name} -->\n<!-- /{name} -->\n\n"
                for name in ("settings", "order", "origin")
            ),

            "reference/tasks.md" : "<!-- tasks -->\n<!-- /tasks -->\n",
            "reference/terms.md" : "<!-- terms -->\n<!-- /terms -->\n",

            "reference/commands.md": marked(
                *(f"command-{verb}-{noun}" for verb, noun in commands(app)),
                "run-cite-source",
                "run-fetch-games"
            ),

            "reference/files.md": marked(
                "layout",
                "manifest",
                "columns",
                "sections",
                "warning"
            ),

            "reference/match.md": marked("export", "side", "span")
        }
    )
    outputs = Outputs.shipped(app, Path(".github/README.md"), root)

    for output in outputs:
        output.write(root)

    data  = (root / "docs/pages/data/index.md").read_text()
    front = (root / "docs/pages/index.md").read_text()
    pages = (root / "docs/pages/reference/commands.md").read_text()
    store = (root / "docs/pages/guide/store.md").read_text()

    assert [*output.problems(root) for output in outputs] == []
    assert f"<!-- files -->{len(Sources.read().sources):,}<!-- /files -->" in data
    assert "|---|---|---|" in data
    assert front == f"<!-- tagline -->{Identity().tagline}<!-- /tagline -->\n"
    assert "\n".join(
        (root / "docs/pages/guide" / page).read_text()
        for page in ("setup.md", "matching.md")
    ) == snapshot
    assert from_toml(store.split("```toml\n")[1].split("\n```")[0]) == {
        "floors"  : Sources.read().floors,
        "sources" : [Sources.read().sources[0].model_dump(
            exclude_none = True,
            mode         = "json"
        )]
    }
    assert all(
        f"<!-- command-{verb}-{noun} -->\n{Commands(app=app).section(verb, noun)}\n"
        in pages
        for verb, noun in commands(app)
    )
    assert "```text\n[^zobrist1970]: Zobrist, Albert L. 1970." in pages
    assert pages.count("Fetched https://www.pgnmentor.com/") == 4
    assert loads(
        (root / "docs/public/matches/alone.json").read_text()
    )["stored"] is None
    assert Project.installed().badges(Path(".github/README.md")) in (
        root / ".github/README.md"
    ).read_text()
    assert [
        (root / "docs/assets" / f"lockup-{scheme}.svg").read_text().count(hexed)
        for scheme, hexed in (
            ("dark", "#e3c3a3"),
            ("dark", "#a1a09e"),
            ("light", "#764017"),
            ("light", "#4f4e4e")
        )
    ] == [1, 1, 1, 1]
    assert loads((root / "docs/.vitepress/lib/rendered/identity.json").read_text())[
        "tagline"
    ] == "Find the grandmaster game closest to yours."
    assert list(
        loads((root / "docs/.vitepress/lib/rendered/pieces.json").read_text())
    ) == sorted(PIECES)
    assert (root / "docs/public/favicon.svg").read_text() == (
        '<svg viewBox="0 0 1 1"><style>path{fill:#764017}'
        "@media (prefers-color-scheme:dark){path{fill:#e3c3a3}}</style>"
        '<path d="M0 0M0 0M0 0M0 0M0 0"/></svg>'
    )


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

            "guide/index.md"        : "<!-- example -->\n<!-- /example -->\n",
            "guide/store.md"        : "<!-- archives -->\n<!-- /archives -->\n",
            "reference/commands.md" : marked(*(f"run-{run}" for run in RUNS)),
            "reference/identity.md" : "<!-- series -->\n<!-- /series -->\n",
            **walked()
        }
    )

    for output in Outputs.measured(
        index,
        tracked(root),
        readme,
        root,
        Settings.model_construct(data=root / ".cache/data")
    ):
        if output.path != readme:
            output.write(root)

    assert (root / "docs/pages/data/index.md").read_text().endswith(sentence)


@mark.parametrize(
    "argv",
    [
        param(("match", "game", str(Outputs.demo.path), "--top", "1"), id="match-game"),
        param(("match", "games", str(Outputs.demo.path)), id="match-games"),
        param(
            ("match", "game", str(Outputs.demo.path), "--plies", str(Outputs.plies)),
            id = "match-game-plies"
        ),
        param(("show", "game", "players/Kasparov.zip:1"), id="show-game"),
        param(
            ("show", "position", "1.", "Nf3", "Nf6", "2.", "c4", "--top", "1"),
            id = "show-position"
        )
    ]
)
def test_each_example_run_holds_what_its_command_prints(
    argv        : tuple[str, ...],
    capsys      : CaptureFixture[str],
    checkout    : Callable[..., Path],
    monkeypatch : MonkeyPatch,
    scanned     : Callable[[Iterable[Game]], PositionIndex],
    stored      : list[Game],
    tally       : Tally
):
    """
    Asserts that the output beneath each example run whose lines the index
    alone sets is what the command prints against that index.
    """
    monkeypatch.setattr(Census, "store", tally)
    monkeypatch.setattr(Outputs, "position", "1. Nf3 Nf6 2. c4")
    monkeypatch.setattr(Outputs, "top", 1)
    index = scanned(
        game.model_copy(
            update = {
                "origin": Origin(
                    address = "https://www.pgnmentor.com/players/Kasparov.zip",
                    place   = place
                )
            }
        )
        for place, game in enumerate(stored, start=1)
    )
    root = checkout(
        {"reference/commands.md": marked(*(f"run-{run}" for run in RUNS)), **walked()}
    )

    for output in Outputs.measured(
        index,
        tracked(root),
        Path(".github/README.md"),
        root,
        Settings.model_construct(data=root / ".cache/data")
    ):
        if output.path in {Outputs.commands, Outputs.guide / "studying.md"}:
            output.write(root)

    monkeypatch.chdir(root)
    monkeypatch.setattr(Settings, "opened", lambda _: index)
    invoke(*argv)
    pages = "".join(
        (root / page).read_text()
        for page in (Outputs.commands, Outputs.guide / "studying.md")
    )

    assert f"```text\n{capsys.readouterr().out}```" in pages


def test_shipped_declares_the_files_written_from_declarations(
    checkout: Callable[..., Path]
):
    """
    Asserts that the outputs declared with no index are these, in
    this order:

    - The identity's JSON, the home squares of the pieces, the keys of each
      game the site serves, the marks' JSON, the pieces' JSON, and the terms'
      JSON
    - The favicon and each lockup
    - The README's badges, then the install steps of the README and the
      Guide
    - The Guide's setup walkthrough, its install steps each beside what it
      does, the checks `mise doctor project` runs, and the ways fetching and
      indexing stop, then the games matching refuses
    - The table of sources, then the row of sources the store page copies
    - The Reference section's settings with their read order and root,
      tasks, identity tables, terms, data files, and match file
    - The section of each command the help lists, then the example runs of
      the commands whose output no index sets
    - The demo game's match file read with no index
    - The figures and the footnotes of each Markdown file
    """
    readme  = Path(".github/README.md")
    outputs = list(Outputs.shipped(app, readme, checkout({"page.md": ""})))

    assert [(type(output), str(output.path)) for output in outputs] == [
        (Document, "docs/.vitepress/lib/rendered/identity.json"),
        (Document, "docs/.vitepress/lib/rendered/homes.json"),
        (Document, "docs/.vitepress/lib/rendered/keys.json"),
        (Document, "docs/.vitepress/lib/rendered/marks.json"),
        (Document, "docs/.vitepress/lib/rendered/pieces.json"),
        (Document, "docs/.vitepress/lib/rendered/terms.json"),
        (Document, "docs/public/favicon.svg"),
        (Document, "docs/assets/lockup-dark.svg"),
        (Document, "docs/assets/lockup-light.svg"),
        (Region, ".github/README.md"),
        (Region, ".github/README.md"),
        (Region, "docs/pages/guide/index.md"),
        *[(Region, "docs/pages/guide/setup.md")] * 3,
        (Region, "docs/pages/guide/matching.md"),
        (Region, "docs/pages/data/index.md"),
        (Region, "docs/pages/guide/store.md"),
        *[(Region, "docs/pages/reference/settings.md")] * 3,
        (Region, "docs/pages/reference/tasks.md"),
        *[(Region, "docs/pages/reference/identity.md")] * 6,
        (Region, "docs/pages/reference/terms.md"),
        *[(Region, "docs/pages/reference/files.md")] * 5,
        *[(Region, "docs/pages/reference/match.md")] * 3,
        *[(Region, "docs/pages/reference/commands.md")] * (len(
            list(commands(app))
        ) + 2),
        (Document, "docs/public/matches/alone.json"),
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


def walked() -> dict[str, str]:
    """
    Writes the Guide's walkthroughs of a match as they stand before their
    first render, holding the regions the index sets.
    """
    return {
        "guide/matching.md" : marked("gloss"),
        "guide/studying.md" : marked(*(f"run-{run}" for run in STUDIED))
    }
