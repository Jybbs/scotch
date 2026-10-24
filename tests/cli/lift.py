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
    Asserts that a failing trial holds back `vitest` and
    `@vitest/coverage-v8` together in one attempt, named for the first in
    the table's order, and says that holding the two back passes.
    """
    attempts, _ = lagging(coupled_pair(), breaking={"vitest"})

    assert invoke("lift", "pins", "--try") == (
        f"The lift fails its trial, logged under {sample.root / '.cache' / 'lift'}"
    )
    assert capsys.readouterr().out.splitlines()[-1] == (
        "Holding back `@vitest/coverage-v8` and `vitest` passes"
    )
    assert attempts == [
        (("@vitest/coverage-v8", "vitest", "pluggy"), "trial.log", True),
        (("pluggy",), "held-@vitest-coverage-v8.log", True)
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
    ("hold", "reruns", "verdicts"),
    [
        param(
            (),
            [
                (("pluggy", "polars"), "held-actions-checkout.log", True),
                (("actions/checkout", "pluggy"), "held-polars.log", True)
            ],
            [
                "Holding back `actions/checkout` still fails",
                "Holding back `polars` passes"
            ],
            id = "every-major"
        ),
        param(
            ("--hold", "actions/checkout"),
            [(("pluggy",), "held-polars.log", True)],
            ["Holding back `polars` passes"],
            id = "a-major-held"
        )
    ]
)
def test_a_failing_trial_tries_again_holding_back_each_major_in_turn(
    capsys   : CaptureFixture[str],
    hold     : tuple[str, ...],
    lagging  : Lagging,
    reruns   : list[tuple[tuple[str, ...], str, bool]],
    sample   : Sample,
    verdicts : list[str]
):
    """
    Asserts that a trial failing with every pin lifted runs again holding
    back each major lift the reader did not hold, in the table's order
    and each under a log named for it, says whether each passes, and exits
    naming the folder the logs land in.
    """
    attempts, applied = lagging(lagging_three(), breaking={"polars"})
    lifted            = tuple(
        name for name in ("actions/checkout", "pluggy", "polars") if name not in hold
    )

    assert invoke("lift", "pins", "--try", "--write", *hold) == (
        f"The lift fails its trial, logged under {sample.root / '.cache' / 'lift'}"
    )
    assert capsys.readouterr().out.splitlines()[-len(verdicts):] == verdicts
    assert attempts == [(lifted, "trial.log", True), *reruns]
    assert applied == []


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
