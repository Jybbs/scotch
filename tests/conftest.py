"""
Sets the example count on Hypothesis's built-in profiles, two hundred under
the `ci` profile Hypothesis loads on a CI runner and twenty-five under
`default`, which also drops the deadline the `ci` profile already drops, so
a heavily loaded machine fails no test a runner passes.

The autouse `environment` fixture isolates every test from the machine
running it, and the plugin `common.isolation` registers lets a test open
a network connection only when it carries the `network` mark. The `sample`
and `answered` fixtures copy the sample checkout the checks in `scotch.repo`
read, and the `pgn` fixture writes the PGN text a test reads through a file.
"""

from collections.abc  import Callable
from common.isolation import CLEARED
from common.sample    import Sample
from hypothesis       import settings
from os               import environ
from pathlib          import Path
from pytest           import MonkeyPatch, TempPathFactory, fixture
from pytest_subprocess.fake_process import FakeProcess

from scotch.cli.settings import Settings

# `pytest_plugins` stays lowercase, the only name pytest reads the plugin list under.
pytest_plugins = ["common.isolation"]  # prose: ignore[miscased-constants]

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


@fixture
def answered(fp: FakeProcess, sample: Sample) -> Sample:
    """
    Copies the sample checkout and registers the answers mise gives it,
    reporting no problem from `mise tasks validate`.
    """
    sample.answer(fp)

    return sample


@fixture
def sample(tmp_path: Path) -> Sample:
    """
    Copies the sample checkout under `tests/repo/fixtures/checkout/` into
    `tmp_path`.
    """
    return Sample.copy(tmp_path)


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
