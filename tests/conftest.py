"""
Sets the example count on Hypothesis's built-in profiles, the `ci` one it
loads on a CI runner and the `default` one, which also drops the deadline
so a heavily loaded machine fails no test a runner passes. It also registers
the `common.isolation` plugin and defines the fixtures tests across the
suite share, each described where it is defined.
"""

from collections.abc  import Callable, Iterable, Iterator
from common.isolation import CLEARED
from common.sample    import Sample
from hypothesis       import settings
from os               import environ
from pathlib          import Path
from pytest           import MonkeyPatch, TempPathFactory, fixture
from pytest_subprocess.fake_process import FakeProcess
from responses            import RequestsMock
from responses.registries import OrderedRegistry

from scotch.citations.schemas import References
from scotch.cli.settings      import Settings
from scotch.docs.inventory    import Outputs
from scotch.games.schemas     import Game
from scotch.index.tables      import PositionIndex
from scotch.repo.checkout     import Checkout

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


@fixture(scope="session")
def known() -> Path:
    """
    Locates `tests/index/fixtures/`, the folder holding the PGN files the
    known-answer cases read:

    - `stored.pgn`, holding Kasparov–Sosonko (Tilburg 1981) and two of
      Pachman–Cobo Arteaga's games (Havana 1965 and 1963)
    - `demo.pgn`, which plays Kasparov–Sosonko move for move through
      `21...b6` and then departs with `22. c6`
    """
    return Path(__file__).parent / "index" / "fixtures"


@fixture(scope="session")
def bibtex() -> Path:
    """
    Locates `tests/citations/fixtures/references.bib`, the bibliography
    holding the three sources `references` reads.
    """
    return Path(__file__).parent / "citations" / "fixtures" / "references.bib"


@fixture(scope="session")
def index(
    scanned : Callable[[Iterable[Game]], PositionIndex],
    stored  : list[Game]
) -> PositionIndex:
    """
    Builds the index of the stored games through `scanned`.
    """
    return scanned(stored)


@fixture(scope="session")
def references(bibtex: Path) -> References:
    """
    Reads the three sources in `bibtex`:

    - `doe2020`, by three authors under a title closing on a question mark,
      with no note
    - `fide2023`, by an organization under a title whose braces protect its
      capitals
    - `zobrist1970`, by one author whose given names close on a period,
      under a note closing on one
    """
    return References.read(bibtex)


@fixture
def sample(monkeypatch: MonkeyPatch, tmp_path: Path) -> Sample:
    """
    Copies the sample checkout under `tests/repo/fixtures/checkout/` into
    `tmp_path`, with `Checkout.outputs` declaring no file `scotch render
    docs` writes, since the sample carries none of the pages, assets, or
    bibliography the site renders from.
    """
    monkeypatch.setattr(Checkout, "outputs", Outputs([]))

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


@fixture(scope="session")
def scanned(
    tmp_path_factory: TempPathFactory
) -> Callable[[Iterable[Game]], PositionIndex]:
    """
    Builds a function that indexes the games it is given, writes the index
    into a fresh directory, and scans it back.
    """

    def scan(games: Iterable[Game]) -> PositionIndex:
        """
        Indexes `games`, writes the index, and scans it back.
        """
        directory = tmp_path_factory.mktemp("index") / "index"
        PositionIndex.build(games).write(directory)

        return PositionIndex.read(directory)

    return scan


@fixture(scope="session")
def stored(known: Path) -> list[Game]:
    """
    Reads the three stored games, Kasparov–Sosonko first.
    """
    return list(Game.read(known / "stored.pgn"))


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
