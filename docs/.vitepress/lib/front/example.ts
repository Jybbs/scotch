import examples from '../rendered/examples.json' with { type: 'json' }

interface Arc {
  moves  : Move[]
  shared : boolean[]
}

export type Game = (typeof GAMES)[number]
export type Kind = (typeof KINDS)[number]

export interface Move {
  kind : Kind
  san  : string
}

/**
 * The two games the oval plays, an arc each, how many plies it shows, and, for
 * each of those plies, whether either arc reaches a position there the two
 * games share.
 */
export interface Oval {
  bot    : Arc
  shared : boolean[]
  shown  : number
  top    : Arc
}

interface Rendered {
  span      : { length: number, offset: number, start: number }
  stored    : Side
  submitted : Side
}

interface Side {
  frames : unknown[]
  played : string[][]
}

/**
 * The oval's two arcs in the order the field lays their pieces out, the
 * submitted line's top arc first and the stored game's bottom arc after it.
 */
export const GAMES = ['top', 'bot'] as const
/**
 * The kinds of piece the set draws, each named by its lowercase symbol in
 * Forsyth–Edwards Notation.
 */
export const KINDS = ['b', 'k', 'n', 'p', 'q', 'r'] as const

function arcOf(side: Side, length: number, shown: number, start: number): Arc {
  return {
    moves  : side.played.map(([san = '', symbol = '']) => ({ kind: kindOf(symbol), san })),
    shared : Array.from({ length: shown }, (_, k) => k + 1 >= start && k + 1 < start + length)
  }
}

function kindOf(symbol: string): Kind {
  const kind = KINDS.find(each => each === symbol.toLowerCase())
  if (!kind) throw new Error(`no piece of the set has the symbol ${symbol}`)
  return kind
}

/**
 * Names the piece of the oval playing ply `k` of one game, the key the scene
 * finds that piece by while a loose piece makes way.
 */
export function moteId(game: Game, k: number): string {
  return `${k}${game}`
}

/**
 * Reads the two games the front page's oval plays from an example the index
 * matched, the submitted line on the top arc and the stored game it meets on
 * the bottom arc, each with every move it plays and, for each ply the oval
 * shows, whether the position that ply reaches is one the two games share,
 * counted from the span the match found in each game. The oval shows as many
 * plies as the shorter of the two drawn games holds frames for, and marks each
 * one at which either arc reaches a shared position.
 */
export function ovalOf(example: Rendered = examples.front): Oval {
  const { span, stored, submitted } = example
  const shown                       = Math.min(stored.frames.length, submitted.frames.length) - 1
  const bot                         = arcOf(stored, span.length, shown, span.start + span.offset)
  const top                         = arcOf(submitted, span.length, shown, span.start)

  return {
    bot    : bot,
    shared : top.shared.map((on, k) => on || bot.shared[k]!),
    shown  : shown,
    top    : top
  }
}
