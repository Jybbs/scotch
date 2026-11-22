import { figureOf } from '../markdown/figures.ts'
import rules        from '../rendered/rules.json' with { type: 'json' }
import page         from '../../../pages/methods/limits.md?raw'
import { Pair }     from './runs.ts'

type Measure = keyof typeof rules.picked

/**
 * One sampled match drawn for a measure: the sampled game and the stored game
 * it was matched against, their pair, the plies the drawing boxes, and whether
 * it stands for another stored game the match does not draw.
 */
export interface Sampled {
  box?   : [number, number]
  game   : number
  other  : boolean
  pair   : Pair
  stored : number
}

/**
 * One measure the page counts: its name, the share of the sampled games
 * meeting it, the clause its share opens, the match the rule names, what the
 * rule passes over, drawn where a match shows it, and the sentence under
 * them.
 */
export interface Passed {
  clause : string
  name   : string
  named  : Sampled
  over?  : Sampled
  says   : string
  share  : number
}

/**
 * Reads the pair of games the page picked for a measure, with every run they
 * share.
 */
const pairOf = (measure: Measure): Pair => {
  const { plies, runs } = rules.picked[measure]
  return new Pair(plies as [number, number], runs)
}

/**
 * Reads the plies of a measure's longest run, both counted.
 */
const runOf = (measure: Measure): [number, number] => {
  const { length, start } = pairOf(measure).longest
  return [start, start + length - 1]
}

/**
 * Reads the share of the sampled games meeting a measure, in whole percent,
 * from the figure the page sets, such as `48%`.
 */
const shareOf = (figure: string): number => Number(figureOf(page, figure).slice(0, -1))

/**
 * Reads the match the page picked for a measure, boxing the plies `box` names,
 * and standing for another stored game where `other` is set.
 */
const sampledOf = (measure: Measure, box?: [number, number], other = false): Sampled =>
  ({ box, game: rules.picked[measure].game, other, pair: pairOf(measure), stored: rules.picked[measure].stored })

/**
 * The four measures the page counts, in its order, each with its share read
 * from the figure the page sets.
 */
export const PASSED: readonly Passed[] = [{
  clause : 'the longest run starts past the first position',
  name   : 'Runs starting later',
  named  : sampledOf('later', [0, pairOf('later').longest.start - 1]),
  says   : 'The positions in the box come before the run, so the match reads none of them.',
  share  : shareOf('reach-later')
}, {
  clause : 'another stored game shares a run as long',
  name   : 'Ties',
  named  : sampledOf('tied'),
  over   : sampledOf('twin', undefined, true),
  says   : 'Another stored game shares a run as long, which the match counts beside its own and does not draw.',
  share  : shareOf('tied')
}, {
  clause : `the run lies wholly in positions over ${rules.crowd} other games reach`,
  name   : 'Crowded positions',
  named  : sampledOf('crowded', runOf('crowded')),
  says   : `Every position in the box is one over ${rules.crowd} other stored games reach, so the match shows a `
         + 'well-trodden line.',
  share  : shareOf('crowded')
}, {
  clause : 'a shorter run reaches a rarer position by another order',
  name   : 'Rarer by another order',
  named  : sampledOf('passing'),
  over   : sampledOf('transposed', runOf('transposed')),
  says   : 'A shorter run with another stored game reaches, by another order of moves, a position fewer stored '
         + 'games reach than any of the longest run.',
  share  : shareOf('transposed')
}]

/**
 * The count of sampled games each share is taken over.
 */
export const MATCHED = rules.matched
