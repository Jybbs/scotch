"""
Pins which Actions cache entries `gha:prune` deletes, keeping the newest
entry of each ref and tool subset and of each ref and Cargo cache, and the
commands it sends GitHub.

Each case loads the script in the test process and answers each command it
runs through pytest-subprocess, so no case reaches GitHub.
"""

from collections.abc                import Callable
from pytest_subprocess.fake_process import FakeProcess
from types import ModuleType


def test_a_store_holding_one_entry_per_lineage_deletes_nothing(
    fp      : FakeProcess,
    listing : Callable[..., None],
    task    : ModuleType
):
    """
    Asserts that a store whose every entry is the newest of its lineage
    sends no delete.
    """
    listing(
        (
            1, "mise-v1-linux-x64-ubuntu26-2026.9.18-aaa-old",
            "refs/heads/main", "2026-09-30T12:00:00Z"
        )
    )

    task.Store.from_gh().prune()

    assert len(fp.calls) == 1


def test_each_entry_a_newer_one_replaced_is_deleted(
    fp      : FakeProcess,
    listing : Callable[..., None],
    task    : ModuleType
):
    """
    Asserts that every entry but the newest of its ref and tool subset,
    or of its ref and Cargo cache, is deleted, in the order the listing
    gives them, an older entry naming another mise version, runner image,
    toolchain, or crate lockfile included, while a tool subset, a Cargo
    cache, or a ref of its own keeps its one entry, and an entry another
    action saved stays.
    """
    listing(
        (
            3, "mise-v1-linux-x64-ubuntu26-2026.9.18-aaa-new",
            "refs/heads/main", "2026-10-02T12:00:00Z"
        ),
        (
            2, "mise-v1-linux-x64-ubuntu26-2026.9.18-aaa-mid",
            "refs/heads/main", "2026-10-01T12:00:00Z"
        ),
        (
            1, "mise-v1-linux-x64-ubuntu26-2026.9.18-aaa-old",
            "refs/heads/main", "2026-09-30T12:00:00Z"
        ),
        (
            4, "mise-v1-linux-x64-ubuntu26-2026.9.18-bbb-old",
            "refs/heads/main", "2026-09-30T12:00:00Z"
        ),
        (
            5, "mise-v1-linux-x64-ubuntu26-2026.9.18-aaa-old",
            "refs/heads/4/ci-gate", "2026-09-29T12:00:00Z"
        ),
        (
            6, "mise-v1-linux-x64-ubuntu24-2026.9.10-aaa-old",
            "refs/heads/main", "2026-09-20T12:00:00Z"
        ),
        (
            7, "v0-rust-scotch-python-Linux-x64-1234abcd-00000002",
            "refs/heads/main", "2026-10-02T12:00:00Z"
        ),
        (
            8, "v0-rust-scotch-python-Linux-x64-5678ef90-00000001",
            "refs/heads/main", "2026-10-01T12:00:00Z"
        ),
        (
            9, "v0-rust-scotch-wasm-Linux-x64-1234abcd-00000001",
            "refs/heads/main", "2026-09-30T12:00:00Z"
        ),
        (
            10, "node-cache-Linux-x64-npm-aaa",
            "refs/heads/main", "2026-09-30T12:00:00Z"
        ),
        (
            11, "node-cache-Linux-x64-npm-bbb",
            "refs/heads/main", "2026-10-01T12:00:00Z"
        )
    )
    fp.register(["gh", "cache", "delete", fp.any()], occurrences=4)

    task.Store.from_gh().prune()

    assert list(fp.calls) == [
        [
            "gh", "cache", "list", "--jq", "map({created: .createdAt, id, key, ref})",
            "--json", "createdAt,id,key,ref", "--limit", "1000"
        ],
        ["gh", "cache", "delete", "2"],
        ["gh", "cache", "delete", "1"],
        ["gh", "cache", "delete", "6"],
        ["gh", "cache", "delete", "8"]
    ]
