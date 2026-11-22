# Matches the Rule Passes Over

How often does the longest run pass over a match a reader would also want? The longest run is one reading of closeness among several, and the measures below count how often it passes over another. Each comes from <!-- sample -->1,000<!-- /sample --> stored games drawn at random, each matched as though submitted against every other stored game save those holding its whole mainline, and `mise run docs:render` counts them anew from the index. Each measure counts, among the sampled games some other stored game shares a position with, the share that meets its condition.

## How Far the Longest Run Reaches

The longest run of a sampled game holds <!-- reach-median -->19<!-- /reach-median --> positions at the median and <!-- reach-longest -->47<!-- /reach-longest --> at the most. In <!-- reach-later -->9%<!-- /reach-later --> of the sampled games it starts past the game's first position, so the match reads none of the positions the game reached before the run.

## Ties on the Longest Run

The measure counts the sampled games sharing a run as long as their longest with more than one stored game. In <!-- tied -->48%<!-- /tied --> of the sampled games one does, and the match names the first of them beside the count of the rest, as [The Longest Run](runs.md) sets out.

## Runs Through Crowded Positions

The measure counts the sampled games whose longest run lies wholly in positions more than <!-- crowd -->100<!-- /crowd --> other stored games reach. In <!-- crowded -->10%<!-- /crowded --> of the sampled games it does, so the match shows a well-trodden line rather than a game that reached a position few others did.

## Rarer Positions by Another Order

The measure counts the sampled games where a shorter run with some stored game reaches, by another order of moves, a position rarer than every position of the longest run, one fewer other stored games reach. In <!-- transposed -->56%<!-- /transposed --> of the sampled games one does, which the rule passes over because it counts positions rather than weighing how rare each one is.

## What a Match Cannot Show

A match shows the moves a stored game played and nothing more, so three things lie outside it:

- How good either continuation is, since no move of either game is scored, and the stored game's move from the parting position is the move a grandmaster played rather than the best move there
- Any move but the one the stored game played, since a match follows one stored game, and another stored game reaching the same position may have gone on differently
- The variations a stored game's annotator added, since the index reads each game's mainline alone, as [Reading a Game](reading.md) sets out
