"""
Pins what a `Tree` runs, meaning the environment a scrubbed tree starts each
command with, the audit statuses it reads as a report, the log each command
writes, the steps a lift runs in turn, the clone a trial runs in, the diff
an attempt returns, and the files an applied patch changes.
"""

from collections.abc import Iterator
from common.sample   import Sample
from contextlib      import contextmanager
from os              import pathsep
from pathlib         import Path
from pytest          import MonkeyPatch, mark, param, raises
from pytest_subprocess.fake_process import FakeProcess
from subprocess import CalledProcessError
from typing     import TextIO

from scotch.pins.schemas import Edit, Lift, Spelling
from scotch.pins.trees   import Tree


def called(fp: FakeProcess) -> list[list[str]]:
    """
    Reads each command `fp` answered, in the order it was run, with each
    path written as text.
    """
    return [list(map(str, call)) for call in fp.calls]


@mark.parametrize("status", [0, 1])
def test_an_audit_reads_a_clean_and_a_flagged_run_as_its_report(
    fp     : FakeProcess,
    status : int,
    tree   : Tree
):
    """
    Asserts that an audit returns what it prints, whether it exits zero or
    exits 1 for an advisory it reports.
    """
    fp.register(
        ["mise", "-C", tree.root, "exec", "--", "uv", "audit"],
        returncode = status,
        stdout     = "{}"
    )

    assert tree.audit("uv", "audit") == "{}"


@mark.parametrize(("status", "passed"), [param(0, True), param(3, False)])
def test_a_logged_command_writes_itself_and_its_output(
    passed   : bool,
    status   : int,
    tmp_path : Path,
    tree     : Tree
):
    """
    Asserts that a logged command writes its own line and then everything
    it prints to either stream into the log, and reports whether it exited
    zero.
    """
    with (tmp_path / "log").open("w") as handle:
        assert tree.log(
            handle,
            "sh",
            "-c",
            f"echo out; echo err >&2; exit {status}"
        ) is passed

    assert (tmp_path / "log").read_text() == (
        f"$ sh -c 'echo out; echo err >&2; exit {status}'\nout\nerr\n"
    )


@mark.parametrize(
    ("relocks", "upgraded", "ran", "passed"),
    [
        param("", True, 6, True, id="every-step"),
        param("", False, 6, True, id="no-upgrade"),
        param("lock:sync", True, 4, False, id="failing-relock"),
        param("repo:audit", True, 6, False, id="failing-audit")
    ],
    indirect = ["relocks"]
)
def test_a_lift_runs_each_step_in_turn_until_one_fails(
    fp       : FakeProcess,
    passed   : bool,
    ran      : int,
    relocks  : list[list[str]],
    tmp_path : Path,
    tree     : Tree,
    upgraded : bool
):
    """
    Asserts that a lift rewrites each version its lifts' edits name, then
    locks and installs the tools, relocks `uv.lock` upgrading each package
    a lift moves, relocks every lockfile, renders the files restating a pin,
    and audits the tree, in that order, logging each command and running no
    step after one that fails.
    """
    lifts = [
        Lift(
            current = "0.12.13",
            edits   = (
                Edit(
                    name     = "uv",
                    path     = Path(".mise/config.toml"),
                    spelling = Spelling.ASSIGNMENT,
                    version  = "0.13.5"
                ),
            ),
            name   = "uv",
            newest = "0.13.5",
            path   = Path(".mise/config.toml")
        ),
        *(
            [
                Lift(
                    current  = "2.24.0",
                    name     = "minijinja",
                    newest   = "3.0.3",
                    path     = Path("uv.lock"),
                    upgraded = True
                )
            ]
            if upgraded
            else []
        )
    ]

    with (tmp_path / "log").open("w") as handle:
        assert tree.lift(handle, lifts) is passed

    assert called(fp) == relocks[:ran]
    assert 'uv     = "0.13.5"' in (tree.root / ".mise" / "config.toml").read_text()
    assert (tmp_path / "log").read_text().splitlines()[0] == (
        f"$ mise -C {tree.root} lock"
    )


