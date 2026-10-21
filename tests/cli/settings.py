"""
Pins where `Settings` reads each setting from, meaning a keyword argument,
then a `SCOTCH_` environment variable, then the `[tool.scotch]` table of the
`pyproject.toml` at the project's root, and how it finds that root.
"""

from pathlib  import Path
from pydantic import ValidationError
from pytest   import Config, MonkeyPatch, mark, param, raises
from types    import SimpleNamespace

from scotch.cli.settings import Settings, root


@mark.parametrize(
    ("variables", "keywords", "data"),
    [
        param({}, {}, "table", id="table"),
        param(
            {"SCOTCH_DATA": "variable"},
            {},
            "variable",
            id = "variable-outranks-table"
        ),
        param(
            {"SCOTCH_DATA": "variable"},
            {"data": "keyword"},
            "keyword",
            id = "keyword-outranks-variable"
        ),
        param(
            {"DATA": "bare", "SCOTCH_DATA": "variable"},
            {},
            "variable",
            id = "bare-variable-unread"
        )
    ]
)
def test_each_source_outranks_the_ones_after_it(
    data        : str,
    keywords    : dict[str, str],
    monkeypatch : MonkeyPatch,
    project     : Path,
    variables   : dict[str, str]
):
    """
    Asserts that a keyword argument outranks a `SCOTCH_` variable, which
    outranks the `[tool.scotch]` table, and that a variable named without
    the prefix is never read, each value read against the project's root.
    """
    for name, value in variables.items():
        monkeypatch.setenv(name, value)

    assert Settings(**keywords).data == project / data


def test_a_misspelled_key_in_the_table_raises(project: Path):
    """
    Asserts that a `[tool.scotch]` key no setting declares raises
    `ValidationError`, so a misspelled key never reads as unset.
    """
    (project / "pyproject.toml").write_text('[tool.scotch]\ndatum = "table"\n')

    with raises(ValidationError):
        Settings()


def test_a_run_from_a_subfolder_reads_the_projects_settings(
    monkeypatch  : MonkeyPatch,
    pytestconfig : Config
):
    """
    Asserts that a run from a folder inside the project reads the same
    data directory a run from its root reads, rather than one under the
    subfolder.
    """
    monkeypatch.chdir(pytestconfig.rootpath / "tests")

    assert Settings().data == (
        pytestconfig.rootpath / Settings.model_fields["data"].default
    )


def test_an_absolute_data_directory_stands_as_given(project: Path, tmp_path: Path):
    """
    Asserts that an absolute data directory is read as it stands rather than
    against the project's root.
    """
    assert Settings(data=tmp_path / "absolute").data == tmp_path / "absolute"


def test_the_data_defaults_under_the_projects_root(pytestconfig: Config):
    """
    Asserts that a run setting nothing reads the index from the `index`
    folder of the default data directory, read against the project's root.
    """
    assert Settings().index == (
        pytestconfig.rootpath / Settings.model_fields["data"].default / "index"
    )


def test_the_fetched_files_sit_beside_the_index(project: Path):
    """
    Asserts that the fetched files and the index sit in the `downloads` and
    `index` folders of one data directory.
    """
    settings = Settings()

    assert (settings.downloads, settings.index) == (
        project / "table" / "downloads",
        project / "table" / "index"
    )


def test_the_root_falls_back_to_the_working_directory(
    monkeypatch : MonkeyPatch,
    tmp_path    : Path
):
    """
    Asserts that an install recording no directory it was installed from,
    such as one from a wheel, leaves the working directory as the root.
    """
    monkeypatch.setattr(
        "scotch.cli.settings.distribution",
        lambda name: SimpleNamespace(origin=None)
    )
    monkeypatch.chdir(tmp_path)

    assert root() == tmp_path


def test_the_root_is_the_directory_the_package_was_installed_from(pytestconfig: Config):
    """
    Asserts that the root is the clone the editable install records in its
    `direct_url.json`, which holds the `pyproject.toml` the settings read.
    """
    assert root() == pytestconfig.rootpath


def test_the_root_reads_a_clone_whose_path_holds_a_space(
    monkeypatch : MonkeyPatch,
    tmp_path    : Path
):
    """
    Asserts that the root decodes the percent-encoded `file:` address an
    installer writes for a clone whose path holds a space.
    """
    clone = tmp_path / "a clone"
    monkeypatch.setattr(
        "scotch.cli.settings.distribution",
        lambda name: SimpleNamespace(
            origin = SimpleNamespace(dir_info=None, url=clone.as_uri())
        )
    )

    assert root() == clone
