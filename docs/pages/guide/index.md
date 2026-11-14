# Guide

How does a game of your own become a match against a grandmaster's, and what does the report show? A fresh clone reaches its first match by fetching the files, building the index, and matching a game, and each page below walks through one stage of that run.

Each page of this section answers one question about running *Scotch*, beside the commands it walks through:

| **Page** | **Question It Answers** | **Run** |
|---|---|---|
| [Setting Up](setup.md) | *How does a fresh clone reach a built store?* | `mise run data:fetch`, `mise run data:index` |
| [Matching a Game](matching.md) | *How is a game of your own matched, and what does the report say?* | `scotch match game` |
| [Studying a Match](studying.md) | *How does the stored game go on, which games lie behind it, and what does the store hold?* | `scotch match game --plies`, `scotch match game --top`, `scotch match games`, `scotch show game`, `scotch show position`, `scotch show store` |
| [The Store](store.md) | *How are the files fetched and the index built, and how is a source added?* | `scotch fetch games`, `scotch index games` |

## A First Match

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

The report names the stored game as `<file>:<n>`, the position where the two games part in Forsyth–Edwards Notation (FEN), the move each played from it, and the stored game's moves through its result.[^edwards1994c] With `--link`, the same command prints the address opening the match in the [Viewer](../viewer/index.md), which sets the two games side by side and steps through them together. The drawing below sets out the example match the Viewer opens on, one square per position, and pointing at it replays the run and the parting and names the position under the pointer.

[The Commands](../reference/commands.md) sets out every option of each command and every message it exits on.

[^edwards1994c]: Edwards, Steven J., coordinator. 1994. "Standard: Portable Game Notation Specification and Implementation Guide," Section 16.1, FEN. <https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c16.1>
