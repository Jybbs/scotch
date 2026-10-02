"""
Pins the verdict `lock:check` reaches for each answer `uv lock --check` and
`mise lock` give it, and that `.mise/mise.lock` keeps its bytes and its mode
whatever the verdict.

Each case runs the task through its own shebang inside a scratch checkout,
with stand-in `mise`, `mktemp`, and `uv` executables first on `PATH`, so
every file the task writes lands in a directory the case owns.
"""

from os         import environ, pathsep
from pathlib    import Path
from pydantic   import BaseModel
from pytest     import Config, fixture, mark
from stat       import S_IMODE
from subprocess import CompletedProcess, run


class Checkout(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    A scratch checkout holding `.mise/mise.lock`, beside the stand-ins
    `lock:check` runs against and the directory its snapshot lands in.
    """

    root: Path
    """
    The directory holding the checkout, the stand-ins, and the scratch
    directory.
    """

    task: Path
    """
    The `lock:check` script the worktree carries.
    """

    text: str = '[[tools.python]]\nversion = "3.14.6"\n'
    """
    The text the checkout's `.mise/mise.lock` starts with.
    """

    @property
    def calls(self) -> list[str]:
        """
        Reads the call each stand-in logged, in the order the task made
        them.
        """
        return (self.root / "calls.log").read_text().splitlines()

    @property
    def lockfile(self) -> Path:
        """
        Locates `.mise/mise.lock` inside the checkout.
        """
        return self.root / "checkout" / ".mise" / "mise.lock"

    @property
    def scratch(self) -> Path:
        """
        Locates the directory the stand-in `mktemp` creates the snapshot in.
        """
        return self.root / "tmp"

    @property
    def stand_ins(self) -> Path:
        """
        Locates the directory holding the stand-in executables, which the
        task finds first on `PATH`.
        """
        return self.root / "bin"

    @property
    def variables(self) -> dict[str, str]:
        """
        Copies the suite's environment with `stand_ins` first on `PATH`.
        """
        return {**environ, "PATH": f"{self.stand_ins}{pathsep}{environ['PATH']}"}

    def check(self, mise: str = "exit 0", uv: str = "exit 0") -> CompletedProcess[str]:
        """
        Runs `lock:check` from the checkout, against stand-in `mise` and
        `uv` executables that each log their call and then run the shell
        line `mise` or `uv` holds.
        """
        for name, line in {"mise": mise, "uv": uv}.items():
            stand_in = self.stand_ins / name
            stand_in.write_text(
                f'#!/bin/sh\necho "{name} $*" >> "{self.root / "calls.log"}"\n{line}\n'
            )
            stand_in.chmod(0o755)

        return run(
            [self.task],
            capture_output = True,
            check          = False,
            cwd            = self.lockfile.parents[1],
            env            = self.variables,
            text           = True
        )


@fixture
def checkout(pytestconfig: Config, tmp_path: Path) -> Checkout:
    """
    Writes a checkout whose `.mise/mise.lock` holds `Checkout.text` at mode
    `0o644`, beside a stand-in `mktemp` that creates the snapshot inside
    `Checkout.scratch` at mode `0o600`, the mode `mktemp` itself creates a
    file at.
    """
    checkout = Checkout(
        root = tmp_path,
        task = pytestconfig.rootpath / ".mise" / "tasks" / "lock" / "check"
    )
    checkout.lockfile.parent.mkdir(parents=True)
    checkout.lockfile.write_text(checkout.text)
    checkout.lockfile.chmod(0o644)
    checkout.scratch.mkdir()
    checkout.stand_ins.mkdir()
    snapshot = checkout.scratch / "snapshot"
    mktemp   = checkout.stand_ins / "mktemp"
    mktemp.write_text(
        f'#!/bin/sh\n: > "{snapshot}"\nchmod 600 "{snapshot}"\necho "{snapshot}"\n'
    )
    mktemp.chmod(0o755)

    return checkout


def test_a_lockfile_matching_its_manifest_passes(checkout: Checkout):
    """
    Asserts that the check exits zero where `uv lock --check` passes and
    `mise lock` leaves `.mise/mise.lock` as it stood, running both and
    leaving no snapshot behind.
    """
    assert checkout.check().returncode == 0
    assert checkout.calls == ["uv lock --check", "mise lock"]
    assert checkout.lockfile.read_text() == checkout.text
    assert list(checkout.scratch.iterdir()) == []


@mark.parametrize(
    "mise",
    ["echo drifted > .mise/mise.lock", "echo partial > .mise/mise.lock; exit 1"],
    ids = ["rewritten", "written-then-failed"]
)
def test_a_lockfile_mise_lock_changes_fails_and_is_restored(
    checkout : Checkout,
    mise     : str
):
    """
    Asserts that the check exits one where `mise lock` changes
    `.mise/mise.lock`, whether `mise lock` exits zero or not, and puts the
    lockfile's bytes and its mode back.
    """
    assert checkout.check(mise=mise).returncode == 1
    assert checkout.lockfile.read_text() == checkout.text
    assert S_IMODE(checkout.lockfile.stat().st_mode) == 0o644
    assert list(checkout.scratch.iterdir()) == []


def test_a_tool_mise_lock_cannot_resolve_fails(checkout: Checkout):
    """
    Asserts that the check exits one where `mise lock` reports a tool it
    failed to resolve while still exiting zero and leaving `.mise/mise.lock`
    as it stood, and that the report reaches standard error.
    """
    result = checkout.check(
        mise = "echo 'mise WARN  failed to resolve python for windows-x64' >&2"
    )

    assert result.returncode == 1
    assert "failed to resolve python for windows-x64" in result.stderr
    assert checkout.lockfile.read_text() == checkout.text


def test_a_uv_lockfile_lagging_its_manifest_fails(checkout: Checkout):
    """
    Asserts that the check exits one where `uv lock --check` fails, stopping
    before `mise lock` runs.
    """
    assert checkout.check(uv="exit 1").returncode == 1
    assert checkout.calls == ["uv lock --check"]
