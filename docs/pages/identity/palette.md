# Palette and Roles

Every color on the site resolves through the palette, the roles naming where each color is used, and the order a chart takes its series in. Each drawing below reads the values `mise run docs:render` writes from the identity's declaration, and the table folded beneath each one holds every value it shows.

## The Palette

Every color on the site comes from this palette or from white and black, alone or mixed with a palette color, and each palette color holds a stated contrast against each ground in both schemes. A role names where a color is used, so a page never sets a hex by hand.

<!-- palette -->
| **Color** | **Token** | **Hex** | **Meaning** | **Roles** |
|---|---|---|---|---|
| Brick Red | `critical` | `#c43e47` | The critical state, always beside an icon and a label, and the Reference section's own color, which marks the section on its link card and carries no state there. | mixed in `alert` |
| Near Black | `dark` | `#1a1a1a` | The dark ground, and body text on the light ground. | `ink`, `page`, mixed in `alert`, `data_black`, `data_edge`, `glyph_dark`, `glyph_light`, `quiet`, `raised`, `rule`, `side`, `tint` |
| Cararra | `ground` | `#f2f1ee` | The light ground, and light text on the dark ground. | `ink`, `page`, mixed in `alert`, `data_edge`, `glyph_dark`, `glyph_light`, `quiet`, `raised`, `rule`, `side`, `tint` |
| Cashmere | `light` | `#e3c3a3` | The board's light squares, and the lead on the dark ground. | `run`, mixed in `glyph_dark`, `glyph_light`, `tint` |
| Walnut | `primary` | `#764017` | The lead color, the logo's piece, links on the light ground, and the board's dark squares. | `run`, mixed in `glyph_dark`, `tint` |
| Persian Green | `series_1` | `#009b98` | The first series color. | No role, a chart series |
| Matisse | `series_2` | `#1e69a6` | The second series color. | `submitted` |
| Buttered Rum | `series_3` | `#a17b0d` | The third series color, the clock's brass. | `stored` |
| Ube | `series_4` | `#8a80cb` | The fourth series color. | No role, a chart series |
| Forest Green | `series_5` | `#1e7634` | The fifth series color. | No role, a chart series |
| Red Violet | `series_6` | `#a738a2` | The sixth series color, the Viewer section's own, which no chart's series order takes. | No role, a chart series |
| Mandarin Pearl | `warning` | `#f48241` | The warning state, always beside an icon and a label. | No role |

| **Token** | **On `page`, Light** | **On `page`, Dark** | **On `raised`, Light** | **On `raised`, Dark** | **On `side`, Light** | **On `side`, Dark** | **On `tint`, Light** | **On `tint`, Dark** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `critical` | 4.50:1 | 3.42:1 | 4.83:1 | 3.01:1 | 4.83:1 | 3.89:1 | 3.69:1 | 2.77:1 |
| `dark` | 15.41:1 | 1.00:1 | 16.51:1 | 1.14:1 | 16.51:1 | 1.14:1 | 12.63:1 | 1.24:1 |
| `ground` | 1.00:1 | 15.41:1 | 1.07:1 | 13.57:1 | 1.07:1 | 17.53:1 | 1.22:1 | 12.46:1 |
| `light` | 1.48:1 | 10.44:1 | 1.58:1 | 9.20:1 | 1.58:1 | 11.88:1 | 1.21:1 | 8.44:1 |
| `primary` | 7.39:1 | 2.09:1 | 7.92:1 | 1.84:1 | 7.92:1 | 2.37:1 | 6.06:1 | 1.69:1 |
| `series_1` | 3.03:1 | 5.09:1 | 3.24:1 | 4.48:1 | 3.24:1 | 5.79:1 | 2.48:1 | 4.12:1 |
| `series_2` | 5.13:1 | 3.01:1 | 5.49:1 | 2.65:1 | 5.49:1 | 3.42:1 | 4.20:1 | 2.43:1 |
| `series_3` | 3.47:1 | 4.44:1 | 3.72:1 | 3.91:1 | 3.72:1 | 5.05:1 | 2.85:1 | 3.59:1 |
| `series_4` | 3.08:1 | 5.00:1 | 3.30:1 | 4.40:1 | 3.30:1 | 5.69:1 | 2.53:1 | 4.04:1 |
| `series_5` | 5.03:1 | 3.06:1 | 5.39:1 | 2.70:1 | 5.39:1 | 3.48:1 | 4.12:1 | 2.48:1 |
| `series_6` | 4.98:1 | 3.09:1 | 5.34:1 | 2.72:1 | 5.34:1 | 3.52:1 | 4.08:1 | 2.50:1 |
| `warning` | 2.29:1 | 6.73:1 | 2.45:1 | 5.92:1 | 2.45:1 | 7.65:1 | 1.88:1 | 5.44:1 |
<!-- /palette -->

