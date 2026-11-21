# Building the Index

What does a match search? It searches the index, which `scotch index games` builds once from every file `sources.toml` declares, so a match reads one prepared store rather than the files themselves. The index holds <!-- games -->1,149,926<!-- /games --> games and the <!-- positions -->98,542,793<!-- /positions --> positions they reach, as `mise run docs:render` counts them.

## What the Index Holds

The index is two files. `games.parquet` holds one row for each stored game, naming the file it was read from and its place there, its result, and its tags, and `positions.bin` holds each stored game's moves beside the key of every position they reach, as [The Data Files](../data/files.md) sets out column by column and section by section. A game's positions are kept as their keys alone, so a lookup compares numbers rather than boards, and a page or a command that draws a position plays the game's moves again to reach it.

## One Copy of a Repeated Game

A game several files hold is kept once, since PGN Mentor's player, event, and opening files overlap, and a game counted twice would tie with itself on every run it shares. Two copies count as one game where they carry the same Seven Tag Roster,[^edwards1994] start from the same position, and play the same moves, so two games of one event and the same moves that differ in a player's name or the round stay two games. The index leaves out <!-- left-repeat -->438,048<!-- /left-repeat --> repeats this way, as [Games Left Out](../data/omitted.md) counts them.

## The Order Files Are Read In

The build reads the files in the order `sources.toml` declares them, the Players files first, then the Events files, then the Openings files, and keeps a repeated game under the first file holding it. A game a player's file and an opening's file both hold is therefore kept under the player's, and the order the index holds the games in is the order a tie on the longest run falls back to, as [The Longest Run](runs.md) sets out.

## The Lookup a Match Makes

`scotch match game` reads the submitted game as [Reading a Game](reading.md) sets out and looks up the key of each position it reaches. The index sorts the stored games by their moves and files each key under the leading bits it opens with, beside the stretches of games reaching a position holding that key, so a lookup reads one small piece of the file for each key rather than the whole of it. Each candidate the leading bits find is confirmed by playing its game through and comparing the full keys, so a lookup returns every stored game reaching the position and no other, and the positions the two games share are what the search reads next.

[^edwards1994]: Edwards, Steven J., coordinator. 1994. "Standard: Portable Game Notation Specification and Implementation Guide," Section 8.1.1, Seven Tag Roster. <https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm>
