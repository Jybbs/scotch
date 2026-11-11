# The Commands

Each command the help of `scotch` lists takes a section below, which `mise run docs:render` writes from what the command line declares, meaning the command's docstring, its usage, and the type, the bound, the default, and the help of each parameter. The messages a command exits nonzero on come from `src/scotch/docs/stops.toml`, which `mise run repo:audit` holds to the messages the code prints. Beneath each section sits an example run, its output written from the index wherever the index alone sets it, and [the Guide](../guide/index.md) walks through a first match.

<!-- command-cite-source -->
## `scotch cite source`

Prints the footnote definition citing each source named by its key in `docs/references.bib`, in the order given, each on one line with a blank line between two of them, ready to paste beneath the text of an issue or a pull request citing it, since a page takes its own from `scotch render docs`.

Exits nonzero without printing any definition, naming each key no entry in the file holds, or naming each block or entry that cannot be read where the file holds one.

```text
scotch cite source KEYS...
```

| **Parameter** | **Accepts** | **Default** | **Meaning** |
|---|---|---|---|
| `KEYS` | One or more words | Required | The key of each source, such as `zobrist1970`. |

It exits nonzero on each message below.

| **Message** | **When** | **Clears It** |
|---|---|---|
| `<key> names no entry in <file>` | No entry of `docs/references.bib` holds the key | Pass the key an entry's `@` line opens on, or add the entry |
| `Line <line> of <file> holds a block bibtexparser could not read: <reason>` | A block of `docs/references.bib` cannot be read | Correct the block the line opens |
<!-- /command-cite-source -->

<!-- run-cite-source -->
```bash
scotch cite source zobrist1970
```

```text
[^zobrist1970]: Zobrist, Albert L. 1970. "A New Hashing Method with Application for Game Playing," Technical Report 88, Computer Sciences Department, University of Wisconsin. <https://minds.wisc.edu/handle/1793/57624>
```
<!-- /run-cite-source -->

<!-- command-fetch-games -->
## `scotch fetch games`

Downloads each file `sources.toml` declares into the `downloads` folder of the data directory, in a folder named for the host of its address, and records each one's size, SHA-256 digest, entity tag, and fetch date in the `manifest.json` beside them. A file the manifest records is fetched again where the server reports it changed since, where the copy on disk no longer holds the bytes recorded, or where the server sent it with no entity tag to ask about.

Prints one line per file, naming it as fetched or as unchanged, and exits nonzero naming the file and the error where the server answers with an error status, where a request fails once every retry has, or where the connection breaks while the file downloads, which no retry covers.

```text
scotch fetch games
```

It exits nonzero on each message below.

| **Message** | **When** | **Clears It** |
|---|---|---|
| `Could not fetch <address>: <error>` | The server answers with an error status, a request fails once every retry has, or the connection breaks while the file downloads | Run the command again once the host answers, or raise `SCOTCH_RETRIES` or `SCOTCH_TIMEOUT_S` |
<!-- /command-fetch-games -->

<!-- run-fetch-games -->
```bash
scotch fetch games
```

```text
Fetched https://www.pgnmentor.com/players/Abdusattorov.zip
Fetched https://www.pgnmentor.com/players/Adams.zip
Fetched https://www.pgnmentor.com/players/Akobian.zip
…
Fetched https://www.pgnmentor.com/players/Zvjaginsev.zip
```
<!-- /run-fetch-games -->

<!-- command-index-games -->
## `scotch index games`

Reads the games of every file `scotch fetch games` downloaded into the `downloads` folder of the data directory, handing the files one at a time to a pool of processes, and writes the index of them to its `index` folder, replacing what that folder holds, beside a copy of the manifest the files were read under. Files are read in the order `sources.toml` declares them, a game several files repeat is indexed under the first, and a game the reader records an error for, or whose `Variant` tag names a variant other than standard chess, is left out, each game read as python-chess reads it.

Prints the count of games read from each file, one line for each problem of a game left out naming its file, its place there, and its players, and the count of games indexed. Exits nonzero where no file has been fetched, or naming each fetched file whose copy on disk no longer holds the bytes the manifest records.

```text
scotch index games
```

It exits nonzero on each message below.

| **Message** | **When** | **Clears It** |
|---|---|---|
| `No file has been fetched under <downloads>` | The manifest records no file `sources.toml` declares | Run `scotch fetch games` |
| `` These files changed on disk since their fetch, which `scotch fetch games` downloads again: `` | A fetched file no longer holds the bytes the manifest records | Run `scotch fetch games`, which downloads each file named below the line again |
<!-- /command-index-games -->

