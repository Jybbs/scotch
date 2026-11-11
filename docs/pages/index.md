# Scotch

<!-- tagline -->Find the grandmaster game closest to yours.<!-- /tagline -->

## Data

The store holds <!-- games -->435,321<!-- /games --> games from the <!-- files -->250<!-- /files --> player archives PGN Mentor publishes, every position they reach keyed once, and the [Data](data/index.md) section names each archive and shows when its games were played.

## Guide

Three commands run from a fresh clone, `scotch fetch games` downloading the archives, `scotch index games` building the index, and `scotch match game` finding the stored game closest to yours, which for the [Guide](guide/index.md)'s demo game is <!-- demo-white -->Kasparov<!-- /demo-white --> and <!-- demo-black -->Sosonko<!-- /demo-black -->'s game from <!-- demo-event -->Tilburg<!-- /demo-event --> <!-- demo-year -->1981<!-- /demo-year -->.

## Methods

Each position is keyed by its Zobrist hash, so a game reaching a stored position by another order of moves still meets it there, and the stored game sharing the longest unbroken run of keys with yours is the match, as [Methods](methods/index.md) sets out.

## Viewer

The front page's example reaches its stored game by another order of moves at ply <!-- front-start -->7<!-- /front-start --> and shares <!-- front-run -->6<!-- /front-run --> positions with it before the two part, and the [Viewer](viewer/index.md) steps through both games from there to show how the grandmaster went on.
