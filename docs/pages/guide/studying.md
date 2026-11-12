# Studying a Match

This walkthrough follows a match past the report [Matching a Game](matching.md) reads, printing less of the stored game, the next closest games, the stored game whole, and what every stored game played from one position, and [The Store](store.md) closes the Guide on what the store holds. Each example below is the demo game at `docs/public/games/demo.pgn` matched against the index, its output written by `mise run docs:render`.

## Shorter Continuations

The report prints the stored game's moves from the parting move through its result, which `--plies` cuts to the count of plies it names:

<!-- run-plies -->
```bash
scotch match game docs/public/games/demo.pgn --plies 4
```

```text
players/Kasparov.zip:193  Kasparov, Gary vs. Sosonko, Gennadi, Tilburg, 1981.??.??
Shares 43 positions, plies 0 to 42 of the submitted game and plies 0 to 42 of the stored game
Parts at r1b2k1r/p3q3/1p1N1p1p/2Ppn3/6pP/2QBP1B1/P3KPP1/3R4 w - - 0 22, where the submitted game played 22. c6 and the stored game played 22. Bc2
Continues 22. Bc2 Ba6+ 23. Ke1 Bc4
0 other stored games share a run as long
```
<!-- /run-plies -->

## The Next Closest Games

`--top` lists that many further stored games after the report, one line each, naming each beside the positions of its own longest run with the submitted game, the longest runs first. Stored games tied on the run rank by the mean of their players' ratings, highest first, then by the one rating a game carries, and the report's last line counts the games tying the match itself:

<!-- run-match-game -->
```bash
scotch match game docs/public/games/demo.pgn --top 3
```

```text
players/Kasparov.zip:193  Kasparov, Gary vs. Sosonko, Gennadi, Tilburg, 1981.??.??
Shares 43 positions, plies 0 to 42 of the submitted game and plies 0 to 42 of the stored game
Parts at r1b2k1r/p3q3/1p1N1p1p/2Ppn3/6pP/2QBP1B1/P3KPP1/3R4 w - - 0 22, where the submitted game played 22. c6 and the stored game played 22. Bc2
Continues 22. Bc2 Ba6+ 23. Ke1 Bc4 24. Nxc4 dxc4 25. Rd6 Re8 26. Bxe5 fxe5 27. Qxc4 Qf7 28. Qe4 g3 29. fxg3 1-0
0 other stored games share a run as long
openings/QGDOther34.zip:16393  Renet,O vs. Dizdar,G, ChIP, 2007.07.12, 21 positions
openings/QGDOther34.zip:19474  Moiseenko,A1 vs. Palac,M, 39th Olympiad Men, 2010.09.23, 20 positions
openings/QGDOther34.zip:13675  Sargissian,G vs. Dizdar,G, ADCF Masters, 2003.08.23, 20 positions
```
<!-- /run-match-game -->

## Every Game of a File

`scotch match games` matches every game a file holds and prints one line per game, naming it by its place in the file beside the stored game closest to it, so a file of your games shows which of them share the longest run with a stored game. A game the reader recorded an error for, or whose `Variant` tag names a variant other than standard chess, prints its problem on its line in place of a match, and the lines after it still print:

<!-- run-match-games -->
```bash
scotch match games docs/public/games/demo.pgn
```

```text
demo.pgn:1  players/Kasparov.zip:193  Kasparov, Gary vs. Sosonko, Gennadi, Tilburg, 1981.??.??, 43 positions
```
<!-- /run-match-games -->

## The Stored Game Whole

`scotch show game` prints the stored game a report names as PGN, its tags then its mainline, which any chess program opens:

<!-- run-show-game -->
```bash
scotch show game players/Kasparov.zip:193
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

## One Position

`scotch show position` takes a position as Forsyth–Edwards Notation or as a line of moves from the start, and prints how many stored games reach it, each move they played from it with how those games ended, and then the games themselves, newest first. A position reached through another order of moves, a [transposition](../reference/terms.md#transposition), counts the same, since every game reaching it reaches the same [key](../reference/terms.md#key):

<!-- run-show-position -->
```bash
scotch show position 1. d4 Nf6 2. c4 e6 --top 3
```

```text
124,263 stored games reach this position
Nc3        56,957  1-0 20,032  1/2-1/2 20,949  0-1 15,972  * 4
Nf3        56,080  1-0 18,770  1/2-1/2 23,861  0-1 13,443  * 6
g3         10,898  1-0 3,478  1/2-1/2 4,373  0-1 3,045  * 2
Bg5           182  1-0 111  1/2-1/2 46  0-1 25  * 0
Bf4            58  1-0 24  1/2-1/2 16  0-1 18  * 0
a3             45  1-0 19  1/2-1/2 11  0-1 15  * 0
e3             23  1-0 5  1/2-1/2 8  0-1 10  * 0
g4             11  1-0 6  1/2-1/2 4  0-1 1  * 0
Qc2             4  1-0 1  1/2-1/2 3  0-1 0  * 0
Bd2             1  1-0 0  1/2-1/2 1  0-1 0  * 0
b3              1  1-0 0  1/2-1/2 1  0-1 0  * 0
d5              1  1-0 0  1/2-1/2 1  0-1 0  * 0
f3              1  1-0 0  1/2-1/2 1  0-1 0  * 0
end             1  1-0 1  1/2-1/2 0  0-1 0  * 0
Newest first:
players/Karjakin.zip:3599  Tomashevsky,E vs. Karjakin,Sergey, Chess Stars 6.0 Blitz, 2026.07.06
players/Tomashevsky.zip:2073  Tomashevsky,E vs. Sadhwani,Raunak, Chess Stars 6.0 Blitz, 2026.07.06
players/Tomashevsky.zip:2079  Gunina,V vs. Tomashevsky,E, Chess Stars 6.0 Blitz, 2026.07.06
```
<!-- /run-show-position -->

## What the Store Holds

`scotch show store` prints each fetched file with its size and fetch date, then the games and positions the index holds and the command to run next, cut here to its last lines:

<!-- run-show-store -->
```bash
scotch show store
```

```text
…
The index holds 1,150,156 games and 98,542,793 positions
The index was built from the files as fetched
Next: scotch match game <pgn>
```
<!-- /run-show-store -->

[The Store](store.md) sets out how the files are fetched and the index built from them, and which files the store holds the most games from.