<!-- run-index-games -->
```bash
scotch index games
```

```text
…
Indexed 435,321 games into .cache/data/index
```
<!-- /run-index-games -->

<!-- command-match-game -->
## `scotch match game`

Finds the stored game sharing the longest unbroken run of positions with one game of a PGN file.

Prints the stored game as `<file>:<n>` beside its players, event, and date, the plies the two games share, the Forsyth–Edwards Notation of the position where they part with the move each played from it, the stored game's moves from there through its result, and the count of other stored games sharing a run as long, or a line saying no stored game shares a position with it. Stored games tied on the run rank by the mean of their players' ratings, highest first, then by the one rating a game carries, then in the order the index holds them.

Reads the index from the `index` folder of the data directory, which is `.cache/data` under the project's root unless the `[tool.scotch]` table of its `pyproject.toml` or the `SCOTCH_DATA` variable moves it, and warns where a fetch since the index was built recorded other bytes for the files than the ones the index was read from.

Exits nonzero naming the problem where the file cannot be read, holds no game, holds several with none chosen, or holds fewer than the one chosen, where reading the game recorded an error, such as a move illegal in the position it was played from or a `FEN` tag setting up a position no game reaches, where its `Variant` tag names a variant other than standard chess, where `--json` names a path opening on a hyphen other than `-`, or where no index has been built or the one built holds another layout.

```text
scotch match game [OPTIONS] PGN
```

| **Parameter** | **Accepts** | **Default** | **Meaning** |
|---|---|---|---|
| `PGN` | A path | Required | The PGN file holding the game, or - for standard input. |
| `--game` | An integer from 1 | None | The game to match, counting from 1, where the file holds several. |
| `--json` | A path | None | The file the match is written to as JSON, or - to print the JSON alone. |
| `--link`, `--no-link` | A flag | Off | Prints the address of the Viewer opening the match. |
| `--plies` | An integer from 1 | None | The most plies of the stored game's continuation to print. |
| `--top` | An integer from 0 | `0` | The count of further stored games to list after the match. |

It exits nonzero on each message below.

| **Message** | **When** | **Clears It** |
|---|---|---|
| `Unknown option: <json>` | `--json` names a path opening on a hyphen other than `-` alone | Pass a path opening on `./`, such as `./-match.json` |
| `Cannot read <pgn>: <reason>` | The file cannot be opened, with the reason the system gives | Name a file that exists and that the user running the command can read |
| `Found no game in <pgn>` | The file holds no game | Pass the file holding the game, a text whose movetext follows its tag pairs |
| `Found several games in <pgn>, which --game chooses among` | The file holds several games and `--game` names none | Choose one through `--game`, counting from 1 |
| `Found no game <n> in <pgn>` | The file holds fewer games than `--game` counts | Choose a game the file holds, which `scotch match games` lists |
| `Found problems in the game in <pgn>:` | Reading the game recorded an error, such as an illegal move, or its `Variant` tag names a variant other than standard chess | Correct the move or the tag each line below it names |
| `No index has been built under <index>` | The data directory holds no index | Run `scotch index games` |
| `The index under <index> holds another layout` | The index was built in a layout other than the one this version reads | Run `scotch index games`, which rebuilds the index in this layout |
<!-- /command-match-game -->

<!-- run-match-game -->
```bash
scotch match game docs/public/games/demo.pgn --top 3
```

```text
Kasparov.zip:193  Kasparov, Gary vs. Sosonko, Gennadi, Tilburg, 1981.??.??
Shares 43 positions, plies 0 to 42 of the submitted game and plies 0 to 42 of the stored game
Parts at r1b2k1r/p3q3/1p1N1p1p/2Ppn3/6pP/2QBP1B1/P3KPP1/3R4 w - - 0 22, where the submitted game played 22. c6 and the stored game played 22. Bc2
Continues 22. Bc2 Ba6+ 23. Ke1 Bc4 24. Nxc4 dxc4 25. Rd6 Re8 26. Bxe5 fxe5 27. Qxc4 Qf7 28. Qe4 g3 29. fxg3 1-0
0 other stored games share a run as long
Hou.zip:801  Kosteniuk,A vs. Hou Yifan, Sportaccord WMG Blindfold w, 2011.12.16, 20 positions
Onischuk.zip:1266  Riazantsev,A vs. Onischuk,Al, 11th Karpov, 2010.06.13, 19 positions
Ni.zip:966  Ding,L vs. Ni Hua, 1st Chinese Celebrity, 2011.06.14, 19 positions
```
<!-- /run-match-game -->

