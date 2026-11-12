# Shared Positions

A match runs only as far as the stored game it finds stays in positions the submitted game also reaches, so how long the stored games share their positions with one another bounds how far a match runs on the store. Each count below comes from one read of the index by `mise run docs:render`, a stored game playing another's whole mainline from its start counting as a copy of it, as [Matches the Rule Passes Over](../methods/limits.md) counts one, and a copy never counting as a second game sharing a position.

## Move by Move

At move 10, <!-- sharing-10 -->62%<!-- /sharing-10 --> of the stored games still playing stand in a position another stored game reaches, and by move 20, <!-- sharing-20 -->2%<!-- /sharing-20 -->, while half of the stored games stand alone by move <!-- alone-half -->11<!-- /alone-half -->. A move here counts White's move and Black's reply as one, read once Black has replied. The figure below fills the share still sharing at each move and sets beneath it a strip of the games first standing alone there, and the table beneath it reads every fifth move.

<!-- parting -->
| **Move** | **Still Playing** | **Sharing** | **Parting There** |
|---|---:|---:|---:|
| 0 | 1,150,156 | 100.0% | 0.0% |
| 5 | 1,149,242 | 97.2% | 1.9% |
| 10 | 1,141,623 | 61.7% | 11.4% |
| 15 | 1,114,877 | 14.5% | 5.4% |
| 20 | 1,069,643 | 2.0% | 0.8% |
| 25 | 993,428 | 0.4% | 0.1% |
| 30 | 882,329 | 0.1% | 0.0% |
| 35 | 734,470 | 0.1% | 0.0% |
| 40 | 585,747 | 0.1% | 0.0% |
<!-- /parting -->

## Across the Decades

The games of each decade part from the rest at a move of their own, the decades before 1900 counted together. The grid below shades each decade's share still sharing at each move and ticks the move by which half its games stand alone, and the table beneath it names that move and the moves the middle half of each decade's games part between, a dash marking a share the decade's games never reach by move 40.

<!-- partings -->
| **Decade** | **Games** | **Half Alone By** | **Middle Half** |
|---|---:|---:|---:|
| Before 1900 | 7,229 | 8 | 6 to 10 |
| 1900s | 4,648 | 9 | 7 to 11 |
| 1910s | 2,719 | 9 | 7 to 11 |
| 1920s | 6,735 | 9 | 7 to 11 |
| 1930s | 8,124 | 10 | 8 to 12 |
| 1940s | 6,957 | 10 | 8 to 12 |
| 1950s | 12,067 | 11 | 9 to 13 |
| 1960s | 17,753 | 11 | 9 to 13 |
| 1970s | 25,845 | 11 | 9 to 14 |
| 1980s | 48,522 | 12 | 9 to 14 |
| 1990s | 137,036 | 12 | 9 to 14 |
| 2000s | 191,385 | 12 | 10 to 15 |
| 2010s | 300,702 | 12 | 9 to 14 |
| 2020s | 380,433 | 11 | 9 to 13 |
<!-- /partings -->

## Crowded Positions

Of the distinct positions the index holds, <!-- once -->97%<!-- /once --> are reached by one stored game alone, whereas the positions more than <!-- crowd -->100<!-- /crowd --> stored games reach, the count past which [Matches the Rule Passes Over](../methods/limits.md) calls a position crowded, make up <!-- crowded-stood -->17%<!-- /crowded-stood --> of the positions the stored games stand in move by move. The tree below sets out the opening lines the most stored games play, each block as wide as the games playing its line, and the table beneath it counts the positions by how many stored games reach each.

<!-- crowding -->
| **Games Reaching** | **Positions** | **Share** | **Stood In** | **Crowded** |
|---|---:|---:|---:|---:|
| 1 | 70,605,016 | 97.09% | 72.3% | No |
| 2 | 1,162,315 | 1.60% | 2.4% | No |
| 3 to 5 | 569,687 | 0.78% | 2.1% | No |
| 6 to 10 | 189,442 | 0.26% | 1.4% | No |
| 11 to 20 | 95,839 | 0.13% | 1.4% | No |
| 21 to 50 | 58,790 | 0.08% | 1.9% | No |
| 51 to 100 | 19,901 | 0.03% | 1.4% | No |
| 101 to 200 | 10,239 | 0.01% | 1.5% | Yes |
| 201 to 500 | 6,217 | 0.01% | 2.0% | Yes |
| 501 to 1,000 | 1,943 | 0.00% | 1.4% | Yes |
| 1,001 to 2,000 | 1,034 | 0.00% | 1.5% | Yes |
| 2,001 to 5,000 | 626 | 0.00% | 2.0% | Yes |
| 5,001 to 10,000 | 178 | 0.00% | 1.3% | Yes |
| 10,001 to 20,000 | 77 | 0.00% | 1.1% | Yes |
| 20,001 to 50,000 | 45 | 0.00% | 1.5% | Yes |
| 50,001 to 100,000 | 18 | 0.00% | 1.2% | Yes |
| 100,001 to 200,000 | 7 | 0.00% | 1.1% | Yes |
| 200,001 to 500,000 | 3 | 0.00% | 0.9% | Yes |
| 500,001 to 1,000,000 | 1 | 0.00% | 0.6% | Yes |
| 1,000,001 to 2,000,000 | 1 | 0.00% | 1.2% | Yes |
<!-- /crowding -->
