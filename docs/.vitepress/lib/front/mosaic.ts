import mark from '../../../assets/mark.svg?raw'

import type { Piece } from '../site/pieces.ts'
import { seeded }     from './random.ts'

type Box = { height: number, width: number, x: number, y: number }

/**
 * One cell of the mosaic, in the mark's own units: its corner and its middle,
 * the white piece and the black piece it holds, whether the mark's outline cuts
 * it, which of its two pieces a whole cell shows, the share of the scroll at
 * which its piece pours in and the angle it pours in along, and its drift, a
 * share between 0 and 1 its course reads. A cut cell also holds where its two
 * pieces stand inside it, the white one in the part the mark fills.
 */
export interface Cell {
  angle    : number
  at       : number
  black    : Piece
  cut      : boolean
  drift    : number
  left     : number
  light    : boolean
  top      : number
  white    : Piece
  x        : number
  y        : number
  outside? : Point
  within?  : Point
}

/**
 * Reads whether a point in the mark's own units lies inside the mark.
 */
export type Filled = (x: number, y: number) => boolean

/**
 * The mark laid out as cells, in its own units: the box its drawing fills, each
 * cell, its path as the drawing writes it and as the rings that path closes,
 * and the side of one cell.
 */
export interface Mosaic {
  box   : Box
  cells : readonly Cell[]
  path  : string
  rings : readonly (readonly Point[])[]
  size  : number
}

/**
 * How the mosaic is laid out: the side of a cell and the samples taken along
 * each of its edges, the share of a cell the mark must fill for the cell to
 * hold a piece and the share past which it holds one whole, how far each cut
 * piece moves from its cell's middle toward the middle of its part, the seed
 * the pieces are drawn from, twice the widest turn a piece's course takes from
 * the line out of the mark's middle, the share of the scroll at which the first
 * piece pours and the share the pours spread across from it, and how many
 * units of height a cell's drift moves its place in the order by.
 */
export interface MosaicTuning {
  cell    : number
  first   : number
  jitter  : number
  least   : number
  samples : number
  seed    : number
  spread  : number
  toward  : number
  turn    : number
  whole   : number
}

/**
 * A point in the mark's own units.
 */
export type Point = readonly [number, number]

/**
 * The pieces a cell draws from, each a white piece by its symbol.
 */
const KINDS = ['K', 'Q', 'R', 'B', 'N', 'P'] as const
/**
 * The steps each quadratic curve of the mark's path is drawn in.
 */
const STEPS = 8
/**
 * The layout every reader meets, a cell 25 units on a side.
 */
export const MOSAIC_TUNING: Readonly<MosaicTuning> = {
  cell    : 25,
  first   : 0.02,
  jitter  : 30,
  least   : 0.2,
  samples : 6,
  seed    : 21,
  spread  : 0.9,
  toward  : 0.7,
  turn    : 1.4,
  whole   : 0.8
}

function boxOf(svg: string): Box {
  const [x, y, width, height] = /viewBox="([^"]+)"/u.exec(svg)![1]!.split(' ').map(Number) as number[]
  return { height: height!, width: width!, x: x!, y: y! }
}

/**
 * Reads where the two pieces of a cut cell stand, each in the middle of the
 * part of the cell it sits in, moved from the cell's middle by `toward` of the
 * way, in the cell's own units.
 */
function centersOf(filled: Filled, left: number, top: number, tuning: MosaicTuning): Point[] {
  const sums = [[0, 0, 0], [0, 0, 0]] as [number, number, number][]
  for (let a = 0; a < STEPS; a++) {
    for (let b = 0; b < STEPS; b++) {
      const x   = (a + 0.5) * tuning.cell / STEPS
      const y   = (b + 0.5) * tuning.cell / STEPS
      const sum = sums[filled(left + x, top + y) ? 0 : 1]!
      sum[0] += x
      sum[1] += y
      sum[2] += 1
    }
  }
  const middle = tuning.cell / 2
  return sums.map(([x, y, count]): Point => count
    ? [middle + (x / count - middle) * tuning.toward, middle + (y / count - middle) * tuning.toward]
    : [middle, middle])
}

function filledShare(filled: Filled, left: number, top: number, tuning: MosaicTuning): number {
  const step = tuning.cell / tuning.samples
  let count  = 0
  for (let a = 0; a < tuning.samples; a++) {
    for (let b = 0; b < tuning.samples; b++) {
      if (filled(left + (a + 0.5) * step, top + (b + 0.5) * step)) count++
    }
  }
  return count / tuning.samples ** 2
}

