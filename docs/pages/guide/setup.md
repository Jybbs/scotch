# Setting Up

This walkthrough takes a fresh clone of the repository to a built store, the point every match starts from, and [Matching a Game](matching.md) carries on from there with a game of your own. Each step below names the command it runs, and each output it quotes is written by `mise run docs:render`.

## The Install Steps

The install steps on the [Guide](index.md) run the commands below from the folder the clone lands in, after [installing mise](https://mise.jdx.dev/installing-mise.html), each written from the package's own metadata by `mise run docs:render`:

<!-- steps -->
1. `git clone --filter=blob:none https://github.com/Jybbs/scotch.git` clones the repository, leaving out every earlier layout of the game store the history keeps, which git downloads only where a checkout reaches it
2. `mise trust scotch` marks the clone's `.mise/config.toml` trusted, so mise loads it rather than prompting, skipping the file, or failing with an untrusted-config error
3. `mise -C scotch install` installs each tool `.mise/config.toml` pins, the Python interpreter, uv, and the Rust toolchain among them
4. `cd scotch` enters the clone, where mise puts uv and the wrapper at `.mise/bin/scotch` on the path
5. `scotch --help` builds `.venv` from `uv.lock` on the wrapper's first run, compiling the crate under `rust/`, then prints the command's help
6. `mise doctor project` runs each check `.mise/config.toml` declares and prints the step that clears any that fails
<!-- /steps -->

## What the Clone Needs

`mise doctor project` runs each check the `[doctor.checks]` tables of `.mise/config.toml` declare, printing `PASS` or `FAIL` beside the check's name and condition, and beneath a failing check the step that clears it, then exits with status 1 where any check fails, as [mise's project diagnostics](https://mise.jdx.dev/configuration/project-diagnostics.html) set out. The table below is written from those tables by `mise run docs:render`.

<!-- checks -->
| **Check** | **Passes Where** | **Prints Where It Fails** |
|---|---|---|
| `venv` | `.venv` exists and runs on the Python interpreter mise pins | `mise x -- uv venv --clear .venv && mise x -- uv sync` |
<!-- /checks -->

## Building the Store

A fresh clone holds no games, so two tasks build the store under `.cache/data`, which git leaves untracked. `mise run data:fetch` runs `scotch fetch games`, downloading each file `src/scotch/sources/sources.toml` declares, and `mise run data:index` runs `scotch index games`, reading every game of those files into the index a match reads. The downloads take <!-- downloads-size -->1.1 GB<!-- /downloads-size --> on disk and the index <!-- index-size -->462.0 MB<!-- /index-size -->, each measured under the data directory by `mise run docs:render`, and [The Store](store.md) sets out what each task writes there.

## Where a Step Stops

Each command below prints the message beside it to stderr and exits nonzero under the condition the table names. The table is written by `mise run docs:render` from `src/scotch/docs/stops.toml`, and each command links its section of [The Commands](../reference/commands.md).

<!-- stops -->
| **Command** | **Message** | **When** | **Clears It** |
|---|---|---|---|
| [`scotch fetch games`](../reference/commands.md#scotch-fetch-games) | `Could not fetch <address>: <error>` | The server answers with an error status, a request fails once every retry has, or the connection breaks while the file downloads | Run the command again once the host answers, or raise `SCOTCH_RETRIES` or `SCOTCH_TIMEOUT_S` |
| [`scotch index games`](../reference/commands.md#scotch-index-games) | `No file has been fetched under <downloads>` | The manifest records no file `sources.toml` declares | Run `scotch fetch games` |
| [`scotch index games`](../reference/commands.md#scotch-index-games) | `` These files changed on disk since their fetch, which `scotch fetch games` downloads again: `` | A fetched file no longer holds the bytes the manifest records | Run `scotch fetch games`, which downloads each file named below the line again |
| [`scotch match game`](../reference/commands.md#scotch-match-game) | `No index has been built under <index>` | The data directory holds no index | Run `scotch index games` |
| [`scotch match game`](../reference/commands.md#scotch-match-game) | `The index under <index> holds another layout` | The index was built in a layout other than the one this version reads | Run `scotch index games`, which rebuilds the index in this layout |
<!-- /stops -->

With the index built, [Matching a Game](matching.md) matches a game of your own against it.
