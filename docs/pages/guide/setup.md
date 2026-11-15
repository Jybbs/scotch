# Setting Up

This walkthrough takes a fresh clone of the repository to a built store, the point every match starts from, and [Matching a Game](matching.md) carries on from there with a game of your own. Each step below names the command it runs, and each output it quotes is written by `mise run docs:render`.

## The Install Steps

*Scotch* runs from a clone of its repository, with [mise](https://mise.jdx.dev) installing the tools `.mise/config.toml` pins, the Python interpreter and [uv](https://docs.astral.sh/uv/) among them. After [installing mise](https://mise.jdx.dev/installing-mise.html), the commands below clone the repository, print the help of the `scotch` command, and report anything the clone still needs:

<!-- install -->
```bash
git clone --filter=blob:none https://github.com/Jybbs/scotch.git
mise trust scotch
mise -C scotch install
cd scotch
scotch --help
mise doctor project
```
<!-- /install -->

Each line does what the list below sets out, written from the package's own metadata by `mise run docs:render`:

<!-- steps -->
1. `git clone --filter=blob:none https://github.com/Jybbs/scotch.git` clones the repository, leaving out every earlier layout of the game store the history keeps, which git downloads only where a checkout reaches it
2. `mise trust scotch` marks the clone's `.mise/config.toml` trusted, so mise loads it rather than prompting, skipping the file, or failing with an untrusted-config error
3. `mise -C scotch install` installs each tool `.mise/config.toml` pins, the Python interpreter, uv, and the Rust toolchain among them
4. `cd scotch` enters the clone, where mise puts uv and the wrapper at `.mise/bin/scotch` on the path
5. `scotch --help` builds `.venv` from `uv.lock` on the wrapper's first run, compiling the crate under `rust/`, then prints the command's help
6. `mise doctor project` runs each check `.mise/config.toml` declares and prints the step that clears any that fails
<!-- /steps -->

## Checking the Clone

`mise doctor project` runs each check the `[doctor.checks]` tables of `.mise/config.toml` declare, printing `PASS` or `FAIL` beside the check's name and condition, and beneath a failing check the step that clears it, then exits with status 1 where any check fails, as [mise's project diagnostics](https://mise.jdx.dev/configuration/project-diagnostics.html) set out. The table below is written from those tables by `mise run docs:render`.

<!-- checks -->
| **Check** | **Passes Where** | **Prints Where It Fails** |
|---|---|---|
| `venv` | `.venv` exists and runs on the Python interpreter mise pins | `mise x -- uv venv --clear .venv && mise x -- uv sync` |
<!-- /checks -->

## Building the Store

A fresh clone holds no games, so two tasks build the store under `.cache/data`, which git leaves untracked. `mise run data:fetch` runs `scotch fetch games`, downloading each file `src/scotch/sources/sources.toml` declares, and `mise run data:index` runs `scotch index games`, reading every game of those files into the index a match reads. The downloads take <!-- downloads-size -->1.1 GB<!-- /downloads-size --> on disk and the index <!-- index-size -->462.0 MB<!-- /index-size -->, each measured under the data directory by `mise run docs:render`, and [The Store](store.md) sets out what each task writes there.

## A Step That Stops

Each command stops with a message on stderr and a nonzero exit where the clone or the store is not ready for it, such as `scotch index games` before any file is fetched or `scotch match game` before the index is built. [The Commands](../reference/commands.md) sets out every message each command exits on and the step that clears it, under [`scotch fetch games`](../reference/commands.md#scotch-fetch-games), [`scotch index games`](../reference/commands.md#scotch-index-games), and [`scotch match game`](../reference/commands.md#scotch-match-game).

With the index built, [Matching a Game](matching.md) matches a game of your own against it.
