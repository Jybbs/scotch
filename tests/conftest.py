"""
Sets the example count on Hypothesis's built-in profiles, two hundred under
the `ci` profile Hypothesis loads on a CI runner and twenty-five under
`default`, which also drops the deadline the `ci` profile already drops, so
a heavily loaded machine fails no test a runner passes. It also defines the
fixtures the suite shares, each described where it is defined.

The autouse `environment` fixture isolates every test from the machine
running it, and the collection hook lets a test open a network connection
only when it carries the `network` mark.
"""

from hypothesis       import settings
from pytest           import Item, MonkeyPatch, TempPathFactory, fixture, mark
from syrupy.assertion import SnapshotAssertion
from syrupy.extensions.single_file import SingleFileSnapshotExtension, WriteMode

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


class PlainFile(SingleFileSnapshotExtension):
    """
    Writes each snapshot as a plain text file at
    `fixtures/<module>/<test>.txt` beside the tests that read it, the
    `fixtures` directory named by the `--snapshot-dirname` option in
    `[tool.pytest]`.
    """

    _write_mode    = WriteMode.TEXT
    file_extension = "txt"


@fixture(autouse=True)
def environment(monkeypatch: MonkeyPatch, tmp_path_factory: TempPathFactory):
    """
    Clears every shell variable `CLEARED` names, any of which would
    let the machine running the suite change a result. Some of them set
    whether a console prints color, whether it counts as a terminal and as
    interactive, and how many columns and lines it lays out, `GITHUB_OUTPUT`
    and `GITHUB_STEP_SUMMARY` name the files a GitHub Actions runner
    collects a workflow step's outputs and a workflow run's summary
    page from, and the rest name the directories where a tool keeps its
    configuration, data, and state, which the XDG convention defines.

    Points `HOME` at an empty directory the test owns, so a tool that falls
    back to `~` finds none of the developer's files there.
    """
    for name in CLEARED:
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


@fixture
def snapshot(snapshot: SnapshotAssertion) -> SnapshotAssertion:
    """
    Routes every snapshot through the plain-file extension.
    """
    return snapshot.use_extension(PlainFile)
