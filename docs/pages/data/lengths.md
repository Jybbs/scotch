# Game Lengths

A stored game's length sets how far a match with it can run, since no run outlasts the shorter of the two games. A move here counts a move of White's and Black's reply as one, so a game of 81 plies plays 41 moves, and half of the stored games end by move <!-- median -->40<!-- /median -->, each count read from the index by `mise run docs:render`.

## Across the Decades

Each decade's games run to a length of their own, and the games of the 1900s ended by move <!-- median-1900 -->38<!-- /median-1900 --> at the median, those of the 1960s by move <!-- median-1960 -->37<!-- /median-1960 -->, and those of the 2020s by move <!-- median-2020 -->43<!-- /median-2020 -->. Below, each decade rises as a ridge where its games most often end, the earliest decades sharing the top ridge, and each ridge is drawn to its own height with its median ruled through it. The table beneath counts every decade, each count read from the index by `mise run docs:render`.

<!-- lengths -->
| **Decade** | **Games** | **Median Move** | **Middle Half** |
|---|---:|---:|---:|
| 1740s | 1 | 40 | 40 to 40 |
| 1780s | 2 | 44 | 44 to 47 |
| 1790s | 3 | 40 | 40 to 40 |
| 1820s | 1 | 30 | 30 to 30 |
| 1830s | 121 | 36 | 27 to 48 |
| 1840s | 248 | 35 | 27 to 45 |
| 1850s | 556 | 33 | 25 to 44 |
| 1860s | 614 | 34 | 25 to 43 |
| 1870s | 577 | 37 | 28 to 48 |
| 1880s | 1,095 | 42 | 32 to 55 |
| 1890s | 1,659 | 42 | 32 to 53 |
| 1900s | 2,965 | 38 | 30 to 50 |
| 1910s | 1,890 | 38 | 29 to 49 |
| 1920s | 4,109 | 38 | 30 to 49 |
| 1930s | 4,304 | 39 | 31 to 50 |
| 1940s | 4,288 | 41 | 31 to 51 |
| 1950s | 9,938 | 39 | 29 to 47 |
| 1960s | 14,779 | 37 | 27 to 45 |
| 1970s | 18,661 | 37 | 26 to 46 |
| 1980s | 31,510 | 38 | 26 to 47 |
| 1990s | 62,060 | 38 | 28 to 49 |
| 2000s | 70,706 | 39 | 29 to 51 |
| 2010s | 89,953 | 41 | 32 to 54 |
| 2020s | 115,002 | 43 | 33 to 56 |
<!-- /lengths -->

## By Result

A drawn game ends by move <!-- draw-median -->37<!-- /draw-median --> at the median, and a game White wins by move <!-- white-median -->41<!-- /white-median -->. Below, three bands split the games ending at each move among White's wins, draws, and Black's wins, over a count of the games ending there, and a move picked in either chart on this page is marked in both. The table beneath counts each result over spans of moves, each count read from the index by `mise run docs:render`.

<!-- outcomes -->
| **Moves** | **White Won** | **Drawn** | **Black Won** |
|---|---:|---:|---:|
| 0 to 10 | 371 | 3,398 | 259 |
| 11 to 20 | 3,597 | 24,089 | 2,276 |
| 21 to 30 | 25,489 | 31,718 | 16,576 |
| 31 to 40 | 46,951 | 32,225 | 34,414 |
| 41 to 50 | 38,467 | 29,683 | 27,802 |
| 51 to 60 | 22,491 | 18,650 | 17,681 |
| 61 to 70 | 11,488 | 11,072 | 8,840 |
| 71 to 80 | 4,997 | 5,983 | 4,022 |
| 81 and over | 3,611 | 6,163 | 2,933 |
<!-- /outcomes -->
