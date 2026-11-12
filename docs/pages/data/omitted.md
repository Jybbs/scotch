# Games Left Out

The fetched files hold <!-- left-read -->4,806,573<!-- /left-read --> games, and the index keeps <!-- left-kept -->1,150,156<!-- /left-kept --> of them and leaves out <!-- left-out -->3,656,417<!-- /left-out -->. Each build of the index records every game it leaves out beside its reason, and each count below comes from that record by `mise run docs:render`.

## The Ledger

The index leaves out <!-- left-below -->3,218,362<!-- /left-below --> Openings games rated under the floor `sources.toml` declares, <!-- left-repeat -->438,048<!-- /left-repeat --> repeats of a game a file declared earlier holds, <!-- left-unread -->7<!-- /left-unread --> games whose moves the reader cannot play, and <!-- left-variant -->0<!-- /left-variant --> games of a variant other than standard chess. The bars below split the games each section's files hold into the games kept and each reason, and a pressed segment lists the files behind it. The table beneath them counts each section, the reasons ranked by the games each takes.

<!-- ledger -->
| **Section** | **Files** | **Read** | **Kept** | **Below** | **Repeats** | **Unread** | **Variants** |
|---|---:|---:|---:|---:|---:|---:|---:|
| Players | 250 | 525,802 | 435,045 | 0 | 90,754 | 3 | 0 |
| Events | 982 | 87,426 | 31,481 | 0 | 55,945 | 0 | 0 |
| Openings | 233 | 4,193,345 | 683,630 | 3,218,362 | 291,349 | 4 | 0 |
<!-- /ledger -->

## The Rating Floor

An Openings game reaches the store only where the higher of its two ratings reaches the floor, as [Data](index.md) sets out. The grid below counts every Openings game by the decade it was played in and by its higher rating, the unrated games in a row of their own, and a floor dragged up or down the ratings lights the games it keeps. The table beneath it counts each decade's Openings games, those carrying no rating, those under the floor, and those it keeps.

<!-- floors -->
| **Decade** | **Games** | **Unrated** | **Under the Floor** | **Kept** |
|---|---:|---:|---:|---:|
| Before 1900 | 6,891 | 6,888 | 3 | 0 |
| 1900s | 4,506 | 4,505 | 1 | 0 |
| 1910s | 2,852 | 2,852 | 0 | 0 |
| 1920s | 5,727 | 5,727 | 0 | 0 |
| 1930s | 9,689 | 9,689 | 0 | 0 |
| 1940s | 10,257 | 10,257 | 0 | 0 |
| 1950s | 24,219 | 24,218 | 0 | 1 |
| 1960s | 45,858 | 45,857 | 0 | 1 |
| 1970s | 62,734 | 20,978 | 26,465 | 15,291 |
| 1980s | 159,087 | 28,365 | 94,250 | 36,472 |
| 1990s | 724,891 | 152,574 | 452,918 | 119,399 |
| 2000s | 631,078 | 26,117 | 427,949 | 177,012 |
| 2010s | 1,090,164 | 11,271 | 798,203 | 280,690 |
| 2020s | 1,415,391 | 8,559 | 1,060,716 | 346,116 |
<!-- /floors -->
