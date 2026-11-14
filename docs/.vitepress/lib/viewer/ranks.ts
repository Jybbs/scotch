import rendered from '../rendered/ratings.json' with { type: 'json' }

import type { Piece } from '../site/pieces.ts'
import type { Side }  from './examples.ts'

/**
 * One rank the stored games tied on a run are set in by their players' mean
 * rating: the piece its chip is drawn on, the lowest mean rating it holds, and
 * the words naming its ratings.
 */
export interface Rank {
  floor : number
  piece : Piece
  words : string
}

/**
 * The tags of a stored game tied on a run that its rank is read from.
 */
export type Tied = Pick<Side, 'headers'>

/**
 * The most dots a rank's chip carries, one per game up to it.
 */
const DOTS = 7
/**
 * The ranks from the highest, each on a piece from the queen to the pawn, the
 * last holding every game below 2400 and every game rating neither player.
 */
export const RANKS = [
  { floor: 2700,      piece: 'Q', words: '2700 and up'           },
  { floor: 2600,      piece: 'R', words: '2600 to 2699'          },
  { floor: 2500,      piece: 'B', words: '2500 to 2599'          },
  { floor: 2400,      piece: 'N', words: '2400 to 2499'          },
  { floor: -Infinity, piece: 'P', words: 'below 2400 or unrated' }
] as const satisfies readonly Rank[]

/**
 * Reads the mean of the two players' ratings, rounded, or the one rating a
 * game's tags carry, a rating being a whole number from 1 to the ceiling the
 * index reads ratings under, or none where neither tag carries one.
 */
function ratingOf({ headers }: Tied): number | undefined {
  const ratings = [headers.WhiteElo, headers.BlackElo]
    .filter((tag): tag is string => !!tag && /^\d+$/u.test(tag))
    .map(Number)
    .filter(rating => rating > 0 && rating <= rendered.ceiling)
  if (ratings.length === 0) return undefined
  return Math.round(ratings.reduce((sum, rating) => sum + rating) / ratings.length)
}

/**
 * Lists the place inside a rank of `count` games that each of its dots opens
 * on, one dot per game up to `cap`, and past that `cap` dots each opening an
 * even share of the rank.
 */
export function dotsOf(count: number, cap = DOTS): number[] {
  const dots = Math.min(count, cap)
  return Array.from({ length: dots }, (_, at) => count <= cap ? at : Math.ceil(at / cap * count))
}

/**
 * Reads which dot of a rank of `count` games stands for the game at `here`
 * inside it, the dot whose share holds it once the rank holds more than `cap`.
 */
export function dotOf(here: number, count: number, cap = DOTS): number {
  return count <= cap ? here : Math.min(cap - 1, Math.floor(here / count * cap))
}

/**
 * Reads the rank holding a game, by the players' mean rating.
 */
export function rankOf(tied: Tied): number {
  const rating = ratingOf(tied) ?? -1
  return RANKS.findIndex(({ floor }) => rating >= floor)
}

/**
 * Lists the place of each tied game inside `ties` by the rank holding it, the
 * highest rank first and each rank's games in the order the match ranks them.
 */
export function ranked(ties: readonly Tied[]): number[][] {
  const ranks = RANKS.map((): number[] => [])
  for (const [at, tied] of ties.entries()) ranks[rankOf(tied)]!.push(at)
  return ranks
}
