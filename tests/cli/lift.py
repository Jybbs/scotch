"""
Pins what `scotch lift pins` prints and decides for the lifts it reads,
meaning the table it prints, the status it exits with for a hold naming
no pin, for a command that fails, and for a file that fails to read, the
attempts each of `--try` and `--write` makes and the order it makes them in,
and the diff it applies.
"""

from collections.abc import Callable
from common.app      import invoke
from common.sample   import Sample
from datetime        import UTC, datetime
from io              import StringIO
from pytest          import CaptureFixture, MonkeyPatch, mark, param
from pytest_subprocess.fake_process import FakeProcess
from subprocess       import CalledProcessError
from syrupy.assertion import SnapshotAssertion
from types            import SimpleNamespace

from scotch.pins.schemas import Lift
from scotch.pins.trees   import Tree

type Attempt = tuple[tuple[str, ...], str, bool]
type Lagging = Callable[..., tuple[list[Attempt], list[bytes]]]


def coupled_pair() -> tuple[Lift, ...]:
    """
    Builds the major lifts of `vitest` and `@vitest/coverage-v8`, which
    `repo:audit` holds to one version, beside the lift of `pluggy`.
    """
    return (
        *(
            Lift(
                current = "5.0.5",
                name    = name,
                newest  = "6.0.0",
                path    = "docs/package.json"
            )
            for name in ("vitest", "@vitest/coverage-v8")
        ),
        Lift(
            current = "1.6.0",
            name    = "pluggy",
            newest  = "1.7.0",
            path    = "pyproject.toml"
        )
    )


def lagging_three() -> tuple[Lift, ...]:
    """
    Builds the lifts of `actions/checkout` and of `polars`, both major and
    the second dated, and of `pluggy`.
    """
    return (
        Lift(
            current  = "1.44.2",
            name     = "polars",
            newest   = "2.0.0",
            path     = "uv.lock",
            released = datetime(2026, 10, 6, 11, 44, tzinfo=UTC)
        ),
        Lift(
            current = "1.6.0",
            name    = "pluggy",
            newest  = "1.7.0",
            path    = "pyproject.toml"
        ),
        Lift(
            current = "v6.0.0",
            name    = "actions/checkout",
            newest  = "v7.0.1",
            path    = ".github/workflows/ci.yml"
        )
    )


def test_a_command_reading_a_pin_that_fails_exits_naming_it(
    lagging     : Lagging,
    monkeypatch : MonkeyPatch
):
    """
    Asserts that a command a kind of pin runs exiting nonzero ends the run
    naming the command, its status, and what it printed to standard error.
    """
    lagging([])

    def failing() -> list[Lift]:
        """
        Raises the error a failing audit raises.
        """
        raise CalledProcessError(2, ["uv", "audit"], stderr="unreachable\n")

    monkeypatch.setattr(
        "scotch.cli.lift.Pins",
        SimpleNamespace(
            __subclasses__ = lambda: [lambda tree: SimpleNamespace(lifts=failing)]
        )
    )

    assert invoke("lift", "pins") == "`uv audit` exited with status 2\nunreachable"


def test_a_failing_relock_writes_nothing(lagging: Lagging, sample: Sample):
    """
    Asserts that a write whose relock or audit fails exits naming the folder
    its log lands in and applies nothing.
    """
    _, applied = lagging(lagging_three(), breaking={"pluggy"})

    assert invoke("lift", "pins", "--write") == (
        "The lift fails to relock or to pass `mise audit`, logged under "
        f"{sample.root / '.cache' / 'lift'}"
    )
    assert applied == []


@mark.parametrize(
    "new",
    [param("node   = 26", id="out-of-shape"), param("node   = ", id="unparseable")]
)
def test_a_config_failing_to_read_exits_naming_the_file(
    fp     : FakeProcess,
    inside : Sample,
    new    : str
):
    """
    Asserts that a file of the checkout failing to parse or to validate as
    its record stops the command with the validation error naming the file,
    before any command runs.
    """
    inside.edit(".mise/config.toml", new=new, old='node   = "26.11.1"')

    assert invoke("lift", "pins").startswith(
        f"1 validation error for {inside.root / '.mise' / 'config.toml'}\n"
    )
    assert not fp.calls


def test_a_failing_trial_holds_back_a_coupled_pair_once_as_one(
    capsys  : CaptureFixture[str],
    lagging : Lagging,
    sample  : Sample
):
    """
    Asserts that a failing trial tries `vitest` and `@vitest/coverage-v8`
    together in one attempt, named for the first in the table's order, holds
    the two back together where it fails, naming the command and the log,
    and passes on the lift left.
    """
    attempts, _ = lagging(coupled_pair(), breaking={"vitest"})
    logs        = sample.root / ".cache" / "lift"

    assert invoke("lift", "pins", "--try") == 0
    assert capsys.readouterr().out.splitlines()[-3:] == [
        f"The lift fails `mise run repo:ci`, logged in {logs / 'trial.log'}",
        "Held back `@vitest/coverage-v8` and `vitest`, whose trial fails "
        f"`mise run repo:ci`, logged in {logs / 'lift-@vitest-coverage-v8.log'}",
        "The lift passes `mise ci`"
    ]
    assert attempts == [
        (("@vitest/coverage-v8", "vitest", "pluggy"), "trial.log", True),
        (("@vitest/coverage-v8", "vitest"), "lift-@vitest-coverage-v8.log", True),
        (("pluggy",), "lift-pluggy.log", True)
    ]


