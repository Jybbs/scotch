# The Store

The store is the files `src/scotch/sources/sources.toml` declares, fetched under `.cache/data/downloads` and indexed under `.cache/data/index`, neither of which git tracks, so each clone builds its own.

## Fetching the Files

`mise run data:fetch` runs `scotch fetch games`, which downloads each file `sources.toml` declares into a folder named for its host and records its size, its SHA-256 digest, its entity tag, and the date it was fetched in the `manifest.json` beside them. A later fetch downloads a file again only where the server reports it changed, the copy on disk no longer holds the bytes recorded, or the server sent the file with no entity tag.

## Building the Index

`mise run data:index` runs `scotch index games`, which reads every fetched file in place into the index of stored games and of every position they reach. It leaves out an Openings game where neither of the ratings its `WhiteElo` and `BlackElo` tags give reaches the <!-- openings-floor -->2500<!-- /openings-floor --> the `floors` table of `sources.toml` sets, and a game the reader records an error for or whose `Variant` tag names a variant other than standard chess. The crate under `rust/` reads each game as python-chess reads it, recording each error in python-chess's words, and keys each position as [Position Keys](../methods/keys.md) sets out. It reads one game for each set of tags whatever the spacing, where python-chess reads otherwise, in that a game's moves end at its result, so tags following the result directly open the next game, a blank line after the tags leaves the game whole, and text between two games holding no tag pair, such as a row of dashes, yields no game. The index is two files, `games.parquet` and `positions.bin`, which [The Data Files](../reference/files.md) sets out. The build copies the manifest beside the index, so `scotch match game` warns where a later fetch recorded other bytes than the ones the index was read from and `scotch show store` reports the same.

## The Largest Shares

A Players archive holds every game PGN Mentor collects for its player, an Events file every game of one event, and an Openings archive the games of one opening, of which the store keeps those reaching the floor, and a game two files both hold counts once, under the one `sources.toml` declares first. The store therefore keeps from <!-- smallest -->1<!-- /smallest --> to <!-- largest -->16,879<!-- /largest --> games of each file, each count read from the index by `mise run docs:render`. Below, each file the store keeps the most games from takes a row, above one row holding every other file, and each row gives its games and the share of the store held down to it. The table beneath adds each one's own share.

<!-- archives -->
| **File** | **Games** | **Share of the Store** | **Held Down to Here** |
|---|---:|---:|---:|
| RetiKIA | 16,879 | 1.5% | 1.5% |
| SicilianRossolimo | 13,891 | 1.2% | 2.7% |
| Caro-KannAdv | 12,738 | 1.1% | 3.8% |
| SicilianMoscow | 11,530 | 1.0% | 4.8% |
| SicilianTaimanovMain | 11,229 | 1.0% | 5.8% |
| QGDOther34 | 11,153 | 1.0% | 6.7% |
| BenkoGambit | 10,172 | 0.9% | 7.6% |
| KIDOther7 | 9,141 | 0.8% | 8.4% |
| NimzoRub4O-O | 9,115 | 0.8% | 9.2% |
| TwoKnights | 9,082 | 0.8% | 10.0% |
| 1182 others | 1,035,226 | 90.0% | 100.0% |
<!-- /archives -->

## Adding a Source

A source is one row of `sources.toml`, naming the address of a zip archive of Portable Game Notation (PGN) files or of a single PGN file, the provider publishing it, the provider's home page, and the section of the provider's site listing it, and the name PGN Mentor's page gives the file, as the file's first row below shows beside the `floors` table, which sets the rating a game of a section it names reaches the store at, both copied from it by `mise run docs:render`.

<!-- source -->
```toml
floors = { Openings = 2500 }

[[sources]]
address  = "https://www.pgnmentor.com/players/Abdusattorov.zip"
home     = "https://www.pgnmentor.com/"
provider = "PGN Mentor"
section  = "Players"
title    = "Nodirbek Abdusattorov"
```
<!-- /source -->

A row added there reaches the store once `mise run data:fetch` downloads its file and `mise run data:index` builds the index again. `mise run docs:render` then lists the new file under [Data](../data/index.md).
