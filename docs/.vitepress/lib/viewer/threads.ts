import type { Loaded, Party } from './loaded.ts'
import { rowAt }              from './sheet.ts'
import type { Point }         from './trail.ts'

/**
 * Where the gutter between the two sheets sits and how tall a row is, in pixels
 * from the top left of the list of rows, beside the first row's index and
 * whether the submitted game opens on Black's move.
 */
export interface Gutter {
  first  : number
  left   : number
  row    : number
  top    : number
  width  : number
}

/**
 * The width of the run's band in pixels, its ends rounded through half of it.
 */
const BAR = 7
/**
 * The share of the gutter's width each game's thread runs down while the two
 * differ, and the share of a row's height White's ply and Black's sit at.
 */
const LANES = { black: 0.72, stored: 0.78, submitted: 0.22, white: 0.28 } as const

/**
 * Lays out the picture of the two sequences in the gutter between the sheets:
 * each game as a thread through a point at every ply it holds, the two joining
 * into one at the gutter's middle while they share a position, the run's band
 * down the middle, and where each game's ring stands at a cursor.
 */
export class Threads {
  readonly #gutter : Gutter
  readonly #loaded : Loaded

  /**
   * Takes the loaded match and the gutter's place in the list of rows.
   */
  constructor(gutter: Gutter, loaded: Loaded) {
    this.#gutter = gutter
    this.#loaded = loaded
  }

  /**
   * Lays out the run's band as a rounded rectangle around the middle of the
   * gutter from the first position the two share to the last, or `undefined`
   * where they share none.
   */
  get band(): { height: number, rx: number, width: number, x: number, y: number } | undefined {
    const shared = this.#loaded.shared
    if (!shared) return undefined
    const top = this.#yAt(shared.meet)
    return {
      height : this.#yAt(shared.last) - top + BAR,
      rx     : BAR / 2,
      width  : BAR,
      x      : this.#middle - BAR / 2,
      y      : top - BAR / 2
    }
  }

  get #middle(): number {
    return this.#gutter.left + this.#gutter.width / 2
  }

  /**
   * Writes one game's thread as an SVG path through a point at every ply it
   * holds, a curve where it moves between its lane and the middle, or an empty
   * path for a game the match leaves out.
   */
  pathOf(party: Party): string {
    const points = [] as Point[]
    for (let cursor = this.#loaded.first; cursor <= this.#loaded.last; cursor++) {
      if (this.#loaded.has(party, cursor)) points.push(this.ringAt(party, cursor))
    }
    return points.map(({ x, y }, at) => {
      if (!at) return `M${x} ${y}`
      const before = points[at - 1]!
      const middle = (before.y + y) / 2
      return before.x === x ? `L${x} ${y}` : `C${before.x} ${middle} ${x} ${middle} ${x} ${y}`
    }).join('')
  }

  /**
   * Reads where a game's ring stands at a cursor, in its lane, or at the middle
   * while the two games share the position.
   */
  ringAt(party: Party, cursor: number): Point {
    return { x: this.#loaded.sharing(cursor) ? this.#middle : this.#laneOf(party), y: this.#yAt(cursor) }
  }

  #laneOf(party: Party): number {
    return this.#gutter.left + this.#gutter.width * LANES[party]
  }

  #yAt(cursor: number): number {
    const { first, row, top } = this.#gutter
    const share               = (cursor - 1 + first) % 2 ? LANES.black : LANES.white
    return Math.max(3, (rowAt(cursor, first) - top) * row + share * row)
  }
}
