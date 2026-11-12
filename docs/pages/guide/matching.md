# Matching a Game

This walkthrough matches a game you bring against the store [Setting Up](setup.md) builds and reads the report `scotch match game` prints, and [Studying a Match](studying.md) follows the stored game on from where the report ends.

## The File You Bring

`scotch match game` reads a Portable Game Notation (PGN) file, the format chess programs and playing sites export a game in, named by its path, or a game pasted to standard input where `-` stands in for the path:

```bash
scotch match game my-game.pgn
scotch match game - < my-game.pgn
```

It reads one game from the file and matches it as the list below sets out:

- The one game the file holds, or the one `--game` chooses among several, counting from 1
- The game's [mainline](../reference/terms.md#mainline) alone, leaving out every variation and comment the file carries beside it
- The game from the position its `FEN` tag sets up, where it carries one, and from the starting position otherwise

## The Games It Refuses

The command matches no game it cannot read whole, and instead prints the message beside each case below to stderr and exits nonzero, in the table `mise run docs:render` writes from `src/scotch/docs/stops.toml`.

<!-- refused -->
| **Message** | **When** | **Clears It** |
|---|---|---|
| `Cannot read <pgn>: <reason>` | The file cannot be opened, with the reason the system gives | Name a file that exists and that the user running the command can read |
| `Found no game in <pgn>` | The file holds no game | Pass the file holding the game, a text whose movetext follows its tag pairs |
| `Found several games in <pgn>, which --game chooses among` | The file holds several games and `--game` names none | Choose one through `--game`, counting from 1 |
| `Found no game <n> in <pgn>` | The file holds fewer games than `--game` counts | Choose a game the file holds, which `scotch match games` lists |
| `Found problems in the game in <pgn>:` | Reading the game recorded an error, such as an illegal move, or its `Variant` tag names a variant other than standard chess | Correct the move or the tag each line below it names |
<!-- /refused -->

## Reading the Report

Matched through `scotch match game docs/public/games/demo.pgn`, the demo game prints the report below, each line set beside what it holds as `mise run docs:render` writes it from the index:

<!-- gloss -->
1. `players/Kasparov.zip:193  Kasparov, Gary vs. Sosonko, Gennadi, Tilburg, 1981.??.??` names the stored game as its file and its place there, then its players, its event, and its date
2. `Shares 43 positions, plies 0 to 42 of the submitted game and plies 0 to 42 of the stored game` counts the positions of the run the two games share, then the plies of each game the run spans
3. `Parts at r1b2k1r/p3q3/1p1N1p1p/2Ppn3/6pP/2QBP1B1/P3KPP1/3R4 w - - 0 22, where the submitted game played 22. c6 and the stored game played 22. Bc2` sets out the last position of the run in Forsyth–Edwards Notation (FEN), and the move each game played from it, the stored game's being the parting move
4. `Continues 22. Bc2 Ba6+ 23. Ke1 Bc4 24. Nxc4 dxc4 25. Rd6 Re8 26. Bxe5 fxe5 27. Qxc4 Qf7 28. Qe4 g3 29. fxg3 1-0` lists the stored game's moves from the parting move through its result
5. `0 other stored games share a run as long` counts the other stored games sharing a run as long as the match's
<!-- /gloss -->

The [run](../reference/terms.md#run) counts each position the two games share, the first as well as the last, so it spans one [ply](../reference/terms.md#ply) fewer than it holds positions, and [the parting move](../reference/terms.md#the-parting-move) is the stored game's move from the run's last position, where the two games go separate ways.

## Opening the Match in the Viewer

`--json` and a path write the match to a file the [Viewer](../viewer/index.md) opens, setting the two games side by side and stepping through them together, while `--json -` prints that file alone, and [The Match File](../reference/match.md) sets out each field it holds. `--link` prints an address of the Viewer after the report, carrying the whole match in its fragment, which a browser never sends to a server, so the address opens the match with no file to pass along.

```bash
scotch match game my-game.pgn --json my-game.json
scotch match game my-game.pgn --link
```

With the report read, [Studying a Match](studying.md) follows the stored game past the parting move and looks up the games behind it.
