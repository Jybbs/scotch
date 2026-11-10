# Terms

Each word below takes one sentence as *Scotch* uses it, linked to the page explaining it or, for a word from chess or PGN, its canonical source. A page's first use of a term links here, and resting on that link shows the same sentence.

<!-- terms -->
### Key

The Zobrist hash a position is looked up by, counting the en passant file only where a legal move plays the capture. [Position Keys](../methods/keys.md).

### Mainline

A game's moves outside every variation its PGN records, the one line the index reads and stores. [python-chess on a game's mainline](https://python-chess.readthedocs.io/en/v1.11.2/pgn.html#chess.pgn.GameNode.mainline).

### Ply

One move by one side, half of a numbered move. [The Chess Programming Wiki on plies](https://chessprogramming.org/Ply).

### Run

An unbroken stretch of positions two games reach one ply after another. [The Longest Run](../methods/runs.md).

### The Parting Move

The first move after a run, where the stored game and the submitted one stop reaching the same positions. [The Longest Run](../methods/runs.md).

### Transposition

A position reached by another order of moves, which the index keys as that same position. [The Chess Programming Wiki on transpositions](https://chessprogramming.org/Transposition).
<!-- /terms -->
