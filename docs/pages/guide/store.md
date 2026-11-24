# The Store

The store is the files `src/scotch/sources/sources.toml` declares, fetched under `.cache/data/downloads` and indexed under `.cache/data/index`, neither of which git tracks, so each clone builds its own.

## Fetching the Files

`mise run data:fetch` runs `scotch fetch games`, which downloads each file `sources.toml` declares into a folder named for its host and records each in the `manifest.json` beside them, whose fields [The Data Files](../data/files.md#the-manifest) sets out. A later fetch downloads a file again only where the server reports it changed, the copy on disk no longer holds the bytes recorded, or the server sent the file with no entity tag.

## Building the Index

`mise run data:index` runs `scotch index games`, which reads every fetched file in place into the index of stored games and of every position they reach. It leaves out an Openings game below the rating floor the `floors` table of `sources.toml` sets, which [Data](../data/index.md) sets out, and a game the reader records an error for or whose `Variant` tag names a variant other than standard chess. The crate under `rust/` reads each game as python-chess reads it, recording each error in python-chess's words, and keys each position as [Position Keys](../methods/keys.md) sets out. It reads one game for each set of tags whatever the spacing, where python-chess reads otherwise, in that a game's moves end at its result, so tags following the result directly open the next game, blank lines after the tags leave the game whole, whereas python-chess ends the game at the second of them and reads its moves as a game of their own, and text between two games holding no tag pair, such as a row of dashes, yields no game. The index is three files, `games.parquet`, `left.parquet`, and `positions.bin`, which [The Data Files](../data/files.md) sets out, where `left.parquet` holds the games the build leaves out, as [Games Left Out](../data/omitted.md) counts them. The build copies the manifest beside the index, so `scotch match game` warns where a later fetch recorded other bytes than the ones the index was read from and `scotch show store` reports the same.

## Publishing the Store

`mise run data:publish` runs `scotch publish store`, which writes the index as the one file the [Viewer](../viewer/index.md) matches a pasted game against in the browser, under `.cache/data/store` beside a `manifest.json` naming it, as [The Data Files](../data/files.md#the-published-store) sets out. The `♟️ Store` workflow fetches the games, builds the index, and writes the file on each push to `main` that changes `sources.toml` or the code fetching, reading, or writing the store, and when run by hand, then uploads the file to the R2 bucket served at `store.scotch.fyi` before the manifest naming it, so a reader holding the earlier manifest still finds the earlier file. Once the manifest is up, `gha:retire` deletes each store file the bucket holds past the three newest earlier ones, and the run then starts the `♟️ Deploy` workflow on the commit it built. A push that changes the store as well as a page leaves the publish to that run, so the Viewer a deploy publishes reads a store already live. Where `main` has moved past the commit that deploy was started for, `gha:order` has it build the commit `main` points at instead, so a store run finishing after a later push publishes the newer site rather than its own older one. Where a `♟️ Store` run of that later push will start a deploy of its own, the earlier deploy builds nothing and leaves the publish to that one.

## The Largest Shares

A Players archive holds every game PGN Mentor collects for its player, an Events file every game of one event, and an Openings archive the games of one opening, of which the store keeps those reaching the floor, and a game two files both hold counts once, under the one `sources.toml` declares first. The store therefore keeps from <!-- smallest -->1<!-- /smallest --> to <!-- largest -->16,873<!-- /largest --> games of each file it keeps any game from, each count read from the index by `mise run docs:render`. Below, each file the store keeps the most games from takes a row, above one row holding every other file, and each row gives its games and the share of the store held down to it. The table beneath adds each one's own share.

<!-- archives -->
| **File** | **Games** | **Share of the Store** | **Held Down to Here** |
|---|---:|---:|---:|
| RetiKIA | 16,873 | 1.5% | 1.5% |
| SicilianRossolimo | 13,863 | 1.2% | 2.7% |
| Caro-KannAdv | 12,674 | 1.1% | 3.8% |
| SicilianMoscow | 11,528 | 1.0% | 4.8% |
| SicilianTaimanovMain | 11,191 | 1.0% | 5.8% |
| QGDOther34 | 11,145 | 1.0% | 6.7% |
| BenkoGambit | 10,044 | 0.9% | 7.6% |
| NimzoRub4O-O | 9,099 | 0.8% | 8.4% |
| KIDOther7 | 9,097 | 0.8% | 9.2% |
| TwoKnights | 9,078 | 0.8% | 10.0% |
| 1,182 others | 1,032,425 | 90.0% | 100.0% |
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
