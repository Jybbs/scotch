# Methods

A match is the stored game sharing the longest unbroken run of positions with the game you submit, where a run follows both games forward one ply at a time from a position they share until their next positions differ. The match therefore answers which grandmaster game reached the same positions as yours for longest, and shows how that game went on from the last of them, whereas it scores neither continuation.

## From Keys to a Match

Each position of every stored game is hashed into a key once, when `scotch index games` builds the index, and each position of the submitted game is hashed the same way when `scotch match game` runs. [Position Keys](keys.md) sets out what a key covers and how often two positions share one by accident, [The Longest Run](runs.md) follows the search for the run through the index, and [Matches the Rule Passes Over](limits.md) measures how often the longest run passes over a match a reader would also want.
