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
from rich.console    import Console
from subprocess      import run
from typing          import ClassVar, Self

from scotch.citations.schemas import References
from scotch.docs.census       import Census
from scotch.docs.examples     import Example
from scotch.docs.outputs      import Document, Figures, Footnotes, Output, Region
from scotch.docs.project      import Project
from scotch.docs.tallies      import markdown
from scotch.identity.schemas  import Identity
from scotch.index.tables      import PositionIndex
from scotch.sources.schemas   import Sources


class Outputs(RootModel[list[Output]]):
    """
    The files `scotch render docs` writes, in the order it writes them.
    """

    rendered: ClassVar[Path] = Path("docs/.vitepress/lib/rendered")

    def __iter__(self) -> Iterator[Output]:
        """
        Reads the outputs in the order they are written.
        """
        return iter(self.root)

    @staticmethod
    def measured(
        index  : PositionIndex,
        pages  : Iterable[Path],
        readme : Path,
        root   : Path
    ) -> list[Output]:
        """
        Lists the files written from `index`, meaning the store the Data
        pages, the Guide's store page, and the Viewer read, the examples
        the front page, the Methods page, and the link cards draw, the match
        the Viewer opens on beside the demo game alone, the figures each
        Markdown file of `pages` sets inside its sentences, the example run
        the README and the Guide carry, and the tables the Data pages and
        the Guide's store page set beneath their widgets.
        """
        census   = Census(index=index)
        games    = Path("docs/public/games")
        viewer   = Example(path=games / "viewer.pgn", shown=0)
        examples = {
            name: Example(path=games / f"{name}.pgn", shown=shown)
            for name, shown in (("demo", 0), ("front", 18), ("methods", 18))
        }
        drawn = cache(
            lambda: {name: example.drawn(
                index,
                root
            ) for name, example in examples.items()}
        )
        figures = cache(
            lambda: {
                **census.rules.figures,
                **census.store.figures,
                **{
                    f"{name}-{part}": value
                    for name, showing in drawn().items()
                    for part, value in showing.figures.items()
                }
            }
        )

        return [
            Document.from_value(
                path  = Outputs.rendered / "examples.json",
                value = lambda: {
                    name: drawn()[name].model_dump(mode="json")
                    for name, example in examples.items()
                    if example.shown
                }
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
                for page in (readme, Path("docs/pages/guide/index.md"))
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
                    ("docs/pages/guide/store.md", "archives")
                )
            ),
            *(Figures(path=page, values=figures) for page in pages)
        ]

    @classmethod
    def shipped(
        cls,
        app    : App,
        readme : Path,
        root   : Path,
        index  : PositionIndex | None = None
    ) -> Self:
        """
        Lists every file the repository's declarations and, where `index`
        is given, the index render into under `root`, ending on the figures
        and the footnotes of every Markdown file git tracks or would track,
        since a region a file holds may set a figure or cite a source.

        Args:
            app    : The command line whose help the Guide carries.
            readme : The README `[project].readme` names, relative to
                     `root`.
            root   : The repository's root.
            index  : The index the measured files read, or `None` to leave
                     them out.
        """
        identity   = Identity()
        sources    = Sources.read()
        declared   = {"files": f"{len(sources.sources):,}", "tagline": identity.tagline}
        pages      = tracked(root)
        project    = Project.installed()
        references = cache(partial(References.shipped, root))
        palette    = identity.palette

        return cls(
            [
                Document.from_value(
                    path  = cls.rendered / "identity.json",
                    value = lambda: identity.model_dump(mode="json")
                ),
                Document.from_value(
                    path  = cls.rendered / "pieces.json",
                    value = lambda: dict(sorted(PIECES.items()))
                ),
                Document(
                    path   = Path("docs/public/favicon.svg"),
                    render = lambda: palette.schemed(
                        (root / "docs/assets/mark.svg").read_text(encoding="utf-8")
                    )
                ),
                *(
                    Document(
                        path   = Path(f"docs/assets/lockup-{color.name.lower()}.svg"),
                        render = lambda color=color: color.filled(
                            (root / "docs/assets/lockup.svg").read_text(
                                encoding = "utf-8"
                            )
                        )
                    )
                    for color in (palette.light, palette.primary)
                ),
                Region(
                    name   = "badges",
                    path   = readme,
                    render = partial(project.badges, readme)
                ),
                *(
                    Region(name="install", path=page, render=lambda: project.install)
                    for page in (readme, Path("docs/pages/guide/index.md"))
                ),
                Region(
                    name   = "sources",
                    path   = Path("docs/pages/data/index.md"),
                    render = lambda: markdown(
                        headers = ("Provider", "Section", "File"),
                        right   = False,
                        rows    = (
                            (
                                f"[{source.provider}]({source.home})",
                                source.section,
                                f"[`{source.file}`]({source.address})"
                            )
                            for source in sources.sources
                        )
                    )
                ),
                Region(
                    name   = "source",
                    path   = Path("docs/pages/guide/store.md"),
                    render = lambda: "\n".join(
                        ("```toml", Sources.text().partition("\n\n")[0], "```")
                    )
                ),
                *(
                    Region(
                        name   = f"help-{'-'.join(tokens)}",
                        path   = Path("docs/pages/guide/commands.md"),
                        render = lambda tokens=tokens:
                            f"```text\n{helped(app, *tokens)}\n```"
                    )
                    for tokens in commands(app)
                ),
                *(cls.measured(index, pages, readme, root) if index else []),
                *(
                    output
                    for page in pages
                    for output in (
                        Figures(path=page, values=lambda: declared),
                        Footnotes(path=page, references=references)
                    )
                )
            ]
        )


def commands(app: App) -> Iterator[tuple[str, str]]:
    """
    Yields the verb and the noun of each command the help of `app` lists,
    leaving out each group it hides.
    """
    for verb in app:
        if not verb.startswith("-") and app[verb].show:
            yield from ((verb, noun) for noun in app[verb] if not noun.startswith("-"))


def helped(app: App, *tokens: str) -> str:
    """
    Captures the help of the command `tokens` name at 80 columns with no
    color, each line's trailing spaces removed.
    """
    console = Console(color_system=None, force_terminal=False, width=80)

    with console.capture() as capture:
        app.help_print(tokens, console=console)

    return "\n".join(
        line.rstrip() for line in (
            capture.get()
                   .strip()
                   .splitlines()
        )
    )


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
