#!/usr/bin/env python3
# MISE description = "Delete each tool cache and Cargo cache a newer one replaced"
"""
Deletes each Actions cache entry a newer entry replaced, which the `🧹
Prune` job of `♟️ Warm` runs once every Kit job and Cargo job has succeeded.

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
    The key the entry was saved under, which for a tool cache ends on the
    hash of the tool subset and then the hash of the mise config and
    lockfile, and for a Cargo cache ends on the runner's system and
    architecture, the hash of the Rust toolchain and environment, and then
    the hash of the crate's manifest and lockfile.
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
        Pairs the ref with the part of the key every save of one cache
        shares, so each newer save shares a lineage with the saves
        it replaced:

        - For a tool cache, the hash of the tool subset, the second-to-last
          field of the key `jdx/mise-action` writes, whichever mise version
          or runner image an older key names
        - For a Cargo cache, the key `Swatinem/rust-cache` writes up to its
          two trailing hashes, whichever toolchain or crate lockfile an
          older key was saved under
        """
        fields = self.key.split("-")

        if self.key.startswith("v0-rust-"):
            return self.ref, "-".join(fields[:-2])

        return self.ref, fields[-2]


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
        Lists the repository's entries `jdx/mise-action` and
        `Swatinem/rust-cache` saved, whose keys open on the `mise-v1-`
        and `v0-rust-` prefixes they write, through `gh cache list`, whose
        `--jq` filter renames each field to the one `Entry` declares.
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
        return cls(
            entries = tuple(
                Entry(**entry)
                for entry in loads(listing.stdout)
                if entry["key"].startswith(("mise-v1-", "v0-rust-"))
            )
        )

    def prune(self):
        """
        Deletes each superseded entry through `gh cache delete`.
        """
        for entry in self.superseded:
            run(["gh", "cache", "delete", str(entry.id)], check=True)


if __name__ == "__main__":
    Store.from_gh().prune()
