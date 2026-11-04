# Guide

*Scotch* runs from a clone of its repository, with [mise](https://mise.jdx.dev) installing the tools `.mise/config.toml` pins, the Python interpreter and [uv](https://docs.astral.sh/uv/) among them. After [installing mise](https://mise.jdx.dev/installing-mise.html), the commands below clone the repository, print the help of the `scotch` command, and report anything the clone still needs.

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

`--filter=blob:none` leaves every earlier layout of the game store the history keeps out of the clone, downloading a file only when a checkout reaches it. Once `cd` runs, mise puts uv and the wrapper at `.mise/bin/scotch` on the path, even with the lines pasted together. The wrapper builds `.venv` from `uv.lock` through `uv run --exact --locked` on its first run, compiling the crate under `rust/` with the Rust toolchain mise pins, so the package needs no install step of its own between `mise install` and the first command. `mise doctor project` reports each condition the clone needs beyond the pinned tools, beside the command that supplies a missing one.

## A First Match

A fresh clone holds no games, so `mise run data:fetch` downloads the archives the store reads and `mise run data:index` builds the index from them. `scotch match game` then matches one game of a Portable Game Notation (PGN) file. The demo game below matches a game <!-- demo-white -->Kasparov<!-- /demo-white --> played, in the output that `mise run docs:render` writes from the index.

<!-- example -->
```bash
scotch match game docs/public/games/demo.pgn
```

```text
Kasparov.zip:193  Kasparov, Gary vs. Sosonko, Gennadi, Tilburg, 1981.??.??
Shares 43 positions, plies 0 to 42 of the submitted game and plies 0 to 42 of the stored game
Parts at r1b2k1r/p3q3/1p1N1p1p/2Ppn3/6pP/2QBP1B1/P3KPP1/3R4 w - - 0 22, where the submitted game played 22. c6 and the stored game played 22. Bc2
Continues 22. Bc2 Ba6+ 23. Ke1 Bc4 24. Nxc4 dxc4 25. Rd6 Re8 26. Bxe5 fxe5 27. Qxc4 Qf7 28. Qe4 g3 29. fxg3 1-0
0 other stored games share a run as long
```
<!-- /example -->

The report names the stored game as `<file>:<n>`, the position where the two games part in Forsyth–Edwards Notation (FEN), the move each played from it, and the stored game's moves through its result.[^edwards1994c]

## Studying a Game

Each command prints plain text a reader pastes into the next command:

- `scotch match game` reads `-` as standard input and takes `--game N` to choose among the games of a file, while `--top N` lists the next stored games and `--link` prints the address opening the match in the [Viewer](../viewer/index.md) with nothing sent to a server
- `scotch match games` matches every game of a file, one line for each
- `scotch show game` prints a stored game as PGN from its `<file>:<n>`, for any chess program to open
- `scotch show position` takes a FEN or a line of moves, and prints each move the stored games played from that position, how those games ended, and the newest of them
- `scotch show store` reports the files, the index, and the command to run next

[The Commands](commands.md) gives each command's help, and [The Store](store.md) follows the fetch and the index, then the steps that add a source.

[^edwards1994c]: Edwards, Steven J., coordinator. 1994. "Standard: Portable Game Notation Specification and Implementation Guide," Section 16.1, FEN. <https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c16.1>
