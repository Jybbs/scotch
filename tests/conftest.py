"""
Sets the example count on Hypothesis's built-in profiles, two hundred under
the `ci` profile Hypothesis loads on a CI runner and twenty-five under
`default`, which also drops the deadline the `ci` profile already drops, so
a heavily loaded machine fails no test a runner passes. It also defines the
fixtures the suite shares, each described where it is defined.

The autouse `environment` fixture isolates every test from the machine
running it, and the plugin `common.isolation` registers lets a test open a
network connection only when it carries the `network` mark.
"""

from common.isolation import CLEARED
from common.sample    import Sample
from hypothesis       import settings
from pathlib          import Path
from pytest           import MonkeyPatch, TempPathFactory, fixture
from pytest_subprocess.fake_process import FakeProcess
from syrupy.assertion               import SnapshotAssertion
from syrupy.extensions.single_file  import SingleFileSnapshotExtension, WriteMode

# `pytest_plugins` stays lowercase, the only name pytest reads the plugin list under.
pytest_plugins = ["common.isolation"]  # prose: ignore[miscased-constants]

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
    Points `HOME` at an empty directory and clears what `CLEARED` names:

    - The color, terminal, and size settings a console reads
    - The files a GitHub Actions step writes its outputs and summary to
    - The directories the XDG convention names for configuration, data, and state
    """
    for name in CLEARED:
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


@fixture
def snapshot(snapshot: SnapshotAssertion) -> SnapshotAssertion:
    """
    Routes every snapshot through the plain-file extension.
    """
    return snapshot.use_extension(PlainFile)
