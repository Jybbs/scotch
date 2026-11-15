# Methods

How does *Scotch* decide which stored game matches yours, and what can a match show? A match is the stored game sharing the longest unbroken run of positions with the game you submit, where a run follows both games forward one ply at a time from a position they share until their next positions differ. The match therefore answers which grandmaster game reached the same positions as yours for longest, and shows how that game went on from the last of them, whereas it scores neither continuation.

Each page of this section answers one question about the rule:

| **Page** | **Question It Answers** |
|---|---|
| [Position Keys](keys.md) | *What does a key cover, and how often do two positions share one by accident?* |
| [The Longest Run](runs.md) | *How does the search find the longest run through the index?* |
| [Matches the Rule Passes Over](limits.md) | *How often does the longest run pass over a match a reader would also want?* |

Each position of every stored game is hashed into a key once, when `scotch index games` builds the index, and each position of the submitted game is hashed the same way when `scotch match game` runs. The example match the [Viewer](../viewer/index.md) opens on, drawn below, shows the rule at work on a transposition. The two games open on different orders of moves, so the drawing lifts their first plies apart, and they reach one position after the same number of plies, from which the run follows both until the parting move. The match counts that run alone, because a run holds only the line both games play through without a break.
