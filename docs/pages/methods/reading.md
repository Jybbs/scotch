# Reading a Game

Which positions does a game reach? A game reaches the position it starts from and the one after each move of its mainline, so a game of $n$ plies reaches $n + 1$ positions, and those positions are all a match reads of it. The crate under `rust/` reads every game this way, the stored games as `scotch index games` builds the index and the submitted game as `scotch match game` matches it, so both games of a match are read by one reader.

## The Mainline Alone

A game's movetext can carry variations, alternative lines set in parentheses after the move each replaces, and comments set in braces.[^edwards1994a] The reader follows the mainline and sets every variation and comment aside, since only the moves the players made reach positions the game passed through. A stored game's annotator can add many lines of analysis to a game, and none of them reaches the index.

## Where a Game Starts

A game starts from the standard starting position unless its `FEN` tag sets up another, in which case its first position is the one that tag names.[^edwards1994c] A game whose `Variant` tag names a variant other than standard chess is left out, since its moves follow other rules and its positions would take keys a standard game never reaches. The index leaves out <!-- left-variant -->0<!-- /left-variant --> such games of the files it reads, as `mise run docs:render` counts them.

## A Move Illegal Where It Was Played

The reader plays each move against the position it was played from, and a game holding a move illegal there is left out whole rather than cut short at that move, since the positions after it would follow no game that was played. `scotch index games` prints one line for each game it leaves out this way, naming its file, its place there, its players, and the problem, and the line below is the first the build prints for a move illegal where it was played, which `mise run docs:render` reads from the files the index was built from.

<!-- illegal -->
```text
Left out game 3,334 of https://www.pgnmentor.com/players/Gelfand.zip, Gelfand,B vs. Gareev,T: illegal san: 'Qxe1' in r2k3r/2pPp3/p4n2/3b2B1/1p5P/2qP4/3RQ1P1/4K2R w - - 2 31
```
<!-- /illegal -->

The index leaves out <!-- left-unread -->7<!-- /left-unread --> games whose moves the reader cannot play, as [Games Left Out](../data/omitted.md) counts them.

## What a Position Records

A position is recorded as its key, a 64-bit number computed from the pieces on their squares, the side to move, the castling rights, and the file a pawn could capture en passant on, which [Position Keys](keys.md) sets out. The index keeps each stored game's moves beside the keys its positions take, so the positions themselves are played again from the moves wherever a page or a command draws them. The index holds <!-- positions -->98,072,952<!-- /positions --> positions of its <!-- games -->1,147,017<!-- /games --> games, each game counting one more position than it plays plies.

[^edwards1994a]: Edwards, Steven J., coordinator. 1994. "Standard: Portable Game Notation Specification and Implementation Guide," Section 8.2.5, Movetext RAV (Recursive Annotation Variation). <https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c8.2.5>

[^edwards1994c]: Edwards, Steven J., coordinator. 1994. "Standard: Portable Game Notation Specification and Implementation Guide," Section 16.1, FEN. <https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c16.1>
