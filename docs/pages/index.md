# Scotch

<!-- tagline -->Find the grandmaster game closest to yours.<!-- /tagline -->

## Data

The store holds <!-- games -->1,150,156<!-- /games --> games from the <!-- files -->1,465<!-- /files --> files PGN Mentor publishes under its Players, Events, and Openings sections, an Openings game kept only where one of its players is rated <!-- openings-floor -->2500<!-- /openings-floor --> or above, every position they reach keyed once, and the [Data](data/index.md) section names each file and shows when its games were played.

## Guide

Three commands run from a fresh clone, `scotch fetch games` downloading the files, `scotch index games` building the index, and `scotch match game` finding the stored game closest to yours, which for the [Guide](guide/index.md)'s demo game is <!-- demo-white -->Kasparov<!-- /demo-white --> and <!-- demo-black -->Sosonko<!-- /demo-black -->'s game from <!-- demo-event -->Tilburg<!-- /demo-event --> <!-- demo-year -->1981<!-- /demo-year -->.

## Methods

Each position is keyed by its Zobrist hash, so a game reaching a stored position by another order of moves still meets it there, and the stored game sharing the longest unbroken run of keys with yours is the match, as [Methods](methods/index.md) sets out.

## Viewer

The front page's example reaches its stored game by another order of moves at ply <!-- front-start -->7<!-- /front-start --> and shares <!-- front-run -->6<!-- /front-run --> positions with it before the two part, and the link `scotch match game --link` prints for it opens both games in the [Viewer](viewer/index.md), which steps through them from there to show how the grandmaster went on.
