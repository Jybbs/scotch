"""
Holds `Terms`, the words the site's pages define, read from the `terms.toml`
beside this module, which the terms page, the link each page sets on a
term's first use, and the slip that link opens all read.
"""

from importlib.resources import read_text
from pydantic            import BaseModel, computed_field
from tomllib             import loads
from typing              import Self


class Term(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One word the pages define, in the one sentence its definition takes.
    """

    address: str
    """
    The page explaining the term, relative to the terms page, or the term's
    canonical source for a word from chess or PGN.
    """

    label: str
    """
    The words the terms page links `address` under.
    """

    name: str
    """
    The term as the terms page's heading writes it.
    """

    pattern: str
    """
    The regular expression the site's renderer matches against a page's text
    without regard to case, in JavaScript's dialect, written to leave out a
    word's other senses such as a command to run.
    """

    sentence: str
    """
    The term in one sentence, as the terms page and the slip both set it.
    """

    @computed_field
    @property
    def anchor(self) -> str:
        """
        Writes the fragment the site's renderer gives the term's heading,
        such as `the-parting-move`.
        """
        return self.name.lower().replace(" ", "-")


class Terms(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The words `terms.toml` declares, alphabetically, as the terms page sets
    them.
    """

    terms: tuple[Term, ...]
    """
    Each term, by its name.
    """

    @property
    def page(self) -> str:
        """
        Writes each term's heading above its sentence and the link
        explaining it.
        """
        return "\n\n".join(
            f"### {term.name}\n\n{term.sentence} [{term.label}]({term.address})."
            for term in self.terms
        )

    @classmethod
    def read(cls) -> Self:
        """
        Reads every term of the `terms.toml` the `scotch.docs` package
        ships.
        """
        return cls.model_validate(loads(read_text("scotch.docs", "terms.toml")))