<!-- command-match-games -->
## `scotch match games`

Matches every game of a PGN file against the index of stored games.

Prints one line per game, naming it as `<file>:<n>` beside the stored game closest to it as `scotch match game` ranks them, or saying no stored game shares a position with it. Where reading a game recorded an error, or its `Variant` tag names a variant other than standard chess, its line holds the problem in place of a match, and the rest of the report still prints.

Warns where the files changed since the index was built, and exits nonzero naming the problem where the file cannot be read or holds no game, where no index has been built, or where the one built holds another layout.

```text
scotch match games PGN
```

| **Parameter** | **Accepts** | **Default** | **Meaning** |
|---|---|---|---|
| `PGN` | An existing file | Required | The PGN file holding the games. |

It exits nonzero on each message below.

| **Message** | **When** | **Clears It** |
|---|---|---|
| `Cannot read <pgn>: <reason>` | The file cannot be opened, with the reason the system gives | Name a file that exists and that the user running the command can read |
| `Found no game in <pgn>` | The file holds no game | Pass the file holding the game, a text whose movetext follows its tag pairs |
| `No index has been built under <index>` | The data directory holds no index | Run `scotch index games` |
| `The index under <index> holds another layout` | The index was built in a layout other than the one this version reads | Run `scotch index games`, which rebuilds the index in this layout |
<!-- /command-match-games -->

<!-- run-match-games -->
```bash
scotch match games docs/public/games/demo.pgn
```

```text
demo.pgn:1  Kasparov.zip:193  Kasparov, Gary vs. Sosonko, Gennadi, Tilburg, 1981.??.??, 43 positions
```
<!-- /run-match-games -->

<!-- command-show-game -->
## `scotch show game`

Prints the stored game a `<file>:<n>` reference names as PGN, for any chess program to open, its tags then its mainline.

Warns where the files changed since the index was built, and exits nonzero naming the problem where the index holds no such game, where no index has been built, or where the one built holds another layout.

```text
scotch show game REFERENCE
```

| **Parameter** | **Accepts** | **Default** | **Meaning** |
|---|---|---|---|
| `REFERENCE` | A word | Required | The stored game, as `scotch match game` names it. |

It exits nonzero on each message below.

| **Message** | **When** | **Clears It** |
|---|---|---|
| `No stored game is named <reference>` | The index holds no game under the reference | Pass the reference `scotch match game` printed, such as `Kasparov.zip:193` |
| `No index has been built under <index>` | The data directory holds no index | Run `scotch index games` |
| `The index under <index> holds another layout` | The index was built in a layout other than the one this version reads | Run `scotch index games`, which rebuilds the index in this layout |
<!-- /command-show-game -->

<!-- run-show-game -->
```bash
scotch show game Kasparov.zip:193
```

```text
[Event "Tilburg"]
[Site "Tilburg"]
[Date "1981.??.??"]
[Round "?"]
[White "Kasparov, Gary"]
[Black "Sosonko, Gennadi"]
[Result "1-0"]
[WhiteElo "2630"]
[BlackElo "2585"]
[ECO "D38"]

1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 Bb4 5. cxd5 exd5 6. Bg5 h6 7. Bh4 c5 8. e3 g5 9. Bg3 Ne4 10. Bb5+ Kf8 11. dxc5 Nxc3 12. bxc3 Bxc3+ 13. Ke2 Bxa1 14. Qxa1 f6 15. h4 g4 16. Nd4 Kf7 17. Bd3 Nd7 18. Qc3 Ne5 19. Nb5 Qe7 20. Nd6+ Kf8 21. Rd1 b6 22. Bc2 Ba6+ 23. Ke1 Bc4 24. Nxc4 dxc4 25. Rd6 Re8 26. Bxe5 fxe5 27. Qxc4 Qf7 28. Qe4 g3 29. fxg3 1-0
```
<!-- /run-show-game -->

<!-- command-show-position -->
## `scotch show position`

Reports what the stored games played from one position.

