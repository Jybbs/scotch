"""
Holds `Output`, one file `scotch render docs` writes from a declaration in
the repository or from the index, beside its kinds, meaning the `Document`
written whole, the `Region` written between two markers of a page, the
`Figures` set inside a page's sentences, and the `Footnotes` closing a
Markdown file, each of which the audit's `RenderCheck` reads as well.
"""

from abc             import abstractmethod
from collections.abc import Callable
from json            import dumps
from pathlib         import Path
from pydantic        import BaseModel
from re              import sub
from typing          import Self

from scotch.citations.pages   import Page
from scotch.citations.schemas import References


class Output(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One file `scotch render docs` writes, each kind declaring `rendered`,
    since Pydantic's model metaclass derives from `abc.ABCMeta` and refuses
    to instantiate a kind leaving it undeclared.
    """

    path: Path
    """
    The file, relative to the repository's root.
    """

    def problems(self, root: Path) -> list[tuple[int | None, str]]:
        """
        Compares the file under `root` with its rendered text.

        Returns:
            The line and the description of each place the file has drifted,
            the line being `None` where the drift names no line, or an empty
            list where the file holds its rendered text.
        """
        text = self.read(root)

        if text == self.rendered(text):
            return []

        return [(None, "The file has drifted from what `scotch render docs` writes")]

    def read(self, root: Path) -> str:
        """
        Reads the file under `root`, or an empty text where none exists yet.
        """
        path = root / self.path

        return path.read_text(encoding="utf-8") if path.is_file() else ""

    @abstractmethod
    def rendered(self, text: str) -> str:
        """
        Writes what the file holds once rendered, from `text`, what it holds
        now.
        """

    def write(self, root: Path) -> bool:
        """
        Writes the rendered text to the file under `root` where it differs
        from what the file holds, creating the directory where it is
        missing, and tells whether it wrote.
        """
        if (text := self.read(root)) == (rendered := self.rendered(text)):
            return False

        (root / self.path).parent.mkdir(exist_ok=True, parents=True)
        (root / self.path).write_text(rendered, encoding="utf-8")

        return True


class Document(Output):
    """
    A file written whole from what `render` returns.
    """

    render: Callable[[], str]
    """
    The call returning the file's text.
    """

    @classmethod
    def from_value(cls, path: Path, value: Callable[[], object]) -> Self:
        """
        Declares a JSON file holding what `value` returns, indented by two
        spaces and closing on a newline.
        """
        return cls(
            path   = path,
            render = lambda: dumps(value(), ensure_ascii=False, indent=2) + "\n"
        )

    def rendered(self, text: str) -> str:
        """
        Writes the file's text, whatever it holds now.
        """
        return self.render()


class Figures(Output):
    """
    The figures a Markdown file sets inside its sentences, each between an
    opening marker, an HTML comment holding the figure's name, and a closing
    one holding the name behind a slash, on one line.
    """

    values: Callable[[], dict[str, str]]
    """
    The call returning the text of each figure under its name, where a
    marker naming a figure the call leaves out is left as it stands.
    """

    def rendered(self, text: str) -> str:
        """
        Writes `text` with the text between each pair of markers naming a
        figure replaced by that figure.
        """
        values = self.values()

        return sub(
            r"<!-- ([a-z0-9-]+) -->[^\n]*?<!-- /\1 -->",
            lambda found: (
                f"<!-- {name} -->{values[name]}<!-- /{name} -->"
                if (name := found[1]) in values
                else found[0]
            ),
            text
        )


class Footnotes(Output):
    """
    The footnote definitions closing a Markdown file, one for each source of
    `docs/references.bib` the file cites, in the order it first cites them.
    """

    references: Callable[[], References]
    """
    The call returning the sources a footnote may cite.
    """

    def problems(self, root: Path) -> list[tuple[int | None, str]]:
        """
        Compares the file under `root` with the definitions it cites, naming
        the line of each definition that differs, is missing, or stands out
        of place. Where every line matches and the file still differs from
        its rendering, such as in the newline closing it, the drift names no
        line. It reads the sources only for a file citing or defining one.
        """
        if not (page := Page(text=self.read(root))).cites:
            return []

        return [
            (mismatch.line, mismatch.problem)
            for mismatch in page.drifted(self.references())
        ] or super().problems(root)

    def rendered(self, text: str) -> str:
        """
        Writes `text` with the definition of each source it cites set at its
        end, reading the sources only for a text citing or defining one.
        """
        page = Page(text=text)

        return page.cited(self.references()) if page.cites else text


class Region(Output):
    """
    The part of a page between an opening marker, an HTML comment holding
    `name`, and a closing one holding `name` behind a slash, which neither
    GitHub nor the site shows.
    """

    name: str
    """
    The name both markers hold.
    """

    render: Callable[[], str]
    """
    The call returning the text the markers enclose.
    """

    def rendered(self, text: str) -> str:
        """
        Writes `text` with the part between the markers replaced by what
        `render` returns, set on lines of its own.

        Raises:
            ValueError: Where the page holds other than one opening marker
                        followed by one closing marker.
        """
        opening, closing  = f"<!-- {self.name} -->", f"<!-- /{self.name} -->"
        head, found, rest = text.partition(opening)
        _, shut, tail     = rest.partition(closing)
        strays            = closing in head or opening in rest or closing in tail

        if not (found and shut) or strays:
            raise ValueError(
                f"holds other than one {opening} followed by one {closing}"
            )

        return f"{head}{opening}\n{self.render()}\n{closing}{tail}"