/**
 * Builds the reading of whether a point lies inside the mark under the nonzero
 * rule its path declares, by the winding number of its rings about the point.
 * Each row the reading meets is read once, as where every edge crosses it and
 * the way each one crosses, so a point on that row sums only the crossings to
 * its right.
 */
export function insideOf(rings: Mosaic['rings']): Filled {
  const rows = new Map<number, (readonly [number, number])[]>()
  const row  = (y: number): (readonly [number, number])[] => {
    const crossings = [] as (readonly [number, number])[]
    for (const ring of rings) {
      for (const [index, [ax, ay]] of ring.entries()) {
        const [bx, by] = ring[(index + 1) % ring.length]!
        const way      = ay <= y && by > y ? 1 : ay > y && by <= y ? -1 : 0
        if (way) crossings.push([ax + (y - ay) / (by - ay) * (bx - ax), way])
      }
    }
    rows.set(y, crossings)
    return crossings
  }
  return (x, y) => {
    let winding = 0
    for (const [at, way] of rows.get(y) ?? row(y)) if (at > x) winding += way
    return winding !== 0
  }
}

/**
 * Lays the mark out as cells, each cell the mark fills holding one piece and
 * each cell its outline cuts holding a white piece in the part the mark fills
 * and a different black piece in the rest, a cell the outline only grazes left
 * out. The pours are ordered from the foot of the mark to its top, each piece's
 * place moved by its drift, and each piece pours in along the line out of the
 * mark's middle through its cell, turned by its drift.
 *
 * Args:
 *   svg    : The mark's drawing, one path in a `viewBox`.
 *   tuning : How the mosaic is laid out.
 */
export function mosaicOf(svg = mark, tuning = MOSAIC_TUNING): Mosaic {
  const box    = boxOf(svg)
  const path   = / d="([^"]+)"/u.exec(svg)![1]!
  const rings  = ringsOf(path)
  const filled = insideOf(rings)
  const random = seeded(tuning.seed)
  const pick   = (): Piece => KINDS[Math.floor(random() * KINDS.length)]!
  const middle = [box.x + box.width / 2, box.y + box.height / 2] as const
  const cells: Cell[] = []

  for (let top = box.y; top < box.y + box.height; top += tuning.cell) {
    for (let left = box.x; left < box.x + box.width; left += tuning.cell) {
      const share = filledShare(filled, left, top, tuning)
      if (share < tuning.least) continue
      const white = pick()
      let black   = pick()
      while (black === white) black = pick()
      const cut   = share < tuning.whole
      const light = random() < 0.5
      const drift = random()
      const x     = left + tuning.cell / 2
      const y     = top + tuning.cell / 2
      const angle = Math.atan2(y - middle[1], x - middle[0]) + (drift - 0.5) * tuning.turn
      const [within, outside] = cut ? centersOf(filled, left, top, tuning) : []
      const lower = black.toLowerCase() as Piece
      cells.push({ angle, at: 0, black: lower, cut, drift, left, light, outside, top, white, within, x, y })
    }
  }

  const place = (cell: Cell): number => cell.drift * tuning.jitter - cell.y
  for (const [rank, cell] of cells.toSorted((a, b) => place(a) - place(b)).entries()) {
    cell.at = tuning.first + rank / cells.length * tuning.spread
  }
  return { box, cells, path, rings, size: tuning.cell }
}

/**
 * Reads a path written in absolute `M`, `L`, `H`, `V`, `Q`, and `Z` commands as
 * the rings it closes, each a list of points, every quadratic curve drawn as
 * straight steps along it.
 */
export function ringsOf(path: string): Point[][] {
  const rings: Point[][] = []
  let ring: Point[]      = []
  let at: Point          = [0, 0]

  for (const [, command, values] of path.matchAll(/([MLHVQZ])([^MLHVQZ]*)/gu)) {
    const numbers = values!.trim().split(/[\s,]+/u).filter(Boolean).map(Number)
    if (command === 'M') ring = [at = [numbers[0]!, numbers[1]!]]
    if (command === 'L') ring.push(at = [numbers[0]!, numbers[1]!])
    if (command === 'H') ring.push(at = [numbers[0]!, at[1]])
    if (command === 'V') ring.push(at = [at[0], numbers[0]!])
    if (command === 'Q') {
      const [cx, cy, x, y] = numbers as [number, number, number, number]
      const [sx, sy]       = at
      for (let step = 1; step <= STEPS; step++) {
        const t = step / STEPS
        const u = 1 - t
        ring.push([u * u * sx + 2 * u * t * cx + t * t * x, u * u * sy + 2 * u * t * cy + t * t * y])
      }
      at = [x, y]
    }
    if (command === 'Z') rings.push(ring)
  }
  return rings
}
