"""
Holds `Outputs`, every file `scotch render docs` writes, which the command
and the audit's `RenderCheck` both read, so the list is declared once.
"""

from chess.svg       import PIECES
from collections.abc import Iterable, Iterator
from cyclopts        import App
from functools       import cache, partial
from pathlib         import Path
from pydantic        import RootModel
from rich.filesize   import decimal
from subprocess      import run
from typing          import ClassVar, Self

from scotch.citations.schemas import References
from scotch.cli.settings      import Settings
from scotch.docs.census       import Census
from scotch.docs.commands     import Commands, commands
from scotch.docs.examples     import Example
from scotch.docs.marks        import Marks
from scotch.docs.outputs      import Document, Figures, Footnotes, Output, Region
from scotch.docs.project      import Project
from scotch.docs.reference    import Reference
from scotch.docs.stops        import Stops
from scotch.docs.tallies      import markdown, numbered
from scotch.docs.terms        import Terms
from scotch.games.schemas     import Game
from scotch.identity.schemas  import Identity
from scotch.index.schemas     import Holding, Pairing
from scotch.index.tables      import PositionIndex
from scotch.sources.schemas   import Sources


class Outputs(RootModel[list[Output]]):
    """
    The files `scotch render docs` writes, in the order it writes them.
    """

    commands : ClassVar[Path]            = Path("docs/pages/reference/commands.md")
    games    : ClassVar[Path]            = Path("docs/public/games")
    glosses  : ClassVar[tuple[str, ...]] = (
        "names the stored game as its file and its place there, then its players,"
        " its event, and its date",
        "counts the positions of the run the two games share, then the plies of"
        " each game the run spans",
        "sets out the last position of the run in Forsyth–Edwards Notation (FEN),"
        " and the move each game played from it, the stored game's being the"
        " parting move",
        "lists the stored game's moves from the parting move through its result",
        "counts the other stored games sharing a run as long as the match's"
    )
    guide    : ClassVar[Path] = Path("docs/pages/guide")
    matches  : ClassVar[Path] = Path("docs/public/matches")
    plies    : ClassVar[int]  = 4
    position : ClassVar[str]  = "1. d4 Nf6 2. c4 e6"
    rendered : ClassVar[Path] = Path("docs/.vitepress/lib/rendered")
    top      : ClassVar[int]  = 3

    demo: ClassVar[Example] = Example(path=games / "demo.pgn", shown=0)

    def __iter__(self) -> Iterator[Output]:
        """
        Reads the outputs in the order they are written.
        """
        return iter(self.root)

    @staticmethod
    def measured(
        index    : PositionIndex,
        pages    : Iterable[Path],
        readme   : Path,
        root     : Path,
        settings : Settings
    ) -> list[Output]:
        """
        Lists the files written from `index`, meaning the store the Data
        pages, the Guide's store page, the identity page, and the Viewer
        read, the examples the front page, the Methods page, and the link
        cards draw, the match the Viewer opens on beside the demo game
        alone, the demo's match file, the file list the Data page draws,
        each file `sources.toml` declares beside the games the store holds
        from it, the figures each Markdown file of `pages` sets inside
        its sentences, the example run the README and the Guide carry, the
        example runs the commands page and the Guide's walkthroughs set, the
        lines of the demo's match the Guide glosses, and the tables the Data
        pages, the Guide's store page, and the identity page set beneath
        their widgets, the disk the store takes under the data directory
        `settings` names among the figures.
        """
        census   = Census(index=index)
        viewer   = Example(path=Outputs.games / "viewer.pgn", shown=0)
        examples = {
            "demo": Outputs.demo,
            **{
                name: Example(path=Outputs.games / f"{name}.pgn", shown=18)
                for name in ("front", "methods")
            }
        }
        drawn = cache(
            lambda: {name: example.drawn(
                index,
                root
            ) for name, example in examples.items()}
        )
        demo    = cache(lambda: examples["demo"].exported(root, index))
        figures = cache(
            lambda: {
                **census.rules.figures,
                **census.store.figures,
                **{
                    f"{name}-{part}": value
                    for name, showing in drawn().items()
                    for part, value in showing.figures.items()
                },
                "downloads-size" : decimal(occupied(settings.downloads)),
                "index-size"     : decimal(occupied(settings.index)),
                "link"           : f"{len(demo().link):,}"
            }
        )
        submitted = cache(lambda: Outputs.demo.game(root))
        found     = cache(lambda: index.matches(submitted(), top=Outputs.top + 1))
        runs      = {
            "match-game"    : lambda: ran(
                f"scotch match game {Outputs.demo.path} --top {Outputs.top}",
                found()[0].report(),
                *(match.line for match in found()[1:])
            ),
            "match-games"   : lambda: ran(
                f"scotch match games {Outputs.demo.path}",
                Pairing(
                    file      = Outputs.demo.path.name,
                    match     = found()[0],
                    place     = 1,
                    submitted = submitted()
                ).line
            ),
            "show-game"     : lambda: ran(
                f"scotch show game {found()[0].game.origin.reference}",
                found()[0].game.pgn
            ),
            "show-position" : lambda: ran(
                f"scotch show position {Outputs.position} --top {Outputs.top}",
                index.answer(Outputs.position, Outputs.top).summary
            ),
            "show-store"    : lambda: ran(
                "scotch show store",
                "…",
                Holding(
                    fetched = (),
                    folder  = Settings.model_construct().index,
                    held    = (index.positions.games, index.positions.positions),
                    stale   = False
                ).summary
            )
        }

        return [
            Document.from_value(
                path  = Outputs.rendered / "examples.json",
                value = lambda: {
                    name: drawn()[name].model_dump(mode="json")
                    for name, example in examples.items()
                    if example.shown
                }
            ),
            Document(
                path   = Outputs.matches / "demo.json",
                render = lambda: demo().model_dump_json(indent=2) + "\n"
            ),
            Document.from_value(
                path  = Outputs.rendered / "files.json",
                value = lambda: [
                    listed.model_dump(mode="json")
                    for listed in census.store.listed(Sources.read().sources)
                ]
            ),
            Document.from_value(
                path  = Outputs.rendered / "store.json",
                value = lambda: census.store.model_dump(mode="json")
            ),
            Document.from_value(
                path  = Outputs.rendered / "viewer.json",
                value = lambda: {
                    "alone" : examples["demo"].exported(root).model_dump(mode="json"),
                    "match" : viewer.exported(root, index).model_dump(mode="json")
                }
            ),
            *(
                Region(
                    name   = "example",
                    path   = page,
                    render = lambda: (
                        f"```bash\nscotch match game {examples['demo'].path}\n```\n\n"
                        f"```text\n{drawn()['demo'].summary}\n```"
                    )
                )
                for page in (readme, Outputs.guide / "index.md")
            ),
            *(
                Region(
                    name   = name,
                    path   = Path(page),
                    render = lambda name=name: getattr(census.store, name)
                )
                for page, name in (
                    ("docs/pages/data/index.md", "decades"),
                    ("docs/pages/data/lengths.md", "lengths"),
                    ("docs/pages/data/lengths.md", "outcomes"),
                    ("docs/pages/guide/store.md", "archives"),
                    ("docs/pages/reference/identity.md", "series")
                )
            ),
            Region(
                name   = "run-index-games",
                path   = Outputs.commands,
                render = lambda: ran(
                    "scotch index games",
                    "…",
                    index.written(Settings.model_construct().index)
                )
            ),
            *(
                Region(name=f"run-{name}", path=Outputs.commands, render=render)
                for name, render in runs.items()
            ),
            Region(
                name   = "gloss",
                path   = Outputs.guide / "matching.md",
                render = lambda: numbered(
                    zip(
                        found()[0].report().splitlines(),
                        Outputs.glosses,
                        strict = True
                    )
                )
            ),
            Region(
                name   = "run-plies",
                path   = Outputs.guide / "studying.md",
                render = lambda: ran(
                    f"scotch match game {Outputs.demo.path} --plies {Outputs.plies}",
                    found()[0].report(Outputs.plies)
                )
            ),
            *(
                Region(
                    name   = f"run-{name}",
                    path   = Outputs.guide / "studying.md",
                    render = render
                )
                for name, render in runs.items()
            ),
            *(Figures(path=page, values=figures) for page in pages)
        ]

    @classmethod
    def shipped(
        cls,
        app      : App,
        readme   : Path,
        root     : Path,
        index    : PositionIndex | None = None,
        settings : Settings | None      = None
    ) -> Self:
        """
        Lists every file the repository's declarations and, where `index`
        is given, the index render into under `root`, ending on the figures
        and the footnotes of every Markdown file git tracks or would track,
        since a region a file holds may set a figure or cite a source.

        Args:
            app      : The command line the commands page describes.
            readme   : The README `[project].readme` names, relative to
                       `root`.
            root     : The repository's root.
            index    : The index the measured files read, or `None` to leave
                       them out.
            settings : The settings naming the data directory `index` was
                       read from, its defaults where none are given.
        """
        identity   = Identity()
        sources    = Sources.read()
        declared   = sources.figures | {"tagline": identity.tagline}
        pages      = tracked(root)
        project    = Project.installed()
        references = cache(partial(References.shipped, root))
        palette    = identity.palette
        reference  = Reference(identity=identity, root=root)
        described  = Commands(app=app)
        stops      = Stops.read()

        return cls(
            [
                Document.from_value(
                    path  = cls.rendered / "identity.json",
                    value = lambda: identity.model_dump(mode="json")
                ),
                Document.from_value(
                    path  = cls.rendered / "homes.json",
                    value = lambda: Reference.homes
                ),
                Document.from_value(
                    path  = cls.rendered / "keys.json",
                    value = lambda: {
                        pgn.stem: list(map(str, Game.first(pgn).keys))
                        for pgn in sorted((root / cls.games).glob("*.pgn"))
                    }
                ),
                Document.from_value(
                    path  = cls.rendered / "marks.json",
                    value = lambda: Marks.read(root).model_dump(mode="json")
                ),
                Document.from_value(
                    path  = cls.rendered / "pieces.json",
                    value = lambda: dict(sorted(PIECES.items()))
                ),
                Document.from_value(
                    path  = cls.rendered / "terms.json",
                    value = lambda: Terms.read().model_dump(mode="json")["terms"]
                ),
                Document(
                    path   = Path("docs/public/favicon.svg"),
                    render = lambda: palette.schemed(
                        (root / "docs/assets/mark.svg").read_text(encoding="utf-8")
                    )
                ),
                *(
                    Document(
                        path   = Path(f"docs/assets/lockup-{scheme}.svg"),
                        render = lambda scheme=scheme: identity.filled(
                            scheme,
                            (root / "docs/assets/lockup.svg").read_text(
                                encoding = "utf-8"
                            )
                        )
                    )
                    for scheme in ("dark", "light")
                ),
                Region(
                    name   = "badges",
                    path   = readme,
                    render = partial(project.badges, readme)
                ),
                *(
                    Region(name="install", path=page, render=lambda: project.install)
                    for page in (readme, cls.guide / "index.md")
                ),
                Region(
                    name   = "steps",
                    path   = cls.guide / "setup.md",
                    render = lambda: numbered(project.steps)
                ),
                Region(
                    name   = "checks",
                    path   = cls.guide / "setup.md",
                    render = lambda: reference.checks
                ),
                Region(
                    name   = "stops",
                    path   = cls.guide / "setup.md",
                    render = lambda: stops.steps(
                        (
                            ("fetch games", None),
                            ("index games", None),
                            ("match game", "<index>")
                        )
                    )
                ),
                Region(
                    name   = "refused",
                    path   = cls.guide / "matching.md",
                    render = lambda: stops.table("match game", naming="<pgn>")
                ),
                Region(
                    name   = "sources",
                    path   = Path("docs/pages/data/index.md"),
                    render = lambda: markdown(
                        headers = ("Provider", "Section", "File", "Name"),
                        right   = False,
                        rows    = (
                            (
                                f"[{source.provider}]({source.home})",
                                source.section,
                                f"[`{source.file}`]({source.address})",
                                source.title
                            )
                            for source in sources.sources
                        )
                    )
                ),
                Region(
                    name   = "source",
                    path   = Path("docs/pages/guide/store.md"),
                    render = lambda: "\n".join(
                        (
                            "```toml",
                            "\n\n".join(Sources.text().split("\n\n", 2)[:2]),
                            "```"
                        )
                    )
                ),
                *(
                    Region(
                        name   = name,
                        path   = Path("docs/pages/reference") / page,
                        render = lambda name=name: getattr(reference, name)
                    )
                    for page, name in (
                        ("settings.md", "settings"),
                        ("settings.md", "order"),
                        ("settings.md", "origin"),
                        ("tasks.md", "tasks"),
                        ("identity.md", "palette"),
                        ("identity.md", "roles"),
                        ("identity.md", "faces"),
                        ("identity.md", "pieces"),
                        ("identity.md", "marks"),
                        ("identity.md", "construction"),
                        ("terms.md", "terms"),
                        ("files.md", "layout"),
                        ("files.md", "manifest"),
                        ("files.md", "columns"),
                        ("files.md", "sections"),
                        ("files.md", "warning"),
                        ("match.md", "export"),
                        ("match.md", "side"),
                        ("match.md", "span")
                    )
                ),
                *(
                    Region(
                        name   = f"command-{verb}-{noun}",
                        path   = cls.commands,
                        render = partial(described.section, verb, noun)
                    )
                    for verb, noun in commands(app)
                ),
                Region(
                    name   = "run-cite-source",
                    path   = cls.commands,
                    render = lambda: ran(
                        "scotch cite source zobrist1970",
                        references().cite("zobrist1970")
                    )
                ),
                Region(
                    name   = "run-fetch-games",
                    path   = cls.commands,
                    render = lambda: ran(
                        "scotch fetch games",
                        *(
                            f"Fetched {source.address}"
                            for source in sources.sources[:3]
                        ),
                        "…",
                        f"Fetched {sources.sources[-1].address}"
                    )
                ),
                Document(
                    path   = cls.matches / "alone.json",
                    render = lambda: cls.demo.exported(root).model_dump_json(indent=2)
                    + "\n"
                ),
                *(
                    cls.measured(
                        index,
                        pages,
                        readme,
                        root,
                        settings or Settings.model_construct()
                    )
                    if index
                    else []
                ),
                *(
                    *(
                        Figures(path=page, values=lambda: declared),
                        Footnotes(path=page, references=references)
                    )
                    for page in pages
                )
            ]
        )


def occupied(folder: Path) -> int:
    """
    Counts the bytes the files under `folder` take, or 0 where it holds
    none.
    """
    return sum(path.stat().st_size for path in folder.rglob("*") if path.is_file())


def ran(command: str, *lines: str) -> str:
    """
    Writes `command` above the `lines` it prints, each in a block of its
    own.
    """
    return f"```bash\n{command}\n```\n\n```text\n{'\n'.join(lines)}\n```"


def tracked(root: Path) -> list[Path]:
    """
    Lists each Markdown file under `root` holding text, leaving out each
    file `.gitignore` names, through `git grep --no-index`, which reads the
    ignore files with or without a repository, so an export with no `.git`
    lists the pages a checkout does. An empty file holds no marker, so
    leaving it out changes nothing written.
    """
    listing = run(
        [
            "git", "grep", "--no-index", "--exclude-standard", "-l",
            "-z", "-e", "", "--", "*.md"
        ],
        capture_output = True,
        check          = True,
        cwd            = root,
        text           = True
    )

    return sorted(Path(name) for name in listing.stdout.split("\0") if name)
