"""
Sets the example count on Hypothesis's built-in profiles, two hundred under
the `ci` profile Hypothesis loads on a CI runner and twenty-five under
`default`, which also drops the deadline the `ci` profile already drops, so
a heavily loaded machine fails no test a runner passes.

The autouse `environment` fixture isolates every test from the machine
running it, the `pgn` fixture writes the PGN text a test reads through a
file, and the collection hook lets a test open a network connection only
when it carries the `network` mark.
"""

from collections.abc import Callable
from hypothesis      import settings
from os              import environ
from pathlib         import Path
from pytest          import Item, MonkeyPatch, TempPathFactory, fixture, mark

from scotch.cli.settings import Settings

CLEARED = (
    "CLICOLOR", "COLORTERM", "COLUMNS", "FORCE_COLOR", "GITHUB_OUTPUT",
    "GITHUB_STEP_SUMMARY", "LINES", "NO_COLOR", "TTY_COMPATIBLE",
    "TTY_INTERACTIVE", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_STATE_HOME"
)

settings.register_profile("ci", settings.get_profile("ci"), max_examples=200)
settings.register_profile(
    "default",
    settings.get_profile("default"),
    deadline     = None,
    max_examples = 25
)


@fixture(autouse=True)
def environment(monkeypatch: MonkeyPatch, tmp_path_factory: TempPathFactory):
    """
    Points `HOME` at an empty directory and clears what `CLEARED` names:

    - The color, terminal, and size settings a console reads
    - The files a GitHub Actions step writes its outputs and summary to
    - The directories the XDG convention names for configuration, data, and state

    It also clears every variable `Settings` reads, whose names open on its
    `env_prefix` in any case, since pydantic-settings matches a name without
    regard to case.
    """
    prefix = Settings.model_config["env_prefix"].casefold()

    for name in (
        *CLEARED,
        *(name for name in environ if (
            name.casefold()
                .startswith(prefix)
        ))
    ):
        monkeypatch.delenv(name, raising=False)

    monkeypatch.setenv("HOME", str(tmp_path_factory.mktemp("home")))


def pytest_collection_modifyitems(items: list[Item]):
    """
    Adds pytest-socket's `enable_socket` mark to every test carrying the
    `network` mark. The `--disable-socket` option in `addopts` blocks every
    test from opening a connection, and a test carrying `enable_socket` can
    reach a live service again.
    """
    for item in items:
        if item.get_closest_marker("network"):
            item.add_marker(mark.enable_socket)


@fixture(scope="session")
def pgn(tmp_path_factory: TempPathFactory) -> Callable[..., Path]:
    """
    Returns a writer that saves PGN text, in the encoding it names or UTF-8,
    to a file in a fresh directory, spanning the session so a Hypothesis
    property draws every file it needs from one writer.
    """

    def write(text: str, encoding: str = "utf-8") -> Path:
        """
        Writes `text` in `encoding` to `games.pgn` in a fresh directory.
        """
        path = tmp_path_factory.mktemp("pgn") / "games.pgn"
        path.write_text(text, encoding=encoding)

        return path

    return write
