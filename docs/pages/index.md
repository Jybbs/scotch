# Scotch

<!-- tagline -->Find the grandmaster game closest to yours.<!-- /tagline -->

## The Archives

The store reads the <!-- files -->250<!-- /files --> archives PGN Mentor publishes for its players, <!-- games -->435,321<!-- /games --> games, and keys every position they reach.

## Finding a Match

Each position is keyed by its Zobrist hash, so a game reaching a stored position by another order of moves still meets it there, and the stored game sharing the longest unbroken run of positions is the match, as [Methods](methods/index.md) shows.

## Three Commands

`scotch fetch games` downloads the archives, `scotch index games` builds the index, and `scotch match game` finds the stored game closest to yours, each run from a fresh clone in the [Guide](guide/index.md).

## One Example Run

The [Guide](guide/index.md)'s demo game shares its first <!-- demo-run -->43<!-- /demo-run --> positions with <!-- demo-white -->Kasparov<!-- /demo-white --> and <!-- demo-black -->Sosonko<!-- /demo-black -->'s game from <!-- demo-event -->Tilburg<!-- /demo-event --> <!-- demo-year -->1981<!-- /demo-year -->, and no other stored game shares more than <!-- demo-next -->20<!-- /demo-next --> in a row with it.

## The Files

The [Data](data/index.md) section names each archive the store reads, ranks its players by the games each holds, and shows when and how long those games were played.
