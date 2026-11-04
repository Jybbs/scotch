# The Commands

Each command prints its help under `--help`, which this page carries as `mise run docs:render` writes it from the docstrings the command line reads.

## Citing a Source

<!-- help-cite-source -->
```text
Usage: scotch cite source KEYS...

Prints the footnote definition citing each source named by its key in
docs/references.bib, in the order given, each on one line with a blank line
between two of them, ready to paste beneath the text of an issue or a pull
request citing it, since a page takes its own from scotch render docs.

Exits nonzero without printing any definition, naming each key no entry in the
file holds, or naming each block or entry that cannot be read where the file
holds one.

╭─ Arguments ──────────────────────────────────────────────────────────────────╮
│ *  KEYS  The key of each source, such as zobrist1970. [required]             │
╰──────────────────────────────────────────────────────────────────────────────╯
```
<!-- /help-cite-source -->

## Fetching the Games

<!-- help-fetch-games -->
```text
Usage: scotch fetch games

Downloads each file sources.toml declares into the downloads folder of the data
directory, in a folder named for the host of its address, and records each one's
size, SHA-256 digest, entity tag, and fetch date in the manifest.json beside
them. A file the manifest records is fetched again where the server reports it
changed since, where the copy on disk no longer holds the bytes recorded, or
where the server sent it with no entity tag to ask about.

Prints one line per file, naming it as fetched or as unchanged, and exits
nonzero naming the file and the error where the server answers with an error
status, where a request fails once every retry has, or where the connection
breaks while the file downloads, which no retry covers.
```
<!-- /help-fetch-games -->

## Building the Index

<!-- help-index-games -->
```text
Usage: scotch index games

Reads the games of every file scotch fetch games downloaded into the downloads
folder of the data directory, handing the files one at a time to a pool of
processes, and writes the index of them to its index folder, replacing what that
folder holds, beside a copy of the manifest the files were read under. Files are
read in the order sources.toml declares them, a game several files repeat is
indexed under the first, and a game the reader records an error for, or whose
Variant tag names a variant other than standard chess, is left out, each game
read as python-chess reads it.

Prints the count of games read from each file, one line for each problem of a
game left out naming its file, its place there, and its players, and the count
of games indexed. Exits nonzero where no file has been fetched, or naming each
fetched file whose copy on disk no longer holds the bytes the manifest records.
```
<!-- /help-index-games -->

## Matching a Game

<!-- help-match-game -->
```text
Usage: scotch match game [OPTIONS] PGN

Finds the stored game sharing the longest unbroken run of positions with one
game of a PGN file.

Prints the stored game as <file>:<n> beside its players, event, and date, the
plies the two games share, the Forsyth–Edwards Notation of the position where
they part with the move each played from it, the stored game's moves from there
through its result, and the count of other stored games sharing a run as long,
or a line saying no stored game shares a position with it. Stored games tied on
the run rank by the mean of their players' ratings, highest first, then by the
one rating a game carries, then in the order the index holds them.

Reads the index from the index folder of the data directory, which is
.cache/data under the project's root unless the [tool.scotch] table of its
pyproject.toml or the SCOTCH_DATA variable moves it, and warns where a fetch
since the index was built recorded other bytes for the files than the ones the
index was read from.

Exits nonzero naming the problem where the file cannot be read, holds no game,
holds several with none chosen, or holds fewer than the one chosen, where
reading the game recorded an error, such as a move illegal in the position it
was played from or a FEN tag setting up a position no game reaches, where its
Variant tag names a variant other than standard chess, where --json names a path
opening on a hyphen other than -, or where no index has been built or the one
built holds another layout.

╭─ Parameters ─────────────────────────────────────────────────────────────────╮
│ *  PGN --pgn    The PGN file holding the game, or - for standard input.      │
│                 [required]                                                   │
│    --game INT   The game to match, counting from 1, where the file holds     │
│                 several.                                                     │
│    --json PATH  The file the match is written to as JSON, or - to print the  │
│                 JSON alone.                                                  │
│    --link       Prints the address of the Viewer opening the match.          │
│                 [default: False]                                             │
│    --plies INT  The most plies of the stored game's continuation to print.   │
│    --top INT    The count of further stored games to list after the match.   │
│                 [default: 0]                                                 │
╰──────────────────────────────────────────────────────────────────────────────╯
```
<!-- /help-match-game -->

## Matching Every Game of a File

<!-- help-match-games -->
```text
Usage: scotch match games PGN

Matches every game of a PGN file against the index of stored games.

Prints one line per game, naming it as <file>:<n> beside the stored game closest
to it as scotch match game ranks them, or saying no stored game shares a
position with it. Where reading a game recorded an error, or its Variant tag
names a variant other than standard chess, its line holds the problem in place
of a match, and the rest of the report still prints.

Warns where the files changed since the index was built, and exits nonzero
naming the problem where the file cannot be read or holds no game, where no
index has been built, or where the one built holds another layout.

╭─ Parameters ─────────────────────────────────────────────────────────────────╮
│ *  PGN --pgn  The PGN file holding the games. [required]                     │
╰──────────────────────────────────────────────────────────────────────────────╯
```
<!-- /help-match-games -->

## Showing a Stored Game

<!-- help-show-game -->
```text
Usage: scotch show game REFERENCE

Prints the stored game a <file>:<n> reference names as PGN, for any chess
program to open, its tags then its mainline.

Warns where the files changed since the index was built, and exits nonzero
naming the problem where the index holds no such game, where no index has been
built, or where the one built holds another layout.

╭─ Parameters ─────────────────────────────────────────────────────────────────╮
│ *  REFERENCE --reference  The stored game, as scotch match game names it.    │
│                           [required]                                         │
╰──────────────────────────────────────────────────────────────────────────────╯
```
<!-- /help-show-game -->

## Answering for a Position

<!-- help-show-position -->
```text
Usage: scotch show position [OPTIONS] [ARGS...]

Reports what the stored games played from one position.

Prints how many stored games reach it, each move they played from it with how
many games played it and how those games ended, the games ending at the position
under end, and then the games themselves, newest first, each named as
<file>:<n>. A game reaching the position twice counts once, under the move it
played from its first reach. A line of moves is read as PGN, so it may hold move
numbers, comments, annotation marks, and a result beside its moves.

Warns where the files changed since the index was built, and exits nonzero
naming the problem where a token opening on a hyphen names no option, where a
Forsyth–Edwards Notation names no position or stops short of its first four
fields, since a placement alone would read as white to move with no castling
rights, where a line of moves holds an illegal move or a word naming no move,
where no index has been built, or where the one built holds another layout.

╭─ Arguments ──────────────────────────────────────────────────────────────────╮
│ POSITION  The Forsyth–Edwards Notation of the position or a line of moves    │
│           from the start, quoted or not, the starting position where left    │
│           out.                                                               │
╰──────────────────────────────────────────────────────────────────────────────╯
╭─ Parameters ─────────────────────────────────────────────────────────────────╮
│ --top INT  The count of games to list, the newest first. [default: 20]       │
╰──────────────────────────────────────────────────────────────────────────────╯
```
<!-- /help-show-position -->

## Reporting the Store

<!-- help-show-store -->
```text
Usage: scotch show store

Reports what the store holds.

Prints each file sources.toml declares with its size and fetch date, the games
and positions the index holds, whether the files have changed since the index
was built from them, and the command to run next.
```
<!-- /help-show-store -->
