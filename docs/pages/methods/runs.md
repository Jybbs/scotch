# The Longest Run

The index holds one row for each position of each stored game, naming the game, the position's key, its ply, and the move played from it. `scotch match game` looks up every key the submitted game reaches and keeps each stored row holding one of them, which leaves the positions the two games share.

## Following a Run

Two games share a run where they reach the same positions one ply after another, so along a run the stored game's ply less the submitted game's ply stays the same. The search groups the shared positions by stored game and by that difference, and splits each group wherever the submitted game's plies stop following one another, which leaves each unbroken run with its length and the ply it starts at.

## Runs Over Subsequences

Read as two strings of keys, two games share a run where they share a common substring, a stretch of consecutive positions both hold, and the match is the stored game holding the longest one.[^gusfield1997] A longest common subsequence instead pairs positions in their order while skipping any in either game, and the string-correction algorithm of Wagner and Fischer and the linear-space algorithm of Hirschberg both compute one,[^wagner1974][^hirschberg1975] so a subsequence can join two games that reach many of the same positions with different play between them. A run holds only the line both games play through without a break, so the move where the stored game parts is the one it played from the last position of that line.

## Another Move Order

A key names the position rather than the moves reaching it, so a game reaching a stored position by another order of moves still meets the stored game there, and a run starts at that position whatever ply each game reaches it at. The run then ends at the last position the two share, where the stored game either plays a move the submitted game did not play or ends.

## Stepping Through a Match

Stepping through a match sets the two games' positions on one board, each square they differ on washed in the color of the game standing a piece there, or split between the two colors where each stands a different piece. A line built for this page plays the King's Indian Defense in its usual order of moves, whereas <!-- methods-white -->Timman<!-- /methods-white --> and <!-- methods-black -->Klein<!-- /methods-black -->'s game from the <!-- methods-event -->77th Tata Steel GpB<!-- /methods-event --> <!-- methods-year -->2015<!-- /methods-year --> reached the same position by another order, as `mise run docs:render` finds by matching the line against the index. The two meet at ply <!-- methods-start -->7<!-- /methods-start -->, share every position from there through ply <!-- methods-end -->17<!-- /methods-end -->, <!-- methods-run -->11<!-- /methods-run --> in a row, and part where the stored game played <!-- methods-parting -->9...Nc7<!-- /methods-parting -->.

## Choosing Among Runs

The longest run wins, and where two stored games share runs as long, the match names the one whose run starts earliest in the submitted game, then the one the index holds first, which is the one from the archive `sources.toml` declares first or, within one archive, the one that archive holds first.

[^gusfield1997]: Gusfield, Dan. 1997. "Algorithms on Strings, Trees, and Sequences: Computer Science and Computational Biology," Section 7.4. <https://doi.org/10.1017/CBO9780511574931>

[^wagner1974]: Wagner, Robert A., and Michael J. Fischer. 1974. "The String-to-String Correction Problem," Journal of the ACM, volume 21, number 1, pages 168 to 173. <https://doi.org/10.1145/321796.321811>

[^hirschberg1975]: Hirschberg, D. S. 1975. "A Linear Space Algorithm for Computing Maximal Common Subsequences," Communications of the ACM, volume 18, number 6, pages 341 to 343. <https://doi.org/10.1145/360825.360861>