## The Roles

A page never names a color, because each part takes a role that resolves to one color in each scheme, so a chart and a page share one word for one use.

<!-- roles -->
| **Role** | **Kind** | **Meaning** | **Light** | **Dark** |
|---|---|---|---|---|
| `alert` | text | A message that something failed. | `#98383c`, critical 76% dark, 6.27:1 | `#de8d8b`, critical 58% ground, 6.87:1 |
| `data_black` | fill | The fill of Black's share of a chart's bar. | `#1a1a1a`, dark, 15.41:1 | `#010101`, dark 30% black, 1.20:1 |
| `data_edge` | mark | The outline a chart's bar holds a white share inside. | `#1a1a1a`, dark, 15.41:1 | `#7d7c7b`, ground 50% dark, 4.18:1 |
| `glyph_dark` | fill | The glyph a dark square draws under a page's text. | `#d6c6bb`, ground 77% primary, 1.47:1 | `#322e2b`, dark 86% light, 1.29:1 |
| `glyph_light` | fill | The glyph a light square draws under a page's text. | `#eee4d9`, ground 72% light, 1.11:1 | `#403a35`, dark 78% light, 1.55:1 |
| `ink` | text | The text of a page. | `#1a1a1a`, dark, 15.41:1 | `#f2f1ee`, ground, 15.41:1 |
| `page` | ground | The ground of a page. | `#f2f1ee`, ground, 1.00:1 | `#1a1a1a`, dark, 1.00:1 |
| `quiet` | text | The text of a caption or a label. | `#4f4e4e`, dark 72% ground, 7.34:1 | `#a1a09e`, ground 66% dark, 6.66:1 |
| `raised` | ground | The ground of a card standing over a page. | `#f9f9f7`, ground 45% white, 1.07:1 | `#252525`, dark 94% white, 1.14:1 |
| `rule` | rule | A line between two parts of a page. | `#bdbcba`, ground 78% dark, 1.68:1 | `#474646`, dark 76% ground, 1.85:1 |
| `run` | text | A link, and the positions two games share. | `#764017`, primary, 7.39:1 | `#e3c3a3`, light, 10.44:1 |
| `side` | ground | The ground of the sidebar. | `#f9f9f7`, ground 45% white, 1.07:1 | `#0a0a0a`, dark 66% black, 1.14:1 |
| `stored` | mark | The stored game. | `#a17b0d`, series_3, 3.47:1 | `#a17b0d`, series_3, 4.44:1 |
| `submitted` | mark | The submitted game. | `#1e69a6`, series_2, 5.13:1 | `#1e69a6`, series_2, 3.01:1 |
| `tint` | ground | The ground of a note or a picked row. | `#e3dad3`, ground 88% primary, 1.22:1 | `#2e2b28`, dark 88% light, 1.24:1 |
<!-- /roles -->

## The Chart Series

A chart takes its colors in the order the series below sets them, and the drawing gives each series one player file from the store. Each file's games are counted by decade from the index, so the drawing changes as the store does.

<!-- series -->
| **Decade** | **Alekhine, `series_1`, `#009b98`** | **Botvinnik, `series_2`, `#1e69a6`** | **Spassky, `series_3`, `#a17b0d`** | **Karpov, `series_4`, `#8a80cb`** | **Anand, `series_5`, `#1e7634`** |
|---|---:|---:|---:|---:|---:|
| 1900s | 44 | 0 | 0 | 0 | 0 |
| 1910s | 176 | 0 | 0 | 0 | 0 |
| 1920s | 655 | 41 | 0 | 0 | 0 |
| 1930s | 621 | 193 | 0 | 0 | 0 |
| 1940s | 165 | 145 | 0 | 0 | 0 |
| 1950s | 0 | 230 | 172 | 0 | 0 |
| 1960s | 0 | 242 | 336 | 62 | 0 |
| 1970s | 0 | 16 | 207 | 454 | 0 |
| 1980s | 0 | 0 | 349 | 630 | 301 |
| 1990s | 0 | 0 | 180 | 814 | 973 |
| 2000s | 0 | 0 | 18 | 565 | 1,149 |
| 2010s | 0 | 0 | 0 | 244 | 1,295 |
| 2020s | 0 | 0 | 0 | 29 | 476 |
<!-- /series -->
