import examples                    from '../rendered/examples.json' with { type: 'json' }
import { type Example, exampleOf } from '../methods/example.ts'
import { numbered }                from '../viewer/games.ts'

/**
 * The front page's example as its widgets read it: the line and the stored game
 * it meets by another order of moves, the moves each plays in SAN, and the
 * Zobrist key of each position each reaches as 16 hex digits.
 */
export interface Front {
  example : Example
  keys    : Readonly<Record<Game, readonly string[]>>
  moves   : Readonly<Record<Game, readonly string[]>>
}

/**
 * The two games of a match.
 */
export type Game = 'stored' | 'submitted'

type Raw = typeof examples.front

/**
 * Writes a key `scotch render docs` writes in decimal as the 16 hex digits of
 * its 64 bits.
 */
function hexOf(key: string): string {
  return BigInt(key).toString(16).padStart(16, '0')
}

/**
 * Reads the front page's example out of the JSON `scotch render docs` writes.
 */
export function frontOf(raw: Raw = examples.front): Front {
  const each = <T>(read: (side: Raw[Game]) => T): Record<Game, T> =>
    ({ stored: read(raw.stored), submitted: read(raw.submitted) })
  return {
    example : exampleOf(raw),
    keys    : each(side => side.keys.map(hexOf)),
    moves   : each(side => side.played.map(([san]) => san!))
  }
}

/**
 * Writes the move reaching a ply of a game behind its number, such as `7. O-O`,
 * or `Start` for the starting position.
 */
export function moveAt(front: Front, game: Game, ply: number): string {
  return ply ? numbered({ headers: {}, moves: [...front.moves[game]] }, ply - 1) : 'Start'
}

/**
 * Reads whether the two games' keys match at a ply.
 */
export function same(front: Front, ply: number): boolean {
  return front.keys.submitted[ply] === front.keys.stored[ply]
}
