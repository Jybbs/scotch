# Data

*Scotch* matches a game against the <!-- games -->1,150,156<!-- /games --> games the store holds, read from the <!-- files -->1,465<!-- /files --> files [PGN Mentor](https://www.pgnmentor.com/files.html) publishes across three sections of its site. The <!-- players-files -->250<!-- /players-files --> Players archives each hold every game PGN Mentor collects for one player, and the store keeps all of them, as it keeps every game of the <!-- events-files -->982<!-- /events-files --> Events files, each a tournament or a match. The <!-- openings-files -->233<!-- /openings-files --> Openings archives each hold the games of one opening, and the store keeps a game of theirs only where the higher of the ratings its `WhiteElo` and `BlackElo` tags give reaches <!-- openings-floor -->2500<!-- /openings-floor -->,[^edwards1994b] the rating FIDE sets for the grandmaster title through norms,[^fide2024] a floor `sources.toml` declares once beside its files. A game two files both hold, such as one between two players who each have an archive, is kept once, under the file `sources.toml` declares first, which lists the Players ahead of the Events and the Events ahead of the Openings, two copies counting as one game where their Seven Tag Roster and their moves agree.[^edwards1994]

Each page of this section answers one question about the store:

| **Page** | **Question It Answers** |
|---|---|
| [Data](index.md) | *How many games does the store hold, and when were they played?* |
| [The Source Files](sources.md) | *Which files does the store draw its games from, and when were each file's games played?* |
| [The Data Files](files.md) | *Which files does a run write under the data directory, and what does each hold?* |
| [Game Lengths](lengths.md) | *How long do the stored games run, by decade and by result?* |
| [Shared Positions](shared.md) | *How long do the stored games stay in positions another stored game reaches, and how crowded are those positions?* |
| [Tags](tags.md) | *Which tags do the stored games carry, how precisely are they dated, and which ratings do they carry?* |
| [Games Left Out](omitted.md) | *Which games do the fetched files hold that the index leaves out, and why?* |

## The Decades Played

The stored games run from the <!-- earliest -->1740s<!-- /earliest --> to the present, and <!-- recent -->92%<!-- /recent --> of them were played since <!-- recent-from -->1980<!-- /recent-from -->. A game whose `Date` tag carries no year counts as undated and stays out of the decades, which leaves out the undated games, <!-- undated -->1<!-- /undated --> in all. The strip below shades each decade by how many games it holds, the earliest decades sharing its first cell, and the table beneath it counts every decade, each read from the index by `mise run docs:render`.

<!-- decades -->
| **Decade** | **Games** | **Played by Its End** |
|---|---:|---:|
| 1740s | 1 | 0.0% |
| 1780s | 2 | 0.0% |
| 1790s | 3 | 0.0% |
| 1820s | 1 | 0.0% |
| 1830s | 121 | 0.0% |
| 1840s | 248 | 0.0% |
| 1850s | 748 | 0.1% |
| 1860s | 729 | 0.2% |
| 1870s | 921 | 0.2% |
| 1880s | 2,075 | 0.4% |
| 1890s | 2,380 | 0.6% |
| 1900s | 4,648 | 1.0% |
| 1910s | 2,719 | 1.3% |
| 1920s | 6,735 | 1.9% |
| 1930s | 8,124 | 2.6% |
| 1940s | 6,957 | 3.2% |
| 1950s | 12,067 | 4.2% |
| 1960s | 17,753 | 5.8% |
| 1970s | 25,845 | 8.0% |
| 1980s | 48,522 | 12.2% |
| 1990s | 137,036 | 24.1% |
| 2000s | 191,385 | 40.8% |
| 2010s | 300,702 | 66.9% |
| 2020s | 380,433 | 100.0% |
<!-- /decades -->

## Counting Again

A fresh clone reproduces every count on this page by running `mise run data:fetch` and `mise run data:index`, then `mise run docs:render`, and the counts on [Game Lengths](lengths.md) come from the same index.

[^edwards1994b]: Edwards, Steven J., coordinator. 1994. "Standard: Portable Game Notation Specification and Implementation Guide," Section 9.1.2, Tags: WhiteElo, BlackElo. <https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c9.1.2>

[^fide2024]: International Chess Federation. 2024. "FIDE Title Regulations Effective from 1 January 2024," Section 1.5.3. <https://handbook.fide.com/chapter/B012024>

[^edwards1994]: Edwards, Steven J., coordinator. 1994. "Standard: Portable Game Notation Specification and Implementation Guide," Section 8.1.1, Seven Tag Roster. <https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm>