def test_a_hold_naming_no_listed_pin_exits_two_before_any_attempt(
    lagging     : Lagging,
    monkeypatch : MonkeyPatch
):
    """
    Asserts that a hold naming a pin the table lists nowhere exits with
    status 2, naming each such pin on standard error and no pin the table
    lists, before any trial or write.
    """
    attempts, applied = lagging(lagging_three())
    monkeypatch.setattr("scotch.cli.lift.stderr", stderr := StringIO())

    assert invoke(
        "lift",
        "pins",
        "--try",
        "--write",
        "--hold",
        "polars",
        "--hold",
        "pydantic"
    ) == 2
    assert stderr.getvalue() == "The table lists no pin named pydantic\n"
    assert (attempts, applied) == ([], [])


@mark.parametrize("hold", ["@vitest/coverage-v8", "vitest"])
def test_a_hold_naming_one_pin_of_a_coupled_pair_holds_both(
    hold    : str,
    lagging : Lagging
):
    """
    Asserts that holding either of `vitest` and `@vitest/coverage-v8` leaves
    both out of the trial.
    """
    attempts, _ = lagging(coupled_pair())

    assert invoke("lift", "pins", "--try", "--hold", hold) == 0
    assert attempts == [(("pluggy",), "trial.log", True)]


def test_a_lift_no_longer_applying_exits_naming_the_apply(
    lagging     : Lagging,
    monkeypatch : MonkeyPatch
):
    """
    Asserts that a write whose diff no longer applies to the checkout, since
    a file it changes changed while the lift ran, ends the run naming the
    `git apply` and what it printed to standard error.
    """
    lagging(lagging_three())

    def stale(self: Tree, patch: bytes) -> tuple[str, ...]:
        """
        Raises the error `git apply` raises on a file that changed.
        """
        raise CalledProcessError(
            1,
            ["git", "apply"],
            stderr = b"error: patch failed: pyproject.toml:3\n"
        )

    monkeypatch.setattr(Tree, "apply", stale)

    assert invoke("lift", "pins", "--write") == (
        "`git apply` exited with status 1\nerror: patch failed: pyproject.toml:3"
    )


@mark.parametrize(
    ("hold", "breaking", "reruns", "held", "written"),
    [
        param(
            (),
            {"polars"},
            [
                (("actions/checkout",), "lift-actions-checkout.log", True),
                (("actions/checkout", "pluggy"), "lift-pluggy.log", True)
            ],
            [("polars", "trial.log")],
            b"actions/checkout,pluggy",
            id = "one-failing"
        ),
        param(
            (),
            {"actions/checkout", "polars"},
            [
                (("actions/checkout",), "lift-actions-checkout.log", True),
                (("pluggy",), "lift-pluggy.log", True),
                (("pluggy", "polars"), "lift-polars.log", True)
            ],
            [
                ("actions/checkout", "lift-actions-checkout.log"),
                ("polars", "lift-polars.log")
            ],
            b"pluggy",
            id = "two-failing"
        ),
        param(
            ("--hold", "actions/checkout"),
            {"polars"},
            [(("pluggy",), "lift-pluggy.log", True)],
            [("polars", "trial.log")],
            b"pluggy",
            id = "one-held"
        )
    ]
)
def test_a_failing_trial_tries_each_lift_in_turn_and_writes_those_passing(
    breaking : set[str],
    capsys   : CaptureFixture[str],
    held     : list[tuple[str, str]],
    hold     : tuple[str, ...],
    lagging  : Lagging,
    reruns   : list[Attempt],
    sample   : Sample,
    written  : bytes
):
    """
    Asserts that a trial failing with every pin lifted runs again for each
    lift the reader did not hold, in the table's order and each under a log
    named for it, on top of the lifts already passing, prints one line for
    each lift it holds back naming the failing command and the log, the last
    lift tried with none held before it taking the first trial's log rather
    than running that trial again, and writes the last passing trial's diff.
    """
    attempts, applied = lagging(lagging_three(), breaking=breaking)
    lifted            = tuple(
        name for name in ("actions/checkout", "pluggy", "polars") if name not in hold
    )
    logs = sample.root / ".cache" / "lift"

    assert invoke("lift", "pins", "--try", "--write", *hold) == 0
    assert [
        line
        for line in capsys.readouterr().out.splitlines()
        if line.startswith("Held back")
    ] == [
        f"Held back `{name}`, whose trial fails `mise run repo:ci`, logged in "
        f"{logs / log}"
        for name, log in held
    ]
    assert attempts == [(lifted, "trial.log", True), *reruns]
    assert applied == [written]


