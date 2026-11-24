"""
Pins which objects `gha:retire` deletes from the store's bucket, keeping the
manifest, the store file it names, and the three newest earlier store files,
and the commands it sends the AWS CLI.

Each case loads the script in the test process and answers each command it
runs through pytest-subprocess, so no case reaches R2.
"""

from collections.abc import Callable
from pytest          import mark, param
from pytest_subprocess.fake_process import FakeProcess
from types import ModuleType


@mark.parametrize(
    ("current", "listed"),
    [
        param(
            "0000000000000004",
            (
                ("0000000000000001", "2026-11-01T12:00:00+00:00"),
                ("0000000000000002", "2026-11-02T12:00:00+00:00"),
                ("0000000000000003", "2026-11-03T12:00:00+00:00"),
                ("0000000000000004", "2026-11-04T12:00:00+00:00"),
                ("manifest.json", "2026-11-04T12:00:01+00:00")
            ),
            id = "three-earlier-stores"
        ),
        param("0123456789abcdef", (), id="empty")
    ]
)
def test_a_bucket_holding_no_more_than_three_earlier_stores_deletes_nothing(
    current : str,
    fp      : FakeProcess,
    listed  : tuple[tuple[str, str], ...],
    objects : Callable[..., None],
    task    : ModuleType
):
    """
    Asserts that a bucket holding the manifest, the current store, and three
    earlier ones sends no delete, as does one the listing reports as `null`.
    """
    objects(*listed)

    task.Bucket.from_aws("scotch-store").retire(current)

    assert len(fp.calls) == 1


def test_the_three_newest_earlier_stores_stay_beside_the_current_one(
    fp      : FakeProcess,
    objects : Callable[..., None],
    task    : ModuleType
):
    """
    Asserts that every store file but the one the manifest names and the
    three newest of the rest is deleted, newest first, in the order R2
    last wrote them rather than the order the listing gives them, while the
    manifest and the current store stay whatever their age, an instant with
    no fraction of a second included.
    """
    objects(
        ("0000000000000001", "2026-11-01T12:00:00+00:00"),
        ("0000000000000005", "2026-11-05T12:00:00.250000+00:00"),
        ("0000000000000002", "2026-11-02T12:00:00+00:00"),
        ("0000000000000006", "2026-11-06T12:00:00+00:00"),
        ("0000000000000004", "2026-11-04T12:00:00+00:00"),
        ("0000000000000003", "2026-11-03T12:00:00.500000+00:00"),
        ("0000000000000000", "2026-10-01T12:00:00+00:00"),
        ("manifest.json", "2026-10-01T12:00:00+00:00")
    )
    fp.register(["aws", "s3api", "delete-object", fp.any()], occurrences=3)

    task.Bucket.from_aws("scotch-store").retire("0000000000000000")

    assert list(fp.calls) == [
        [
            "aws", "s3api", "list-objects-v2",
            "--bucket", "scotch-store", "--output",
            "json", "--query", "Contents[].{key: Key, modified: LastModified}"
        ],
        [
            "aws", "s3api", "delete-object", "--bucket",
            "scotch-store", "--key", "0000000000000003"
        ],
        [
            "aws", "s3api", "delete-object", "--bucket",
            "scotch-store", "--key", "0000000000000002"
        ],
        [
            "aws", "s3api", "delete-object", "--bucket",
            "scotch-store", "--key", "0000000000000001"
        ]
    ]
