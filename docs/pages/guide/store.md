# The Store

The store is the files `src/scotch/sources/sources.toml` declares, fetched under `.cache/data/downloads` and indexed under `.cache/data/index`, neither of which git tracks, so each clone builds its own.

## Fetching the Archives

`mise run data:fetch` runs `scotch fetch games`, which downloads each file `sources.toml` declares into a folder named for its host and records its size, its SHA-256 digest, its entity tag, and the date it was fetched in the `manifest.json` beside them. A later fetch downloads a file again only where the server reports it changed, the copy on disk no longer holds the bytes recorded, or the server sent the file with no entity tag.

## Building the Index

`mise run data:index` runs `scotch index games`, which reads every fetched archive in place into the index of stored games and of every position they reach, leaving out a game the reader records an error for or whose `Variant` tag names a variant other than standard chess. The crate under `rust/` reads and keys each game as python-chess reads and keys it, recording each error in python-chess's words. It copies the manifest beside the index, so `scotch match game` warns where a later fetch recorded other bytes than the ones the index was read from.

## The Largest Shares

An archive holds every game PGN Mentor collects for its player, and a game two archives both hold counts once, under the one `sources.toml` declares first. The store therefore keeps from <!-- smallest -->6<!-- /smallest --> to <!-- largest -->7,426<!-- /largest --> games of each archive, each count read from the index by `mise run docs:render`. Below, each archive the store keeps the most games from takes a row, above one row holding every other archive, and each row gives its games and the share of the store held down to it. The table beneath adds each one's own share.

<!-- archives -->
| **Archive** | **Games** | **Share of the Store** | **Held Down to Here** |
|---|---:|---:|---:|
| Nakamura | 7,426 | 1.7% | 1.7% |
| Andreikin | 7,415 | 1.7% | 3.4% |
| Carlsen | 7,249 | 1.7% | 5.1% |
| Kamsky | 6,306 | 1.4% | 6.5% |
| Kosteniuk | 5,880 | 1.4% | 7.9% |
| Caruana | 5,822 | 1.3% | 9.2% |
| Grischuk | 5,576 | 1.3% | 10.5% |
| Aronian | 5,350 | 1.2% | 11.7% |
| Bacrot | 5,304 | 1.2% | 12.9% |
| Duda | 4,834 | 1.1% | 14.0% |
| 240 others | 374,159 | 86.0% | 100.0% |
<!-- /archives -->

## Adding a Source

A source is one row of `sources.toml`, naming the address of a zip archive of Portable Game Notation (PGN) files or of a single PGN file, the provider publishing it, the provider's home page, and the section of the provider's site listing it, as the file's first row below shows, copied from it by `mise run docs:render`.

<!-- source -->
```toml
[[sources]]
address  = "https://www.pgnmentor.com/players/Abdusattorov.zip"
home     = "https://www.pgnmentor.com/"
provider = "PGN Mentor"
section  = "Players"
```
<!-- /source -->

A row added there reaches the store once `mise run data:fetch` downloads its file and `mise run data:index` builds the index again. `mise run docs:render` then lists the new file under [Data](../data/index.md).
