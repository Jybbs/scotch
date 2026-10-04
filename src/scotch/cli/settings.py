"""
Holds `Settings`, the run settings every `scotch` command reads from keyword
arguments, `SCOTCH_` environment variables, and the `[tool.scotch]` table of
the project's `pyproject.toml`.
"""

from importlib.metadata import distribution
from pathlib            import Path
from pydantic           import field_validator
from pydantic_settings  import (
    BaseSettings,
    PydanticBaseSettingsSource,
    PyprojectTomlConfigSettingsSource
)


class Settings(
    BaseSettings,
    env_prefix                  = "SCOTCH_",
    frozen                      = True,
    pyproject_toml_table_header = ("tool", "scotch"),
    use_attribute_docstrings    = True
):
    """
    The settings a run reads, each taken from a keyword argument, then from
    a `SCOTCH_` environment variable, then from the `[tool.scotch]` table of
    the `pyproject.toml` at the project's root, then from its default.
    """

    data: Path = Path(".cache/data")
    """
    The directory holding the store's data, with the index under its `index`
    folder, read against the project's root where relative.
    """

    @property
    def index(self) -> Path:
        """
        Names the directory `PositionIndex.read` scans the index from.
        """
        return self.data / "index"

    @field_validator("data")
    @classmethod
    def anchor(cls, data: Path) -> Path:
        """
        Reads `data` against the project's root, leaving an absolute path as
        it stands.
        """
        return root() / data

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls         : type[BaseSettings],
        *,
        dotenv_settings      : PydanticBaseSettingsSource,
        env_settings         : PydanticBaseSettingsSource,
        file_secret_settings : PydanticBaseSettingsSource,
        init_settings        : PydanticBaseSettingsSource
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        """
        Orders the sources a setting is read from, a keyword argument first,
        then a `SCOTCH_` variable, then the `[tool.scotch]` table of the
        `pyproject.toml` at the project's root.
        """
        return init_settings, env_settings, PyprojectTomlConfigSettingsSource(
            settings_cls,
            root() / "pyproject.toml"
        )


def root() -> Path:
    """
    Reads the directory the `scotch` distribution was installed from, which
    an installer records in the `direct_url.json` PEP 610 specifies, or the
    working directory where the installer recorded no directory.
    """
    origin = distribution("scotch").origin

    return Path.from_uri(origin.url) if hasattr(origin, "dir_info") else Path.cwd()
