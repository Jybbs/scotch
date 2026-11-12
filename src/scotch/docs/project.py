"""
Holds `Project`, the facts the package's metadata carries from
`pyproject.toml` that the README and the Guide restate, meaning its name,
its homepage, its repository, and the Python release it requires, from which
`scotch render docs` writes the README's row of badges, the steps both pages
give for installing it, and the Guide's account of each step.
"""

from importlib.metadata import metadata
from pathlib            import Path
from pydantic           import BaseModel
from typing             import Self

from scotch.identity.schemas import Identity


class Project(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The package's name, its two addresses, and the Python release it
    requires, as the installed package's metadata carries them.
    """

    floor: str
    """
    The lowest Python release the package runs on, such as `3.14`.
    """

    homepage: str
    """
    The address the docs site serves at.
    """

    name: str
    """
    The package's name, which the command and a clone of the repository
    take as well.
    """

    repository: str
    """
    The address the repository is cloned from.
    """

    @property
    def install(self) -> str:
        """
        Writes the commands the install steps run, as a fenced block.
        """
        return "\n".join(("```bash", *(command for command, _ in self.steps), "```"))

    @property
    def steps(self) -> tuple[tuple[str, str], ...]:
        """
        Lists the commands that clone the repository, skipping every blob
        no checkout reaches, trust and install the tools it pins, enter the
        clone, and print the command's help and the conditions the clone
        meets, each beside what it does.
        """
        return (
            (
                f"git clone --filter=blob:none {self.repository}.git",
                "clones the repository, leaving out every earlier layout of the"
                " game store the history keeps, which git downloads only where a"
                " checkout reaches it"
            ),
            (
                f"mise trust {self.name}",
                "marks the clone's `.mise/config.toml` trusted, so mise loads it"
                " rather than prompting, skipping the file, or failing with an"
                " untrusted-config error"
            ),
            (
                f"mise -C {self.name} install",
                "installs each tool `.mise/config.toml` pins, the Python"
                " interpreter, uv, and the Rust toolchain among them"
            ),
            (
                f"cd {self.name}",
                "enters the clone, where mise puts uv and the wrapper at"
                " `.mise/bin/scotch` on the path"
            ),
            (
                f"{self.name} --help",
                "builds `.venv` from `uv.lock` on the wrapper's first run, compiling"
                " the crate under `rust/`, then prints the command's help"
            ),
            (
                "mise doctor project",
                "runs each check `.mise/config.toml` declares and prints the step"
                " that clears any that fails"
            )
        )

    def badges(self, readme: Path) -> str:
        """
        Writes the README's row of badges, one line each for the Python
        release the package requires, the share of the code its suite
        covers, which the published site serves, and the docs site, each the
        logo of the tool behind it beside a Shields value in the lead color,
        its logo's path relative to the README at `readme`.
        """
        lead   = Identity().palette.primary.hex.removeprefix("#")
        logos  = Path("docs/assets/badges").relative_to(readme.parent, walk_up=True)
        shield = "https://img.shields.io/badge"

        return "\n".join(
            (
                f"[![Python]({logos / 'python.svg'})"
                f"![{self.floor}+]({shield}/{self.floor}+-{lead}?style=for-the-badge)]"
                "(https://www.python.org/)",
                f"[![Coverage]({logos / 'coverage.svg'})"
                f"![percent]({shield}/dynamic/json?url={self.homepage}/coverage.json"
                f"&query=%24&suffix=%25&style=for-the-badge&label=&color={lead})]"
                f"({self.repository}/actions/workflows/deploy.yml?query=branch%3Amain)",
                f"[![Docs]({logos / 'docs.svg'})"
                f"![Docs]({shield}/Docs-{lead}?style=for-the-badge)]({self.homepage}/)"
            )
        )

    @classmethod
    def installed(cls) -> Self:
        """
        Reads the facts from the metadata of the installed package, whose
        `Project-URL` entries each name an address behind a label and
        a comma.
        """
        package = metadata("scotch")
        urls    = dict(entry.split(", ", 1) for entry in package.get_all("Project-URL"))

        return cls(
            floor      = package["Requires-Python"].removeprefix(">="),
            homepage   = urls["Homepage"],
            name       = package["Name"],
            repository = urls["Repository"]
        )
