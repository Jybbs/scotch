# Guide

How does a game of your own become a match against a grandmaster's, and what does the report show? A fresh clone reaches its first match by fetching the files, building the index, and matching a game, and each page below walks through one stage of the way there.

Each page of this section answers one question about running *Scotch*, beside the commands it walks through:

| **Page** | **Question It Answers** | **Run** |
|---|---|---|
| [Setting Up](setup.md) | *How does a fresh clone reach a built store?* | `mise run data:fetch`, `mise run data:index` |
| [Matching a Game](matching.md) | *How is a game of your own matched, and what does the report say?* | `scotch match game` |
| [Studying a Match](studying.md) | *How does the stored game go on, which games lie behind it, and what does the store hold?* | `scotch match game --plies`, `scotch match game --top`, `scotch match games`, `scotch show game`, `scotch show position`, `scotch show store` |
| [The Store](store.md) | *How are the files fetched and the index built, and how is a source added?* | `scotch fetch games`, `scotch index games` |

## A First Match

A clone of the repository reaches its first match in the three commands below, once [Setting Up](setup.md) has installed the tools the clone pins. A fresh clone holds no games, so `mise run data:fetch` downloads the files PGN Mentor publishes into the store, `mise run data:index` builds the index of every position the stored games reach, and `scotch match game` matches one game of a Portable Game Notation (PGN) file against that index:

```bash
mise run data:fetch
mise run data:index
scotch match game docs/public/games/demo.pgn
```

The match is the stored game sharing the longest run with yours, a run being the positions the two games reach in turn, one after another, until their next positions differ. The demo game matches a game <!-- demo-white -->Kasparov<!-- /demo-white --> played, and [Matching a Game](matching.md) reads the report the last command prints for it a line at a time. With `--link`, the same command prints the address opening the match in the [Viewer](../viewer/index.md), which sets the two games side by side and steps through them together. The drawing below sets out the example match the Viewer opens on, one square per position, and pointing at it replays the run and the parting and names the position under the pointer.

A match names the closest stored game by that one rule and nothing else, so it says nothing of which game played the stronger moves, and [Matches the Rule Passes Over](../methods/limits.md) counts how often a stored game a reader would also want falls behind it.

[The Commands](../reference/commands.md) sets out every option of each command and every message it exits on.
