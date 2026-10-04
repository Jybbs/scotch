#!/usr/bin/env python3
# MISE description = "Delete each tool cache a newer one replaced"
"""
Deletes each Actions cache entry a newer entry replaced, which the `🧹
Prune` job of `♟️ Warm` runs once every Kit job has finished.

The job runs this script on the runner's own `python3` and the `gh` it
carries, so it imports the standard library alone.
"""

from dataclasses import dataclass
from json        import loads
from operator    import attrgetter
from subprocess  import run
from typing      import Self


@dataclass(frozen=True, kw_only=True)
class Entry:
    """
    One entry `gh cache list` reports.
    """

    created: str
    """
    The instant GitHub saved the entry, as an RFC 3339 timestamp in UTC,
    which sorts in time order as text.
    """

    id: int
    """
    The number `gh cache delete` takes.
    """

    key: str
    """
    The key the entry was saved under, ending on the hash of the tool subset
    and then the hash of the mise config and lockfile.
    """

    ref: str
    """
    The ref the entry was saved from, whose runs restore it beside the runs
    of every pull request based on it and, for the default branch, every run
    in the repository.
    """

    @property
    def lineage(self) -> tuple[str, str]:
        """
        Pairs the ref with the hash of the tool subset, the second-to-last
        field of the key `jdx/mise-action` writes, so each newer save of one
        tool subset shares a lineage with the saves it replaced, whichever
        mise version or runner image an older key names.
        """
        return self.ref, self.key.split("-")[-2]


@dataclass(frozen=True, kw_only=True)
class Store:
    """
    The Actions cache entries the repository holds.
    """

    entries: tuple[Entry, ...]
    """
    Each entry, in the order `gh cache list` reports them.
    """

    @property
    def superseded(self) -> tuple[Entry, ...]:
        """
        Lists every entry but the newest of its lineage.
        """
        newest = {entry.lineage: entry for entry in sorted(
            self.entries,
            key = attrgetter("created")
        )}

        return tuple(
            entry for entry in self.entries if entry is not newest[entry.lineage]
        )

    @classmethod
    def from_gh(cls) -> Self:
        """
        Lists the repository's entries through `gh cache list`, whose `--jq`
        filter renames each field to the one `Entry` declares.
        """
        listing = run(
            [
                "gh", "cache", "list",
                "--jq", "map({created: .createdAt, id, key, ref})", "--json",
                "createdAt,id,key,ref", "--limit", "1000"
            ],
            capture_output = True,
            check          = True,
            text           = True
        )
        return cls(entries=tuple(Entry(**entry) for entry in loads(listing.stdout)))

    def prune(self):
        """
        Deletes each superseded entry through `gh cache delete`.
        """
        for entry in self.superseded:
            run(["gh", "cache", "delete", str(entry.id)], check=True)


if __name__ == "__main__":
    Store.from_gh().prune()
