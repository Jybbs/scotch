"""
Pins what a `Tree` runs, meaning the environment a scrubbed tree starts each
command with, the folders each clone installs into, the audit statuses it
reads as a report, the log each command writes, the steps a lift runs in
turn, the clone a trial runs in, the diff an attempt returns, and the files
an applied patch changes.
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

from scotch.pins.schemas import Edit, Failure, Lift, Spelling
from scotch.pins.trees   import Tree


@contextmanager
def cloned(tree: Tree) -> Iterator[Tree]:
    """
    Stands the tree itself in for its clone.
    """
    yield tree


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
    ("relocks", "upgraded", "ran", "failed"),
    [
        param("", True, 7, None, id="every-step"),
        param("", False, 7, None, id="no-upgrade"),
        param("lock:sync", True, 4, "mise run lock:sync", id="failing-relock"),
        param(
            "--lockfile-only",
            True,
            5,
            "mise exec -- bun update --cwd=docs --lockfile-only",
            id = "failing-update"
        ),
        param("repo:audit", True, 7, "mise run repo:audit", id="failing-audit")
    ],
    indirect = ["relocks"]
)
def test_a_lift_runs_each_step_in_turn_until_one_fails(
    failed   : str | None,
    fp       : FakeProcess,
    ran      : int,
    relocks  : list[list[str]],
    tmp_path : Path,
    tree     : Tree,
    upgraded : bool
):
    """
    Asserts that a lift rewrites each version its lifts' edits name,
    then locks and installs the tools, relocks `uv.lock` upgrading each
    package a lift moves, relocks every lockfile, upgrades each version
    `docs/bun.lock` resolves within its range, renders the files restating
    a pin, and audits the tree, in that order, logging each command, running
    no step after one that fails, and naming the step that failed.
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
        assert tree.lift(handle, lifts) == failed

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


@mark.parametrize(("status", "failed"), [param(0, None), param(1, "mise run repo:ci")])
def test_a_check_runs_every_check_a_pull_request_runs(
    failed   : str | None,
    fp       : FakeProcess,
    status   : int,
    tmp_path : Path,
    tree     : Tree
):
    """
    Asserts that a check runs `repo:ci` in the tree and names it where it
    fails.
    """
    fp.register(["mise", "-C", tree.root, "run", "repo:ci"], returncode=status)

    with (tmp_path / "log").open("w") as handle:
        assert tree.check(handle) == failed


@mark.parametrize(
    ("changes", "credential"),
    [param(b"diff", "gh auth token", id="changed"), param(b"", "", id="clean")]
)
def test_a_clone_carries_the_working_tree_and_stages_it(
    changes    : bytes,
    credential : str,
    fp         : FakeProcess,
    tree       : Tree
):
    """
    Asserts that a clone shares the tree's objects, applies each change
    the working tree holds against `HEAD` where it holds any, copies each
    untracked file git does not ignore, stages everything, and is removed
    once the block ends, keeping the tree's environment while pointing the
    mise, rustup, and Cargo folders under the tree's own `.cache/mise/`,
    carrying the GitHub credential command the tree's mise settings give,
    empty where they give none, and adding its own root to the mise configs
    the tree already trusts.
    """
    tree = tree.model_copy(
        update = {
            "environment": {**tree.environment, "MISE_TRUSTED_CONFIG_PATHS": "/trusted"}
        }
    )
    (tree.root / "notes" / "draft.txt").parent.mkdir()
    (tree.root / "notes" / "draft.txt").write_text("draft")
    fp.register(
        ["mise", "-C", tree.root, "settings", "get", "github.credential_command"],
        stdout = f"{credential}\n"
    )
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
            **tree.homes,
            "MISE_GITHUB_CREDENTIAL_COMMAND" : credential,
            "MISE_TRUSTED_CONFIG_PATHS"      : f"/trusted{pathsep}{clone.root}"
        }

    assert not clone.root.exists()
    assert fp.call_count(["git", "apply", "--binary"]) == int(bool(changes))
    assert fp.call_count(["git", "add", "--all"]) == 1


@mark.parametrize(
    ("lift_failure", "checked", "check_failure", "patch"),
    [
        param(None, True, None, b"lifted", id="passing-trial"),
        param(None, True, "mise run repo:ci", "mise run repo:ci", id="failing-trial"),
        param(
            "mise run lock:sync",
            True,
            None,
            "mise run lock:sync",
            id = "failing-lift"
        ),
        param(None, False, "mise run repo:ci", b"lifted", id="write-without-a-trial")
    ]
)
def test_an_attempt_returns_the_diff_only_where_every_step_passes(
    check_failure : str | None,
    checked       : bool,
    fp            : FakeProcess,
    lift_failure  : str | None,
    monkeypatch   : MonkeyPatch,
    patch         : bytes | str,
    tree          : Tree
):
    """
    Asserts that an attempt returns the diff its clone holds once the lift
    passes and, where it is checked, once `mise ci` passes there too, and
    otherwise the command that failed beside the log, checking nothing after
    a failing lift or where it is not checked, and creating the folder its
    log lands in.
    """
    checks = []

    def check(self: Tree, handle: TextIO) -> str | None:
        """
        Records the check and returns the failing command the case sets.
        """
        checks.append(handle)

        return check_failure

    monkeypatch.setattr(Tree, "clone", cloned)
    monkeypatch.setattr(Tree, "lift", lambda self, handle, lifts: lift_failure)
    monkeypatch.setattr(Tree, "check", check)
    fp.register(["git", "diff", "--binary"], stdout=b"lifted")
    log = tree.logs / "trial.log"

    assert tree.attempt([], log, checked=checked) == (
        patch if isinstance(patch, bytes) else Failure(command=patch, log=log)
    )
    assert len(checks) == int(lift_failure is None and checked)
    assert log.exists()


def test_the_homes_keep_every_install_under_the_trees_own_cache(tree: Tree):
    """
    Asserts that each folder mise, rustup, and Cargo install or cache into
    lands under the tree's `.cache/mise/`, never under the default mise
    data, state, cache, or config folder, `~/.rustup`, or `~/.cargo`.
    """
    folder = tree.root / ".cache" / "mise"

    assert tree.homes == {
        "CARGO_HOME"      : str(folder / "cargo"),
        "MISE_CACHE_DIR"  : str(folder / "cache"),
        "MISE_CONFIG_DIR" : str(folder / "config"),
        "MISE_DATA_DIR"   : str(folder / "data"),
        "MISE_STATE_DIR"  : str(folder / "state"),
        "RUSTUP_HOME"     : str(folder / "rustup")
    }


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
