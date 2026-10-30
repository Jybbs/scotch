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
processes, and writes the index of them to its index folder beside a copy of the
manifest the files were read under. Files are read in the order sources.toml
declares them, a game several files repeat is indexed under the first, and a
game the reader records an error for, or whose Variant tag names a variant other
than standard chess, is left out, each game read and keyed as python-chess reads
and keys it.

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

Finds the stored game sharing the longest unbroken run of positions with the
first game of a PGN file, printing the stored game's players, event, and date,
its place in the file it was read from, the plies the two games share, and the
move where they part, or a line saying no stored game shares a position with it.

Reads the index from the index folder of the data directory, which is
.cache/data under the project's root unless the [tool.scotch] table of its
pyproject.toml or the SCOTCH_DATA variable moves it, and warns where a fetch
since the index was built recorded other bytes for the files than the ones the
index was read from.

Exits nonzero naming the problem where the file holds no game, where the reader
recorded errors reading the game, worded as python-chess words them, where its
Variant tag names a variant other than standard chess, or where no index has
been built or the one built holds another layout.

╭─ Parameters ─────────────────────────────────────────────────────────────────╮
│ *  PGN --pgn    The PGN file whose first game is matched. [required]         │
│    --json PATH  The file the match is written to as JSON.                    │
╰──────────────────────────────────────────────────────────────────────────────╯
```
<!-- /help-match-game -->