Prints how many stored games reach it, each move they played from it with how many games played it and how those games ended, the games ending at the position under `end`, and then the games themselves, newest first, each named as `<file>:<n>`. A game reaching the position twice counts once, under the move it played from its first reach. A line of moves is read as PGN, so it may hold move numbers, comments, annotation marks, and a result beside its moves.

Warns where the files changed since the index was built, and exits nonzero naming the problem where a token opening on a hyphen names no option, where a Forsyth–Edwards Notation names no position or stops short of its first four fields, since a placement alone would read as white to move with no castling rights, where a line of moves holds an illegal move, a word naming no move, a `(` or a `{` never closed, a `(` before any move, a `)` with none open, or more past the blank line ending its moves, where no index has been built, or where the one built holds another layout.

```text
scotch show position [OPTIONS] [ARGS...]
```

| **Parameter** | **Accepts** | **Default** | **Meaning** |
|---|---|---|---|
| `POSITION` | Any number of words | None | The Forsyth–Edwards Notation of the position or a line of moves from the start, quoted or not, the starting position where left out. |
| `--top` | An integer from 1 | `20` | The count of games to list, the newest first. |

It exits nonzero on each message below.

| **Message** | **When** | **Clears It** |
|---|---|---|
| `Unknown option: <token>` | A word of the position opens on a hyphen and names no option | Name the flag the help lists, or quote the moves after `--` |
| `The FEN <position> stops short of its first four fields, the placement, the side to move, the castling rights, and the en passant square, which together name a position` | A FEN holds fewer than four fields | Write the placement, the side to move, the castling rights, and the en passant square |
| `names no position: <fen>` | A FEN names no position a game can reach | Correct the FEN, whose placement names eight ranks and one king of each color |
| `Found problems in <position>:` | A line of moves holds an illegal move, a word naming no move, a bracket left open or closed with none open, or more past a blank line | Correct the move or the word each line below it names |
| `names no move: '<word>'` | A word of a line of moves reads as no move, beneath the line naming the problems | Spell the move in SAN, or remove the word |
| `holds more past the blank line ending its moves` | A line of moves holds text past a blank line, beneath the line naming the problems | Remove the blank line, or what follows it |
| `No index has been built under <index>` | The data directory holds no index | Run `scotch index games` |
| `The index under <index> holds another layout` | The index was built in a layout other than the one this version reads | Run `scotch index games`, which rebuilds the index in this layout |
<!-- /command-show-position -->

<!-- run-show-position -->
```bash
scotch show position 1. d4 Nf6 2. c4 e6 --top 3
```

```text
47,094 stored games reach this position
Nf3        23,577  1-0 7,197  1/2-1/2 11,277  0-1 5,098  * 5
Nc3        19,370  1-0 6,518  1/2-1/2 8,144  0-1 4,705  * 3
g3          3,861  1-0 1,087  1/2-1/2 1,825  0-1 947  * 2
Bg5           166  1-0 105  1/2-1/2 41  0-1 20  * 0
Bf4            56  1-0 24  1/2-1/2 14  0-1 18  * 0
a3             37  1-0 17  1/2-1/2 8  0-1 12  * 0
e3             12  1-0 3  1/2-1/2 3  0-1 6  * 0
g4             10  1-0 6  1/2-1/2 3  0-1 1  * 0
Qc2             3  1-0 1  1/2-1/2 2  0-1 0  * 0
d5              1  1-0 0  1/2-1/2 1  0-1 0  * 0
end             1  1-0 1  1/2-1/2 0  0-1 0  * 0
Newest first:
Karjakin.zip:3600  Tomashevsky,E vs. Karjakin,Sergey, Chess Stars 6.0 Blitz, 2026.07.06
Tomashevsky.zip:2075  Tomashevsky,E vs. Sadhwani,Raunak, Chess Stars 6.0 Blitz, 2026.07.06
Tomashevsky.zip:2081  Gunina,V vs. Tomashevsky,E, Chess Stars 6.0 Blitz, 2026.07.06
```
<!-- /run-show-position -->

<!-- command-show-store -->
## `scotch show store`

Reports what the store holds.

Prints each file `sources.toml` declares with its size and fetch date, the games and positions the index holds, whether the files have changed since the index was built from them, and the command to run next.

```text
scotch show store
```
<!-- /command-show-store -->

<!-- run-show-store -->
```bash
scotch show store
```

```text
…
The index holds 435,321 games and 37,039,333 positions
The index was built from the files as fetched
Next: scotch match game <pgn>
```
<!-- /run-show-store -->
