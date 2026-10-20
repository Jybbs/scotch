"""
Holds `Page`, one Markdown file parsed the way the site parses a page, which
finds each source the file cites and each footnote definition it carries
and rebuilds the file's text with the definition of every cited source
taken from `docs/references.bib`, beside the `Mismatch` naming a line where
a page differs from that text. `scotch render docs` runs it over every
tracked Markdown file, so a page types only the footnote's marker, such as
`[^zobrist1970]`, and the command writes its definition.
"""

from difflib           import SequenceMatcher
from functools         import cached_property
from markdown_it       import MarkdownIt
from markdown_it.token import Token
from mdit_py_plugins.footnote import footnote_plugin
from more_itertools           import unique_everseen
from pydantic                 import BaseModel
from re import fullmatch

from scotch.citations.schemas import Reference, References


class Mismatch(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One line where a page differs from the form `Page.cited` writes it in.
    """

    line: int
    """
    The line, counted from one.
    """

    key: str | None = None
    """
    The key of the source whose definition differs at the line, or `None`
    where only the blank lines around the definitions differ.
    """

    @property
    def problem(self) -> str:
        """
        Describes what differs at the line, in the words the audit's
        annotation prints.
        """
        if self.key:
            return (
                f"The {self.key} footnote differs from its entry in "
                f"{References.file} or sits out of the order the file first "
                "cites it in"
            )
        return "The blank lines around the footnote definitions have drifted"


class Page(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One Markdown file's text, where a footnote whose label takes the form of
    a source's key cites that source, and a footnote under any other label
    stays as the file writes it.
    """

    text: str
    """
    The file's text.
    """

    @cached_property
    def citations(self) -> list[tuple[int, str]]:
        """
        Finds every marker citing a source, in the order a reader meets
        them.

        Returns:
            Each marker's key beside the first line, counted from one, of the
            block it sits in.
        """
        return [
            (token.map[0] + 1, child.meta["label"])
            for token in self.tokens
            for child in token.children or []
            if child.type == "footnote_ref" and self.keyed(child)
        ]

    @property
    def cites(self) -> bool:
        """
        Tells whether the page cites a source or carries a source's
        definition.
        """
        return bool(self.citations or self.definitions)

    @cached_property
    def definitions(self) -> dict[int, str]:
        """
        Finds every line a definition of a source spans, including the blank
        lines the parser reads as part of it.

        Returns:
            The key each such line defines, under the line's index counted
            from zero.
        """
        return {
            line: token.meta["label"]
            for token in self.tokens
            if token.type == "footnote_reference_open" and self.keyed(token)
            for line in range(*token.map)
        }

    @cached_property
    def lines(self) -> list[str]:
        """
        Splits the text into its lines at each newline alone, as markdown-it
        does, without their line endings.
        """
        return self.text.removesuffix("\n").split("\n")

    @cached_property
    def tokens(self) -> list[Token]:
        """
        Parses the text into markdown-it's tokens, each one an element
        the parser found, such as the opening of a paragraph or a footnote
        marker. The parser runs markdown-it's default rules with HTML
        enabled, as VitePress does, and the footnote plugin mdit-py-plugins
        ports from markdown-it-footnote, the plugin VitePress's own footnote
        plugin is forked from.

        The plugin matches every marker whether or not the page defines it,
        and leaves each definition on the lines it spans. A text holding no
        `[^` marks no footnote and is left unparsed.
        """
        if "[^" not in self.text:
            return []

        return MarkdownIt("js-default", {"html": True}).use(
            footnote_plugin,
            always_match_refs = True,
            move_to_end       = False
        ).parse(self.text)

    def cited(self, references: References) -> str:
        """
        Rebuilds the page's text with every definition of a source removed,
        then sets the definition of each source it cites at its end, in the
        order the page first cites each one, as `References.cite` writes
        them. A page that cites no source and defines none is returned as
        it stands.

        Raises:
            ValueError: Where a marker's key names no entry in `references`,
                        naming the line of each such marker.
        """
        if not self.cites:
            return self.text

        if unknown := [
            f"line {line}: {problem}"
            for line, key in self.citations
            for problem in references.unknown(key)
        ]:
            raise ValueError("\n".join(unknown))

        keys    = dict.fromkeys(key for _, key in self.citations)
        dropped = self.definitions
        body    = "\n".join(
            line for index, line in enumerate(self.lines) if index not in dropped
        ).rstrip()
        return f"{body}\n\n{references.cite(*keys)}\n" if keys else f"{body}\n"

    def drifted(self, references: References) -> list[Mismatch]:
        """
        Compares the page with the form `cited` writes it in, line by line.

        Returns:
            One mismatch per source whose definition differs, is missing, or
            is out of place. A definition the page holds is reported at its
            own line, and one the page lacks at the line it would be written
            ahead of, or at the page's last line where it belongs past the
            end. A change to the blank lines around the definitions alone
            yields one mismatch naming no source, since a blank line never
            names the definition it follows.
        """
        written  = Page(text=self.cited(references))
        reported = []

        for tag, low, high, start, end in SequenceMatcher(
            None,
            self.lines,
            written.lines,
            autojunk = False
        ).get_opcodes():
            if tag == "equal":
                continue
            spot  = min(low + 1, len(self.lines))
            found = [
                (index + 1, self.definitions.get(index))
                for index in range(low, high)
                if self.lines[index]
            ] + [
                (spot, written.definitions.get(index))
                for index in range(start, end)
                if written.lines[index]
            ]
            reported += [Mismatch(
                key  = key,
                line = line
            ) for line, key in found if key] or [Mismatch(line=spot)]

        return list(
            unique_everseen(
                reported,
                key = lambda mismatch: mismatch.key or mismatch.line
            )
        )

    @staticmethod
    def keyed(token: Token) -> bool:
        """
        Tells whether a footnote token's label takes the form of a source's
        key.
        """
        return fullmatch(Reference.form, token.meta.get("label", "")) is not None