def test_a_path_inside_the_tree_reads_relative_to_its_root(tree: Tree):
    """
    Asserts that a path under the tree's root reads relative to it.
    """
    assert tree.relative(tree.root / ".mise" / "config.toml") == Path(
        ".mise/config.toml"
    )


def test_a_scrubbed_tree_drops_what_the_run_put_in_its_environment(sample: Sample):
    """
    Asserts that a scrubbed tree starts each command without the variables
    `uv run` and `mise run` set, without each variable the checkout's
    `[env]` block sets, and without each folder inside the checkout on
    `PATH`, keeping every other variable and folder as it stood.
    """
    sample.edit(".mise/config.toml", new='[env]\nUV_LOCKED = "1"', old="[env]")
    root = sample.root
    tree = Tree.scrubbed(
        sample.checkout,
        {
            "HOME"              : "/home",
            "MISE_CONFIG_ROOT"  : str(root),
            "MISE_ORIGINAL_CWD" : str(root),
            "MISE_PROJECT_ROOT" : str(root),
            "MISE_TASK_NAME"    : "lock:lift",
            "PATH"              : f"{root}/.venv/bin:{root}/.mise/bin:/usr/bin",
            "UV"                : "/bin/uv",
            "UV_LOCKED"         : "1",
            "UV_RUN_RECURSION_DEPTH" : "1",
            "VIRTUAL_ENV"            : f"{root}/.venv"
        }
    )

    assert tree.environment == {"HOME": "/home", "PATH": "/usr/bin"}
    assert (tree.root, tree.logs) == (root, root / ".cache" / "lift")


@mark.parametrize(("status", "passed"), [param(0, True), param(1, False)])
def test_a_check_runs_every_check_a_pull_request_runs(
    fp       : FakeProcess,
    passed   : bool,
    status   : int,
    tmp_path : Path,
    tree     : Tree
):
    """
    Asserts that a check runs `repo:ci` in the tree and reports whether
    it passed.
    """
    fp.register(["mise", "-C", tree.root, "run", "repo:ci"], returncode=status)

    with (tmp_path / "log").open("w") as handle:
        assert tree.check(handle) is passed


@mark.parametrize("changes", [param(b"diff", id="changed"), param(b"", id="clean")])
def test_a_clone_carries_the_working_tree_and_stages_it(
    changes : bytes,
    fp      : FakeProcess,
    tree    : Tree
):
    """
    Asserts that a clone shares the tree's objects, applies each change
    the working tree holds against `HEAD` where it holds any, copies each
    untracked file git does not ignore, stages everything, and is removed
    once the block ends, keeping the tree's environment while adding its own
    root to the mise configs the tree already trusts.
    """
    tree = tree.model_copy(
        update = {
            "environment": {**tree.environment, "MISE_TRUSTED_CONFIG_PATHS": "/trusted"}
        }
    )
    (tree.root / "notes" / "draft.txt").parent.mkdir()
    (tree.root / "notes" / "draft.txt").write_text("draft")
    fp.register(["git", "diff", "--binary", "HEAD"], stdout=changes)
    fp.register(
        ["git", "clone", "--quiet", "--shared", tree.root, fp.any(max=1, min=1)],
        callback = lambda process: Path(process.args[-1]).mkdir()
    )
    fp.register(["git", "apply", "--binary"])
    fp.register(
        ["git", "ls-files", "--exclude-standard", "--others", "-z"],
        stdout = "notes/draft.txt\0"
    )
    fp.register(["git", "add", "--all"])

    with tree.clone() as clone:
        assert clone.root.name == tree.root.name
        assert clone.root != tree.root
        assert (clone.root / "notes" / "draft.txt").read_text() == "draft"
        assert clone.environment == {
            **tree.environment,
            "MISE_TRUSTED_CONFIG_PATHS": f"/trusted{pathsep}{clone.root}"
        }

    assert not clone.root.exists()
    assert fp.call_count(["git", "apply", "--binary"]) == int(bool(changes))
    assert fp.call_count(["git", "add", "--all"]) == 1


