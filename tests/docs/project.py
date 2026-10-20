"""
Pins the facts `Project` reads from the installed package's metadata, the
row of badges it writes for the README, and the install steps it writes for
the README and the Guide.
"""

from email.message import Message
from pathlib       import Path
from pytest        import MonkeyPatch

from scotch.docs.project import Project


def test_badges_link_each_logo_from_the_readme_beside_a_value_in_walnut(
    project: Project
):
    """
    Pins the three badges for a README under `.github/`, each logo reached
    by a path climbing out of that folder and each value filled in Walnut.
    """
    assert project.badges(Path(".github/README.md")).splitlines() == [
        "[![Python](../docs/assets/badges/python.svg)"
        "![3.14+](https://img.shields.io/badge/3.14+-764017?style=for-the-badge)]"
        "(https://www.python.org/)",
        "[![Coverage](../docs/assets/badges/coverage.svg)"
        "![percent](https://img.shields.io/badge/dynamic/json?url=https://example.org/"
        "coverage.json&query=%24&suffix=%25&style=for-the-badge&label=&color=764017)]"
        "(https://github.com/owner/scotch/actions/workflows/deploy.yml"
        "?query=branch%3Amain)",
        "[![Docs](../docs/assets/badges/docs.svg)"
        "![Docs](https://img.shields.io/badge/Docs-764017?style=for-the-badge)]"
        "(https://example.org/)"
    ]


def test_install_clones_the_repository_into_a_folder_named_for_the_package(
    project: Project
):
    """
    Pins the install steps, a clone skipping every blob no checkout reaches,
    then trusting, installing, and entering the folder the clone makes, and
    then printing the command's help and the conditions the clone meets.
    """
    assert project.install.splitlines() == [
        "```bash", "git clone --filter=blob:none https://github.com/owner/scotch.git",
        "mise trust scotch", "mise -C scotch install",
        "cd scotch", "scotch --help",
        "mise doctor project", "```"
    ]


def test_installed_reads_the_facts_the_metadata_carries(
    monkeypatch : MonkeyPatch,
    project     : Project
):
    """
    Asserts that the name, the Python floor, and the two addresses are
    read from the installed package's metadata, each address from the
    `Project-URL` entry naming it.
    """
    package         = Message()
    package["Name"] = "scotch"
    package["Requires-Python"] = ">=3.14"
    package["Project-URL"]     = "Homepage, https://example.org"
    package["Project-URL"]     = "Repository, https://github.com/owner/scotch"
    monkeypatch.setattr("scotch.docs.project.metadata", lambda name: package)

    assert Project.installed() == project
