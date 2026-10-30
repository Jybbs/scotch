# Guide

*Scotch* runs from a clone of its repository, with [mise](https://mise.jdx.dev) installing the tools `.mise/config.toml` pins, the Python interpreter and [uv](https://docs.astral.sh/uv/) among them. After [installing mise](https://mise.jdx.dev/installing-mise.html), the commands below clone the repository, print the help of the `scotch` command, and report anything the clone still needs.

Where PyYAML publishes no wheel for the interpreter `.mise/config.toml` pins, uv builds it from source as it builds `.venv`. That build carries the `CSafeLoader` the package reads the YAML under `.github/` through only where the compiler finds [LibYAML](https://pyyaml.org/wiki/LibYAML), so install LibYAML before cloning:

- On Debian or Ubuntu, through `apt install libyaml-dev`
- On macOS, through `brew install libyaml`, then `export CPATH="$(brew --prefix)/include" LIBRARY_PATH="$(brew --prefix)/lib"`, since the compiler there searches no Homebrew prefix

Wherever PyYAML was built without it, `mise doctor project` names the rebuild.

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

`--filter=blob:none` leaves every earlier layout of the game store the history keeps out of the clone, downloading a file only when a checkout reaches it. Once `cd` runs, mise puts uv and the wrapper at `.mise/bin/scotch` on the path, even with the lines pasted together. The wrapper builds `.venv` from `uv.lock` through `uv run --exact --locked` on its first run, so the package needs no install step of its own between `mise install` and the first command. `mise doctor project` reports each condition the clone needs beyond the pinned tools, beside the command that supplies a missing one.

## A First Match

A fresh clone holds no games, so `mise run data:fetch` downloads the archives the store reads and `mise run data:index` builds the index from them. `scotch match game` then matches the first game of a Portable Game Notation (PGN) file. The demo game below matches a game <!-- demo-white -->Kasparov<!-- /demo-white --> played, in the output that `mise run docs:render` writes from the index.

<!-- example -->
```bash
scotch match game docs/public/games/demo.pgn
```

```text
Kasparov, Gary vs. Sosonko, Gennadi, Tilburg, 1981.??.??
Game 193 of https://www.pgnmentor.com/players/Kasparov.zip
Shares 43 positions, plies 0 to 42 of the submitted game and plies 0 to 42 of the stored game
Parts where the stored game played 22. Bc2
```
<!-- /example -->

[The Commands](commands.md) gives each command's help, and [The Store](store.md) follows the fetch and the index, then the steps that add a source.
