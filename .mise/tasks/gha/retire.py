#!/usr/bin/env python3
# MISE description = "Delete each store file R2 holds past the newest earlier ones"
"""
Deletes each store file the R2 bucket holds past the newest earlier ones,
which the `🪣 Publish` job of `♟️ Store` runs once the manifest naming the
new file is up, so a reader holding an earlier manifest still finds the file
it names.

The job runs this script on the runner's own `python3` and the AWS CLI
it carries, which reads the endpoint, the region, and the keys from the
environment the job sets, so it imports the standard library alone.
"""

from dataclasses import dataclass
from datetime    import datetime
from json        import loads
from operator    import attrgetter
from subprocess  import run
from sys         import argv
from typing      import Self


@dataclass(frozen=True, kw_only=True)
class Object:
    """
    One object `aws s3api list-objects-v2` reports.
    """

    key: str
    """
    The object's name in the bucket.
    """

    modified: datetime
    """
    The instant R2 last wrote the object.
    """


@dataclass(frozen=True, kw_only=True)
class Bucket:
    """
    The objects the bucket holds.
    """

    name: str
    """
    The bucket's name.
    """

    objects: tuple[Object, ...]
    """
    Each object, in the order the listing reports them.
    """

    kept: int = 3
    """
    The earlier store files left in place beside the one the manifest names.
    """

    @classmethod
    def from_aws(cls, name: str) -> Self:
        """
        Lists the objects of the bucket `name` through `aws s3api
        list-objects-v2`, which follows every page of the listing and whose
        `--query` renames each field to the one `Object` declares, printing
        `null` for a bucket holding none.
        """
        listing = run(
            [
                "aws", "s3api", "list-objects-v2",
                "--bucket", name, "--output",
                "json", "--query", "Contents[].{key: Key, modified: LastModified}"
            ],
            capture_output = True,
            check          = True,
            text           = True
        )
        return cls(
            name    = name,
            objects = tuple(
                Object(
                    key      = entry["key"],
                    modified = datetime.fromisoformat(entry["modified"])
                )
                for entry in loads(listing.stdout) or ()
            )
        )

    def retire(self, store: str):
        """
        Deletes each object `superseded` lists through `aws s3api
        delete-object`.
        """
        for entry in self.superseded(store):
            run(
                [
                    "aws", "s3api", "delete-object", "--bucket",
                    self.name, "--key", entry.key
                ],
                check = True
            )

    def superseded(self, store: str) -> tuple[Object, ...]:
        """
        Lists every object but `manifest.json`, the store file `store`
        names, and the `kept` newest of the rest, newest first.
        """
        earlier = sorted(
            (
                entry
                for entry in self.objects
                if entry.key not in {"manifest.json", store}
            ),
            key     = attrgetter("modified"),
            reverse = True
        )
        return tuple(earlier[self.kept:])


if __name__ == "__main__":
    Bucket.from_aws(argv[1]).retire(argv[2])
