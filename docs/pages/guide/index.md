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

[Setting Up](setup.md) goes through these steps a line at a time, then fetches the files and builds the index a match reads.

## A First Match

A fresh clone holds no games, so `mise run data:fetch` downloads the files the store reads and `mise run data:index` builds the index from them. `scotch match game` then matches one game of a Portable Game Notation (PGN) file. The demo game below matches a game <!-- demo-white -->Kasparov<!-- /demo-white --> played, in the output that `mise run docs:render` writes from the index.

<!-- example -->
```bash
scotch match game docs/public/games/demo.pgn
```

```text
players/Kasparov.zip:193  Kasparov, Gary vs. Sosonko, Gennadi, Tilburg, 1981.??.??
Shares 43 positions, plies 0 to 42 of the submitted game and plies 0 to 42 of the stored game
Parts at r1b2k1r/p3q3/1p1N1p1p/2Ppn3/6pP/2QBP1B1/P3KPP1/3R4 w - - 0 22, where the submitted game played 22. c6 and the stored game played 22. Bc2
Continues 22. Bc2 Ba6+ 23. Ke1 Bc4 24. Nxc4 dxc4 25. Rd6 Re8 26. Bxe5 fxe5 27. Qxc4 Qf7 28. Qe4 g3 29. fxg3 1-0
0 other stored games share a run as long
```
<!-- /example -->

The report names the stored game as `<file>:<n>`, the position where the two games part in Forsyth–Edwards Notation (FEN), the move each played from it, and the stored game's moves through its result.[^edwards1994c] With `--link`, the same command prints the address opening the match in the [Viewer](../viewer/index.md), which sets the two games side by side and steps through them together.

## Where to Go Next

Each walkthrough below picks up where the one before it ends, in the order the sidebar lists them, and each row names the command that does the work beside the page that walks through it.

| **To** | **Read** | **Run** |
|---|---|---|
| Install the tools, fetch the files, and build the index | [Setting Up](setup.md) | `mise run data:fetch`, `mise run data:index` |
| Match a game of your own and read the report | [Matching a Game](matching.md) | `scotch match game` |
| Follow the stored game on, list the games behind it, and look up a position | [Studying a Match](studying.md) | `scotch match game --plies`, `scotch match game --top`, `scotch show game`, `scotch show position` |
| Match every game of a file | [Studying a Match](studying.md) | `scotch match games` |
| See what the store holds | [Studying a Match](studying.md) | `scotch show store` |
| See how the files are fetched and the index built, and add a source to the store | [The Store](store.md) | `scotch fetch games`, `scotch index games` |
| Step through a match beside the stored game | [Viewer](../viewer/index.md) | `scotch match game --json`, `scotch match game --link` |

[The Commands](../reference/commands.md) sets out every option of each command and every message it exits on.

[^edwards1994c]: Edwards, Steven J., coordinator. 1994. "Standard: Portable Game Notation Specification and Implementation Guide," Section 16.1, FEN. <https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c16.1>
