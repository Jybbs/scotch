import { accumulated, quartiles } from '../data/numbers.ts'
import { figureOf }               from '../markdown/figures.ts'
import rules                      from '../rendered/rules.json' with { type: 'json' }
import limits                     from '../../../pages/methods/limits.md?raw'

/**
 * The sampled games counted by the length of their longest run, read from the
 * page's figures so the drawing and the sentence give one median and one
 * longest: the count at each length from 1, the lengths bounding the middle
 * half of the games, and the most games any one length holds.
 */
export interface Spread {
  counts  : number[]
  games   : number
  high    : number
  longest : number
  low     : number
  median  : number
  tallest : number
}

/**
 * Counts `lengths` by length from 1 to the longest `page` sets, bounding the
 * middle half where the running count reaches a quarter and three quarters of
 * the games.
 */
export function reachOf(lengths: readonly number[], page: string): Spread {
  const longest       = Number(figureOf(page, 'reach-longest'))
  const counts        = Array.from({ length: longest }, (_, at) =>
    lengths.filter(each => each === at + 1).length)
  const [low, , high] = quartiles(accumulated(counts))
  return {
    counts,
    games   : lengths.length,
    high    : high + 1,
    longest,
    low     : low + 1,
    median  : Number(figureOf(page, 'reach-median')),
    tallest : Math.max(...counts)
  }
}

/**
 * The reach of the sampled games' longest runs the limits page draws.
 */
export const REACH = reachOf(rules.lengths, limits)
