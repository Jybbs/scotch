import { hexOf }        from '../front/example.ts'
import examples         from '../rendered/examples.json' with { type: 'json' }
import hashing          from '../rendered/hashing.json' with { type: 'json' }
import type { Piece }   from '../site/pieces.ts'
import { drawnOf }      from './drawn.ts'
import { exampleOf }    from './example.ts'
import type { Standing } from './standing.ts'

/**
 * One number of Polyglot's table a position's key combines: its place in the
 * table, what it stands for, the piece and the square it names where it names
 * one, and its sixteen hexadecimal digits.
 */
interface Term {
  index  : number
  name   : string
  piece  : Piece | null
  square : number | null
  value  : string
}

/**
 * A number one move turns in the key, beside whether the key gains it or loses
 * it.
 */
export interface Turned {
  joins : boolean
  term  : Term
}

/**
 * A position whose en passant file the key reads or leaves out: its key, the
 * key it takes with no en passant square, its FEN, and whether a legal move
 * plays the capture.
 */
export type Passant = (typeof hashing.passant)[number]

/**
 * The line Position Keys steps through up to the ply where the stored game
 * reaches its position by another order: the key and the pieces at each ply,
 * each move in Standard Algebraic Notation (SAN), the numbers each move turns,
 * the count of numbers the first key combines, the en passant positions, and
 * the stored game's moves, key, and players there.
 */
export interface Keyed {
  keys    : readonly string[]
  last    : number
  moves   : readonly string[]
  numbers : number
  passant : readonly Passant[]
  pieces  : readonly Standing[][]
  stored  : { key: string, moves: string, name: string }
  turns   : readonly (readonly Turned[])[]
}

/**
 * Reads the line of the methods example up to the start of its longest run,
 * where the stored game meets it by another order, out of the JSON `scotch
 * render docs` writes, each move's numbers leaving the key listed first.
 */
export function keyedOf(raw = examples.methods, read = hashing): Keyed {
  const drawn = drawnOf(exampleOf(raw))
  const last  = drawn.pair.longest.start
  return {
    keys    : raw.submitted.keys.slice(0, last + 1).map(key => hexOf(key)),
    last    : last,
    moves   : drawn.moves.submitted.slice(0, last + 1),
    numbers : read.line[0]!.joins.length,
    passant : read.passant,
    pieces  : drawn.pieces.submitted.slice(0, last + 1),
    turns   : read.line.slice(0, last + 1).map(({ joins, leaves }) =>
      [leaves, joins].flatMap((terms, at) => terms.map(term => ({ joins: at === 1, term: term as Term })))),
    stored  : {
      key   : hexOf(raw.stored.keys[last]!),
      moves : drawn.moves.stored.slice(1, last + 1).join(' ').replaceAll(/ \d+\.{3}/gu, ' '),
      name  : drawn.players
    }
  }
}

/**
 * Reads the square a move leaves and the square it enters, as the numbers it
 * turns name them.
 */
export function travelOf(turned: readonly Turned[]): { from?: number, to?: number } {
  const squareOf = (joins: boolean): number | undefined =>
    turned.find(it => it.joins === joins && it.term.square !== null)?.term.square ?? undefined
  return { from: squareOf(false), to: squareOf(true) }
}

/**
 * Groups a key's sixteen hexadecimal digits in fours, in capitals.
 */
export const grouped = (key: string): string => key.toUpperCase().match(/.{4}/gu)!.join(' ')
