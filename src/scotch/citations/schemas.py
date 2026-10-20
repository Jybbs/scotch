"""
Holds `Reference`, one source in `docs/references.bib` and the footnote
definition citing it, beside `References`, every source the file holds.
`scotch render docs` writes each tracked Markdown file's definitions through
them, and `scotch cite source` prints a definition for an issue or a pull
request through them, so the form a citation takes is written once, here.
"""

from bibtexparser             import parse_file
from bibtexparser.middlewares import LatexDecodingMiddleware, SeparateCoAuthors
from bibtexparser.middlewares.names import parse_single_name_into_parts
from bibtexparser.model             import Entry
from pathlib  import Path
from pydantic import BaseModel, Field, HttpUrl, model_validator
from typing   import ClassVar, Self


class Reference(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    One source's entry in `docs/references.bib`, holding the fields its
    footnote definition reads.
    """

    form: ClassVar[str] = r"[a-z0-9]+[0-9]{4}[a-z]?"

    annote: str
    """
    What the source settles for Scotch.
    """

    title: str
    """
    The source's title.
    """

    url: HttpUrl
    """
    The address a reader opens the source at.
    """

    year: str
    """
    The year the source was published.
    """

    authors: list[str] = Field(min_length=1)
    """
    Each name the definition opens on, an author's or, where the entry
    names no author, an editor's, the first name surname first and every
    later one given names first.
    """

    note: str | None = None
    """
    The part of the source a citation reaches, such as a section or an
    article, or `None` where it cites the whole source.
    """

    role: str | None = None
    """
    The part the people `authors` names played where they edited the
    source rather than wrote it, such as a coordinator, or `None` where
    they wrote it.
    """

    key: str = Field(pattern=rf"^{form}$")
    """
    The label a footnote cites the source by, a lowercase name and the year,
    with a letter after the year for a second source of that name and year.
    """

    @property
    def definition(self) -> str:
        """
        Writes the footnote definition citing the source, naming its
        authors, or its editors beside the role they played, and its year,
        its title in quotes closing on a comma before the note or on a
        period where it carries none, and its address. A title ending on a
        question mark or an exclamation mark keeps its own mark.
        """
        *others, last = self.authors
        named         = f"{', '.join(others)}, and {last}" if others else last
        credited      = f"{named}, {self.role}" if self.role else named
        stop  = "" if self.title.endswith(("?", "!")) else "," if self.note else "."
        noted = f" {self.note.removesuffix('.')}." if self.note else ""

        return (
            f'[^{self.key}]: {credited.removesuffix(".")}. {self.year}. '
            f'"{self.title}{stop}"{noted} <{self.url}>'
        )

    @model_validator(mode="before")
    @classmethod
    def from_entry(cls, data: object) -> object:
        """
        Reads the fields of a source out of the entry bibtexparser parsed,
        whose `author` field, or `editor` field where it names no author,
        names each person as a surname, a comma, and the given names, or an
        organization as a name holding no comma, and passes any other value
        through as it stands. The first name keeps that order, and each
        later one is turned to the given names before the surname.

        An entry naming editors takes the role its `editortype` field names,
        which biblatex reads as `editor` where the field is absent.
        """
        if not isinstance(data, Entry):
            return data

        fields = {field.key: field.value for field in data.fields}
        edited = "author" not in fields
        names  = fields.pop("editor" if edited else "author", [])

        return fields | {
            "authors" : names[:1] + [
                parse_single_name_into_parts(name).merge_first_name_first
                for name in names[1:]
            ],
            "key"     : data.key,
            "role"    : fields.get("editortype", "editor") if edited else None
        }


class References(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    Every source `docs/references.bib` holds, under the key a footnote cites
    it by.
    """

    file: ClassVar[Path] = Path("docs", "references.bib")

    references: dict[str, Reference]
    """
    Each source keyed by the label a footnote cites it by.
    """

    def cite(self, *keys: str) -> str:
        """
        Writes the definition of each source `keys` names, in the order
        given, with a blank line between two of them.
        """
        return "\n\n".join(self.references[key].definition for key in keys)

    @classmethod
    def read(cls, path: Path) -> Self:
        """
        Reads every source in the BibTeX file at `path`, decoding the LaTeX
        each field is written in, which drops the braces an entry protects
        its capitals with, then splitting each entry's authors at each
        `and`.

        Raises:
            ValueError: Where the file holds a block bibtexparser could not
                        read, such as a second entry under a key the file
                        already holds, naming the line the block opens on,
                        or, as Pydantic's `ValidationError`, where an entry
                        lacks a field a definition reads or holds a key or
                        an address of another shape, naming each such entry
                        by its key.
        """
        library = parse_file(
            path,
            append_middleware = [
                LatexDecodingMiddleware(),
                SeparateCoAuthors()
            ]
        )

        if library.failed_blocks:
            raise ValueError(
                "\n".join(
                    f"Line {block.start_line + 1} of {path} holds a block"
                    f" bibtexparser could not read: {reason(block.error)}"
                    for block in library.failed_blocks
                )
            )

        return cls(references={entry.key: entry for entry in library.entries})

    @classmethod
    def shipped(cls, root: Path) -> Self:
        """
        Reads `docs/references.bib` under the repository's root at `root`.
        """
        return cls.read(root / cls.file)

    def unknown(self, *keys: str) -> list[str]:
        """
        Names each of `keys` that no entry in the file holds, one line to a
        key in the order given.
        """
        return [
            f"{key} names no entry in {self.file}"
            for key in keys
            if key not in self.references
        ]


def reason(error: Exception) -> str:
    """
    Reads why bibtexparser could not read a block, from the `abort_reason` a
    block it aborted on a syntax error carries, whose message is empty, and
    from the error's own message otherwise.
    """
    return str(getattr(error, "abort_reason", error)).strip()
