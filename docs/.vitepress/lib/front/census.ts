import { FIRST_CELL }          from '../data/decades.ts'
import { summed }              from '../data/numbers.ts'
import { type Archive, STORE } from '../data/store.ts'

/**
 * The games the store holds from one decade, the decades before `FIRST_CELL`
 * gathered under the decade before it, beside the archives holding games from
 * it and the three holding the most, and the decade named as the clock line
 * names it, as its row beside the board names it, and as a sentence names it.
 */
export interface Decade {
  archives : number
  decade   : number
  games    : number
  name     : string
  short    : string
  top      : readonly { games: number, name: string }[]
  when     : string
}

/**
 * One part of a square of the store's board, the share of the square's games
 * from below at which it starts and the share it fills, the square it sits on
 * counted from a1 along each rank, and the decade it holds.
 */
export interface Fill {
  decade : number
  from   : number
  share  : number
  square : number
}

/**
 * The squares of a board.
 */
export const SQUARES = 64

/**
 * Counts the store's games by decade across every archive, gathering every
 * decade before `FIRST_CELL` into the one before it, which reads as the games
 * before that year.
 *
 * Args:
 *   files : The archives the store holds.
 */
export function decadesOf(files: readonly Archive[] = STORE.files): Decade[] {
  const counts   = files.flatMap(file => Object.entries(file.decades).map(([decade, games]) => ({
    decade : Math.max(FIRST_CELL - 10, Number(decade)),
    games  : games!,
    name   : file.name
  })))
  const gathered = Map.groupBy(counts, each => each.decade)
  return [...gathered]
    .toSorted(([a], [b]) => a - b)
    .map(([decade, held]) => ({
      archives : new Set(held.map(each => each.name)).size,
      decade   : decade,
      games    : summed(held.map(each => each.games)),
      name     : decade < FIRST_CELL ? `Before ${FIRST_CELL}` : `The ${decade}s`,
      short    : decade < FIRST_CELL ? `< ${FIRST_CELL}` : `${decade}s`,
      top      : held.toSorted((a, b) => b.games - a.games).slice(0, 3),
      when     : decade < FIRST_CELL ? `before ${FIRST_CELL}` : `in the ${decade}s`
    }))
}

/**
 * Lays the store's games across the 64 squares of a board, each square
 * holding a 64th of them, filled from a1 along each rank by the decade they
 * were played in, so a decade spilling past one square goes on in the next.
 */
export function fillsOf(decades: readonly Decade[]): Fill[] {
  const per   = summed(decades.map(each => each.games)) / SQUARES
  const fills = [] as Fill[]
  let cursor  = 0
  for (const [index, { games }] of decades.entries()) {
    let left = games
    while (left > per * 1e-9) {
      const square = Math.min(SQUARES - 1, Math.floor(cursor / per))
      const share  = Math.min((square + 1) * per - cursor, left)
      fills.push({ decade: index, from: (cursor - square * per) / per, share: share / per, square })
      cursor += share
      left   -= share
    }
  }
  return fills
}