def test_a_lone_failing_lift_is_held_back_without_a_second_trial(
    capsys  : CaptureFixture[str],
    lagging : Lagging,
    sample  : Sample
):
    """
    Asserts that a trial failing on its one lift holds that lift back on
    the trial's own failure, running no second attempt, and exits naming the
    folder the logs land in.
    """
    attempts, applied = lagging(lagging_three()[:1], breaking={"polars"})
    logs              = sample.root / ".cache" / "lift"

    assert invoke("lift", "pins", "--try", "--write") == (
        f"No lift passes its trial, logged under {logs}"
    )
    assert capsys.readouterr().out.splitlines()[-1] == (
        "Held back `polars`, whose trial fails `mise run repo:ci`, logged in "
        f"{logs / 'trial.log'}"
    )
    assert (attempts, applied) == ([(("polars",), "trial.log", True)], [])


@mark.parametrize(
    ("flags", "made"),
    [
        param(("--write",), "write.log", id="write"),
        param(("--try", "--write"), "trial.log", id="trial-then-write")
    ]
)
def test_a_write_applies_one_diff(
    capsys  : CaptureFixture[str],
    flags   : tuple[str, ...],
    lagging : Lagging,
    made    : str
):
    """
    Asserts that a write relocks the lift in one unchecked attempt and
    applies its diff, or, after a passing trial, applies the trial's diff
    with no second attempt, naming each file the diff changes.
    """
    attempts, applied = lagging(lagging_three())

    assert invoke("lift", "pins", *flags) == 0
    assert capsys.readouterr().out.endswith("Lifted pyproject.toml\n")
    assert attempts == [
        (("actions/checkout", "pluggy", "polars"), made, made == "trial.log")
    ]
    assert applied == [b"actions/checkout,pluggy,polars"]


def test_a_passing_trial_lifts_every_pin_not_held(
    capsys  : CaptureFixture[str],
    lagging : Lagging
):
    """
    Asserts that a trial lifts every pin but the held ones in one checked
    attempt logged as `trial.log`, says the lift passes, and writes nothing.
    """
    attempts, applied = lagging(lagging_three())

    assert invoke("lift", "pins", "--try", "--hold", "pluggy") == 0
    assert capsys.readouterr().out.endswith("The lift passes `mise ci`\n")
    assert attempts == [(("actions/checkout", "polars"), "trial.log", True)]
    assert applied == []


@mark.parametrize(
    "hold",
    [param((), id="nothing-lagging"), param(("--hold", "uv"), id="everything-held")]
)
def test_nothing_left_to_lift_tries_and_writes_nothing(
    hold    : tuple[str, ...],
    lagging : Lagging
):
    """
    Asserts that where no pin lags, or every pin that lags is held, the
    command exits zero with no attempt, even where `--try` and `--write`
    are given.
    """
    attempts, applied = lagging(
        [Lift(
            current = "0.12.13",
            name    = "uv",
            newest  = "0.13.5",
            path    = ".mise/config.toml"
        )] if hold else []
    )

    assert invoke("lift", "pins", "--try", "--write", *hold) == 0
    assert (attempts, applied) == ([], [])


def test_a_tool_answer_failing_its_record_exits_naming_it(
    lagging     : Lagging,
    monkeypatch : MonkeyPatch
):
    """
    Asserts that a tool's answer failing to validate as its record ends the
    run with the validation error naming the record.
    """
    lagging([])

    def failing() -> list[Lift]:
        """
        Builds a lift from an answer naming no versions.
        """
        return [Lift.model_validate({"name": "uv", "path": "uv.lock"})]

    monkeypatch.setattr(
        "scotch.cli.lift.Pins",
        SimpleNamespace(
            __subclasses__ = lambda: [lambda tree: SimpleNamespace(lifts=failing)]
        )
    )

    assert invoke("lift", "pins").startswith("2 validation errors for Lift\n")


def test_a_trial_no_lift_passes_exits_writing_nothing(
    lagging : Lagging,
    sample  : Sample
):
    """
    Asserts that a trial where every lift fails on its own exits naming the
    folder the logs land in and writes nothing.
    """
    _, applied = lagging(
        lagging_three(),
        breaking = {"actions/checkout", "pluggy", "polars"}
    )

    assert invoke("lift", "pins", "--try", "--write") == (
        f"No lift passes its trial, logged under {sample.root / '.cache' / 'lift'}"
    )
    assert applied == []


def test_the_command_prints_the_table_of_every_lagging_pin(
    capsys   : CaptureFixture[str],
    lagging  : Lagging,
    snapshot : SnapshotAssertion
):
    """
    Asserts that the command prints the table of the lifts it reads, each
    age counted up to the day it runs, and exits zero, trying and writing
    nothing where neither `--try` nor `--write` is given.
    """
    attempts, applied = lagging(lagging_three())

    assert invoke("lift", "pins") == 0
    assert capsys.readouterr().out == snapshot
    assert (attempts, applied) == ([], [])
