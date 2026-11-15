# Terms

Each word below takes one sentence as *Scotch* uses it, linked to the page explaining it or, for a word from chess or PGN, its canonical source. A page's first use of a term links here, and resting on that link shows the same sentence.

<!-- terms -->
### FEN

Forsyth–Edwards Notation, one line of text setting out a position's pieces, the side to move, the castling rights, the en passant square, and the move counts. [The PGN standard on FEN](https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c16.1).

### Floor

The rating one of an Openings game's players must reach for the store to keep the game. [Data](../data/index.md).

### Index

The table of stored games and the file of every position they reach, each position under its key, which a match reads. [Building the Index](../guide/store.md#building-the-index).

### Key

The Zobrist hash a position is looked up by, counting the en passant file only where a legal move plays the capture. [Position Keys](../methods/keys.md).

### Mainline

A game's moves outside every variation its PGN records, the one line the index reads and stores. [python-chess on a game's mainline](https://python-chess.readthedocs.io/en/v1.11.2/pgn.html#chess.pgn.GameNode.mainline).

### PGN

Portable Game Notation, the plain-text format chess programs and playing sites export a game in, its tag pairs above its moves. [The PGN standard](https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm).

### Ply

One move by one side, half of a numbered move. [The Chess Programming Wiki on plies](https://chessprogramming.org/Ply).

### Run

An unbroken stretch of positions two games reach one ply after another. [The Longest Run](../methods/runs.md).

### Store

The games a match is found among, read from the files PGN Mentor publishes, each game kept once and an Openings game only where it clears the floor. [Data](../data/index.md).

### Stored Game

A game the store holds, which a submitted game is matched against. [Data](../data/index.md).

### The Parting Move

The first move after a run, where the stored game and the submitted one stop reaching the same positions. [The Longest Run](../methods/runs.md).

### Tie

Two or more stored games sharing runs as long with a submitted game, ranked by the mean of their players' ratings. [Choosing Among Runs](../methods/runs.md#choosing-among-runs).

### Transposition

A position reached by another order of moves, which the index keys as that same position. [The Chess Programming Wiki on transpositions](https://chessprogramming.org/Transposition).
<!-- /terms -->
