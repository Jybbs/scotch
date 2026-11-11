# The Data Files

A run writes its files under the data directory [Settings](settings.md) names, which is `.cache/data` under the project's root unless a setting moves it, and git tracks none of them. The table below names each file, written by `mise run docs:render` from the code that names it, and [The Store](../guide/store.md) sets out when a fetch downloads a file again and when the index is built again.

<!-- layout -->
| **Path** | **Written By** | **Holds** |
|---|---|---|
| `.cache/data/downloads/www.pgnmentor.com/` | `scotch fetch games` | Each file of the host `sources.toml` declares, under the path its address names |
| `.cache/data/downloads/manifest.json` | `scotch fetch games` | The record of each fetched file, keyed by its address |
| `.cache/data/index/games.parquet` | `scotch index games` | One row for each stored game |
| `.cache/data/index/positions.bin` | `scotch index games` | Every position the stored games reach, beside their moves |
| `.cache/data/index/manifest.json` | `scotch index games` | A copy of the manifest the files were read under |
<!-- /layout -->

## The Manifest

`scotch fetch games` keeps `manifest.json` beside the folder of each host, recording each file it fetched under the address it was fetched from, with the fields `Download` declares:

<!-- manifest -->
| **Field** | **Type** | **Meaning** |
|---|---|---|
| `etag` | A string, or `null` | The entity tag the server sent with the file, which a later fetch sends back through `If-None-Match`, left empty where it sent none. |
| `sha256` | A string | The SHA-256 digest of the file's bytes, in hexadecimal. |
| `size_bytes` | An integer from 0 | The size of the file. |
| `fetched` | A date and a time | The instant the file was fetched, in UTC. |
<!-- /manifest -->

## The Games Table

`games.parquet` is an Apache Parquet table holding one row for each stored game, in the columns `COLUMNS` in `src/scotch/index/schemas.py` declares:

<!-- columns -->
| **Column** | **Type** | **Meaning** |
|---|---|---|
| `game` | `UInt32` | The game's place in the index's order, from 0 |
| `errors` | `List(String)` | Each error the reader recorded |
| `origin` | `Struct({'address': String, 'place': UInt32})` | The address of the file the game was read from and its place there, counting from 1, as `Origin` holds them |
| `plies` | `UInt16` | The moves of the mainline, whose positions the index keys |
| `result` | `String` | The `Result` tag |
| `tags` | `List(Struct({'name': String, 'value': String}))` | Every other tag pair, each as a `name` and a `value` |
<!-- /columns -->

## The Positions File

`positions.bin` holds every position the stored games reach, keyed by its Zobrist hash, beside each game's moves, so a command maps it into memory and reads only what its lookup reaches. Its sections follow one another in the order `SECTIONS` in `rust/src/positions.rs` declares, a slot being a game's place in the file once the games are sorted by their moves:

<!-- sections -->
| **Section** | **Held As** | **Holds** |
|---|---|---|
| `magic` | 8 bytes | The bytes `scotch-1`, which change with the layout |
| `count` | An integer | The positions the stored games reach |
| `games` | A compact vector | Each slot's game, its row in `games.parquet` |
| `slots` | A compact vector | Each game's slot |
| `standings` | A compact vector | Each slot's rank among games tied on a run |
| `dates` | A compact vector | Each slot's `Date` tag as a number |
| `results` | A compact vector | Each slot's result, as its place among a win for White, a draw, a win for Black, and any other |
| `plies` | A compact vector | The moves each slot's mainline holds |
| `offsets` | An Elias-Fano sequence | The byte of `moves` each slot's moves open at, beside the byte past the last |
| `once` | An Elias-Fano sequence | The leading bits of each key one position of one game reaches |
| `blocks` | A compact vector | The block of slots holding the game reaching each key of `once` |
| `shared` | An Elias-Fano sequence | The leading bits of each key several positions reach |
| `boundaries` | An Elias-Fano sequence | The byte of `lists` each key of `shared` opens its list at, beside the byte past the last |
| `started` | A vector | Each slot whose tags name its start |
| `fens` | A vector | The `FEN` tag of each slot `started` lists |
| `variants` | A vector | The `Variant` tag of each slot `started` lists |
| `lists` | Bytes | The slots reaching each key of `shared`, by the ply each reaches it at |
| `moves` | Bytes | Each slot's mainline, encoded |
<!-- /sections -->

## The Manifest Copy

`scotch index games` copies the manifest the files were read under beside the index. A command reading the index compares that copy with the manifest a later fetch wrote, and where the two record different bytes for a file, `scotch match game` and every other such command print the line below before their output, written here under the default data directory:

<!-- warning -->
```text
The files under .cache/data/downloads have changed since the index was built from them, so run `scotch index games` to rebuild it
```
<!-- /warning -->