@mark.parametrize(
    ("lifted", "checked", "verdict", "patch"),
    [
        param(True, True, True, b"lifted", id="passing-trial"),
        param(True, True, False, None, id="failing-trial"),
        param(False, True, True, None, id="failing-lift"),
        param(True, False, False, b"lifted", id="write-without-a-trial")
    ]
)
def test_an_attempt_returns_the_diff_only_where_every_step_passes(
    checked     : bool,
    fp          : FakeProcess,
    lifted      : bool,
    monkeypatch : MonkeyPatch,
    patch       : bytes | None,
    tree        : Tree,
    verdict     : bool
):
    """
    Asserts that an attempt returns the diff its clone holds once the lift
    passes and, where it is checked, once `mise ci` passes there too, and
    returns `None` otherwise, checking nothing after a failing lift or where
    it is not checked, and creating the folder its log lands in.
    """
    checks = []

    @contextmanager
    def cloned(self: Tree) -> Iterator[Tree]:
        """
        Stands the tree itself in for its clone.
        """
        yield self

    def check(self: Tree, handle: TextIO) -> bool:
        """
        Records the check and returns the verdict the case sets.
        """
        checks.append(handle)

        return verdict

    monkeypatch.setattr(Tree, "clone", cloned)
    monkeypatch.setattr(Tree, "lift", lambda self, handle, lifts: lifted)
    monkeypatch.setattr(Tree, "check", check)
    fp.register(["git", "diff", "--binary"], stdout=b"lifted")
    log = tree.logs / "trial.log"

    assert tree.attempt([], log, checked=checked) == patch
    assert len(checks) == int(lifted and checked)
    assert log.exists()


@mark.parametrize(
    ("relocks", "upgraded"),
    [param("repo:audit", False, id="failing-audit")],
    indirect = ["relocks"]
)
def test_a_write_failing_its_audit_returns_no_diff(
    fp          : FakeProcess,
    monkeypatch : MonkeyPatch,
    relocks     : list[list[str]],
    tree        : Tree,
    upgraded    : bool
):
    """
    Asserts that the unchecked attempt a bare `--write` makes returns no
    diff where the relocked tree fails `repo:audit`, the last command it
    runs and logs.
    """

    @contextmanager
    def cloned(self: Tree) -> Iterator[Tree]:
        """
        Stands the tree itself in for its clone.
        """
        yield self

    monkeypatch.setattr(Tree, "clone", cloned)
    log = tree.logs / "write.log"

    assert tree.attempt([], log, checked=False) is None
    assert called(fp) == relocks
    assert log.read_text().splitlines()[-1] == f"$ mise -C {tree.root} run repo:audit"


def test_an_applied_patch_lists_each_file_it_changes(fp: FakeProcess, tree: Tree):
    """
    Asserts that applying a patch applies it through one `git apply` that
    prints the files it changes, and lists those files.
    """
    fp.register(
        ["git", "apply", "--binary", "--numstat", "-z", "--apply"],
        stdout = b"1\t1\tpyproject.toml\x002\t2\tuv.lock\x00"
    )

    assert tree.apply(b"diff") == ("pyproject.toml", "uv.lock")


@mark.parametrize("status", [param(2, id="unreachable"), param(-9, id="killed")])
def test_an_audit_exiting_on_an_error_raises(fp: FakeProcess, status: int, tree: Tree):
    """
    Asserts that an audit exiting with any status but 0 and 1 raises,
    such as the 2 `uv audit` exits with where it cannot reach its advisory
    service and the negative status of an audit a signal killed.
    """
    fp.register(
        ["mise", "-C", tree.root, "exec", "--", "uv", "audit"],
        returncode = status,
        stderr     = "unreachable"
    )

    with raises(CalledProcessError) as error:
        tree.audit("uv", "audit")

    assert (error.value.returncode, error.value.stderr) == (status, "unreachable")
