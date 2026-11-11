# The Match File

`scotch match game --json` writes the match as one JSON object holding the submitted game, the stored game, and the run the two share, which the [Viewer](../viewer/index.md) opens, and `-` in place of a path prints the object alone. Each table below is written by `mise run docs:render` from the record declaring it in `src/scotch/index/schemas.py`.

<!-- export -->
| **Field** | **Type** | **Meaning** |
|---|---|---|
| `submitted` | An object, as `Side` holds it | The submitted game. |
| `span` | An object, as `Span` holds it, or `null` | The run of positions the two games share, left empty where no stored game shares a position with the submitted game. |
| `stored` | An object, as `Side` holds it, or `null` | The stored game, left empty where no stored game shares a position with the submitted game. |
| `ties` | An integer from 0 | The count of other stored games sharing a run as long as the stored game's, 0 where none does or where no stored game shares a position. |
<!-- /export -->

## Each Game

`submitted` and `stored` each hold one game in the fields `Side` declares:

<!-- side -->
| **Field** | **Type** | **Meaning** |
|---|---|---|
| `headers` | An object of strings | The value of each tag pair keyed by its name. |
| `moves` | An array of strings | The moves of the mainline in Standard Algebraic Notation (SAN). |
| `placements` | An array of strings | The piece placement of each position from the start, one more than the moves. |
<!-- /side -->

## The Run

`span` holds the run the two games share in the fields `Span` declares, its first position at ply `start` of the submitted game and ply `start` plus `offset` of the stored game:

<!-- span -->
| **Field** | **Type** | **Meaning** |
|---|---|---|
| `length` | An integer from 1 | The number of positions the run holds. |
| `offset` | An integer | The stored game's ply minus the submitted game's ply, the same at every position of the run. |
| `start` | An integer from 0 | The submitted game's ply at the first position of the run. |
<!-- /span -->

## The Demo's File

[`demo.json`](/matches/demo.json) is the file `scotch match game docs/public/games/demo.pgn --json` writes, which `mise run docs:render` writes from the index. Where no stored game shares a position with the submitted game, `span` and `stored` are `null` and `ties` is 0, as [`alone.json`](/matches/alone.json) holds for the demo game read with no index.

## The Address

`scotch match game --link` prints the address of the Viewer holding the same object in its fragment after `#match=`, deflated into a ZLIB stream and encoded in unpadded base64url, so the Viewer opens the match without a file, and the browser sends none of it to a server. The demo's address runs to <!-- link -->1,764<!-- /link --> characters.
