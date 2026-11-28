# Holding a New Release

Which release of a dependency does a lockfile accept, and how is the hold lifted for a security fix? Each resolver the repository runs keeps a release out of its lockfile until the release is three days old, so a compromised or broken release that its registry or its authors withdraw within that time never reaches `uv.lock`, `docs/bun.lock`, or `rust/Cargo.lock`.

## The Window

The window is three days in each resolver, written in the unit the resolver reads:

| **Resolver** | **Setting** | **File** | **Value** |
|---|---|---|---|
| uv | `exclude-newer` | `pyproject.toml`, and the inline metadata of each task script | `"3 days"` |
| bun | `minimumReleaseAge` | `docs/bunfig.toml` | `259200` seconds |
| Cargo | `global-min-publish-age` | `.cargo/config.toml` | `"3 days"` |

uv records the span in its lockfile and never a date, so `uv lock --check` keeps passing on an unchanged lock as the window moves. Cargo reads its configuration from every directory a task runs it in up to the repository root, so the file at the root covers a task started in `rust/` as well.

`mise run repo:audit` fails where `pyproject.toml` sets a window other than three days, and where a resolver's setting is missing or disagrees with it.

## Lifting a Pin

`mise run lock:lift` lists every pin lagging its newest release. A release younger than the window stays out of `--try` and `--write`, and the `Clears` column holds the instant the window ends.

A release that clears an advisory the table names lifts at once, by exempting that package alone:

| **Resolver** | **Exemption** |
|---|---|
| uv | `exclude-newer-package`, naming the package with `false` or a later timestamp, written beside the pin |
| bun | `minimumReleaseAgeExcludes`, naming `name@version`, written to `docs/bunfig.toml` |
| Cargo | `resolver.incompatible-publish-age="allow"` on the one `cargo update --precise` that moves the crate, never written to a file |

`mise run repo:audit` fails on a uv or bun exemption whose release has aged past the window, or that exempts more than the one release, so an exemption does not outlast the need for it.
