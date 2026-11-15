# Faces and Pieces

The site sets its text in three faces and its positions on one board with one set of pieces. Each drawing below reads the values `mise run docs:render` writes from the identity's declaration, and the table folded beneath each one holds every value it shows.

## The Faces

Three faces set the site, one for headings, one for reading, and one for anything that has to line up. Each face comes from its own package under the SIL Open Font License, so the site serves the files it builds with.

<!-- faces -->
| **Slot** | **Face** | **Package** | **License** | **Sets** |
|---|---|---|---|---|
| `body` | Petrona | `@fontsource-variable/petrona` 5.3.0 | SIL Open Font License 1.1 | The body text, a text serif with a weight axis from 100 to 900 and matching italics. |
| `code` | JetBrains Mono | `@fontsource-variable/jetbrains-mono` 5.3.0 | SIL Open Font License 1.1 | The code, the move lists, and the figures, with tabular numerals wherever digits line up. |
| `display` | Hedvig Letters Serif | `@fontsource-variable/hedvig-letters-serif` 5.3.1 | SIL Open Font License 1.1 | The headings and the wordmark, an old-style serif with an optical-size axis from 12 to 24 at its one weight. |
<!-- /faces -->

## The Board and Pieces

Every drawing on the site sets the same board in Cashmere and Walnut and the same pieces, so a position reads alike on every page. The pieces are Colin M.L. Burnett's set, as [python-chess ships it](https://python-chess.readthedocs.io/en/v1.11.2/svg.html), triple licensed under the GFDL, BSD, and GPL.

<!-- pieces -->
| **Part** | **Name** | **Source** | **Value** |
|---|---|---|---|
| Light square | Cashmere | Palette | `#e3c3a3` |
| Dark square | Walnut | Palette | `#764017` |
| Pieces | Colin M.L. Burnett's set | python-chess | GFDL, BSD, GPL |

| **Piece** | **Symbol** | **Square** | **Squares Reached** |
|---|---:|---:|---:|
| White bishop | `B` | d4 | 13 |
| White king | `K` | d4 | 8 |
| White knight | `N` | d4 | 8 |
| White pawn | `P` | d2 | 2 |
| White queen | `Q` | d4 | 27 |
| White rook | `R` | d4 | 14 |
| Black bishop | `b` | d5 | 13 |
| Black king | `k` | d5 | 8 |
| Black knight | `n` | d5 | 8 |
| Black pawn | `p` | d7 | 2 |
| Black queen | `q` | d5 | 27 |
| Black rook | `r` | d5 | 14 |
<!-- /pieces -->
