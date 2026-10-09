"""
Sets the example count on Hypothesis's built-in profiles, the `ci` one it
loads on a CI runner and the `default` one, which also drops the deadline
so a heavily loaded machine fails no test a runner passes, and defines the
fixtures every test module shares, each described where it is defined.
"""

from collections.abc  import Callable, Iterator
from common.isolation import CLEARED
from common.sample    import Sample
from hypothesis       import settings
from os               import environ
from pathlib          import Path
from pytest           import MonkeyPatch, TempPathFactory, fixture
from pytest_subprocess.fake_process import FakeProcess
from responses            import RequestsMock
from responses.registries import OrderedRegistry

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
    Points `HOME` at an empty directory and clears each variable `CLEARED`
    names beside each one `Settings` reads, whose name opens on its
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
    Builds a writer that saves PGN text, in the encoding it names or UTF-8,
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


@fixture
def queued() -> Iterator[RequestsMock]:
    """
    Answers each request a `requests` session sends with the next response a
    test registered on the mock it yields, strictly in the order registered,
    through the `Retry` of the adapter the session sends through.
    """
    with RequestsMock(
        assert_all_requests_are_fired = False,
        registry = OrderedRegistry
    ) as queued:
        yield queued


@fixture
def web() -> Iterator[RequestsMock]:
    """
    Answers each request a `requests` session sends from the responses a
    test registers on the mock it yields, raising `ConnectionError` for an
    address no test registered.
    """
    with RequestsMock(assert_all_requests_are_fired=False) as web:
        yield web
