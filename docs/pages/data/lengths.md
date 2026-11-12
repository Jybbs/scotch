# Game Lengths

A stored game's length sets how far a match with it can run, since no run outlasts the shorter of the two games. A move here counts a move of White's and Black's reply as one, so a game of 81 plies plays 41 moves, and half of the stored games end by move <!-- median -->40<!-- /median -->, each count read from the index by `mise run docs:render`.

## Across the Decades

Each decade's games run to a length of their own, and the games of the 1900s ended by move <!-- median-1900 -->38<!-- /median-1900 --> at the median, those of the 1960s by move <!-- median-1960 -->38<!-- /median-1960 -->, and those of the 2020s by move <!-- median-2020 -->43<!-- /median-2020 -->. Below, each decade rises as a ridge where its games most often end, the earliest decades sharing the top ridge, and each ridge is drawn to its own height with its median ruled through it. The table beneath counts every decade, each count read from the index by `mise run docs:render`.

<!-- lengths -->
| **Decade** | **Games** | **Median Move** | **Middle Half** |
|---|---:|---:|---:|
| 1740s | 1 | 40 | 40 to 40 |
| 1780s | 2 | 44 | 44 to 47 |
| 1790s | 3 | 40 | 40 to 40 |
| 1820s | 1 | 30 | 30 to 30 |
| 1830s | 121 | 36 | 27 to 48 |
| 1840s | 248 | 35 | 27 to 45 |
| 1850s | 748 | 34 | 26 to 44 |
| 1860s | 729 | 34 | 25 to 44 |
| 1870s | 921 | 37 | 27 to 48 |
| 1880s | 2,075 | 41 | 31 to 53 |
| 1890s | 2,380 | 41 | 31 to 52 |
| 1900s | 4,648 | 38 | 30 to 50 |
| 1910s | 2,719 | 39 | 30 to 50 |
| 1920s | 6,735 | 38 | 30 to 49 |
| 1930s | 8,124 | 40 | 31 to 51 |
| 1940s | 6,957 | 41 | 32 to 51 |
| 1950s | 12,067 | 40 | 29 to 48 |
| 1960s | 17,753 | 38 | 27 to 45 |
| 1970s | 25,845 | 37 | 26 to 45 |
| 1980s | 48,522 | 38 | 27 to 47 |
| 1990s | 137,036 | 38 | 28 to 48 |
| 2000s | 191,385 | 39 | 29 to 50 |
| 2010s | 300,702 | 41 | 31 to 52 |
| 2020s | 380,433 | 43 | 33 to 56 |
<!-- /lengths -->

## By Result

A drawn game ends by move <!-- draw-median -->38<!-- /draw-median --> at the median, and a game White wins by move <!-- white-median -->41<!-- /white-median -->. Below, three bands split the games ending at each move among White's wins, draws, and Black's wins, over a count of the games ending there, and a move picked in either chart on this page is marked in both. The table beneath counts each result over spans of moves, each count read from the index by `mise run docs:render`.

<!-- outcomes -->
| **Moves** | **White Won** | **Drawn** | **Black Won** |
|---|---:|---:|---:|
| 0 to 10 | 697 | 9,223 | 485 |
| 11 to 20 | 10,806 | 57,747 | 7,128 |
| 21 to 30 | 73,721 | 72,755 | 49,689 |
| 31 to 40 | 128,955 | 74,161 | 97,883 |
| 41 to 50 | 102,831 | 68,566 | 78,032 |
| 51 to 60 | 60,607 | 45,721 | 49,540 |
| 61 to 70 | 30,953 | 27,629 | 25,168 |
| 71 to 80 | 14,179 | 15,657 | 11,541 |
| 81 and over | 10,471 | 17,420 | 8,464 |
<!-- /outcomes -->
