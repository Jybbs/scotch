import { clamp } from '@vueuse/core'

import { type Piece, pieceKind }  from '../site/pieces.ts'
import { type Travel, changesOf } from './placements.ts'

/**
 * The side a board is drawn from, White's at the foot unless turned to Black's.
 */
export type Facing = 'black' | 'white'

/**
 * A change between two plies with each traveler's trail laid out: each piece
 * that travels, each square a piece leaves the board from, and each square a
 * piece appears on.
 */
export interface Laid {
  appear  : readonly { piece: Piece, square: number }[]
  travels : readonly Trailed[]
  vanish  : readonly number[]
}

/**
 * A point on the board in its own units.
 */
export interface Point {
  x : number
  y : number
}

/**
 * One piece traveling between two squares beside the trail it takes.
 */
export type Trailed = Travel & { trail: Trail }

/**
 * The side of one square in the board's own units, python-chess's 45.
 */
export const SQUARE = 45
/**
 * The radius of the curve a knight's trail turns through at the corner of its
 * L, in the board's units.
 */
const TURN = 16

/**
 * A path a piece travels in the board's units, a polyline whose points and
 * running lengths are laid out once, so reading a point at a share of its
 * length writes into a point the caller keeps and allocates nothing.
 */
export class Trail {
  readonly run   : Float64Array
  readonly total : number
  readonly xy    : Float64Array

  /**
   * Lays out a trail through the points `xy` lists as x and y in turn.
   */
  constructor(xy: readonly number[]) {
    const count = xy.length / 2
    this.xy     = Float64Array.from(xy)
    this.run    = new Float64Array(count)
    for (let at = 1; at < count; at++) {
      const leg    = Math.hypot(xy[2 * at]! - xy[2 * at - 2]!, xy[2 * at + 1]! - xy[2 * at - 1]!)
      this.run[at] = this.run[at - 1]! + leg
    }
    this.total = this.run[count - 1]!
  }

  /**
   * Reads where the trail ends.
   */
  get end(): Point {
    return { x: this.xy.at(-2)!, y: this.xy.at(-1)! }
  }

  /**
   * Reads where the trail starts.
   */
  get start(): Point {
    return { x: this.xy[0]!, y: this.xy[1]! }
  }

  /**
   * Writes the point at share `share` of the trail's length into `out`.
   */
  at(share: number, out: Point): Point {
    const count = this.run.length
    if (count === 1 || this.total === 0) return Object.assign(out, this.start)
    const length = clamp(share, 0, 1) * this.total
    let at       = 1
    while (at < count - 1 && this.run[at]! < length) at++
    const from  = this.run[at - 1]!
    const span  = this.run[at]! - from
    const along = span > 0 ? (length - from) / span : 0
    out.x       = this.xy[2 * at - 2]! + (this.xy[2 * at]! - this.xy[2 * at - 2]!) * along
    out.y       = this.xy[2 * at - 1]! + (this.xy[2 * at + 1]! - this.xy[2 * at - 1]!) * along
    return out
  }

  /**
   * Lays out the part of the trail from its start to share `share`, walked back
   * from that point to the start.
   */
  back(share: number): Trail {
    const { x, y } = this.at(share, { x: 0, y: 0 })
    const length   = clamp(share, 0, 1) * this.total
    const xy       = [x, y]
    for (let at = this.run.length - 1; at >= 0; at--) {
      if (this.run[at]! < length) xy.push(this.xy[2 * at]!, this.xy[2 * at + 1]!)
    }
    return new Trail(xy)
  }

  /**
   * Lays out this trail followed by `next`, which starts where this one ends.
   */
  join(next: Trail): Trail {
    return new Trail([...this.xy, ...next.xy.subarray(2)])
  }
}

/**
 * Reads whether a piece travels as a knight, on a knight's move rather than as
 * a pawn promoting to one.
 */
function knightly({ now, was }: Travel): boolean {
  return pieceKind(was) === 'n' && pieceKind(now) === 'n'
}

/**
 * Reads the corner a piece stands at on a square, a1 being 0, from White's side
 * with a1 at the foot's left or from Black's with a1 at the top's right, the
 * one place a board turns, so its squares, pieces, marks, arrows, and trails
 * all follow.
 */
export function cornerOf(square: number, facing: Facing = 'white'): Point {
  const at = facing === 'black' ? 63 - square : square
  return { x: (at % 8) * SQUARE, y: (7 - Math.floor(at / 8)) * SQUARE }
}

/**
 * Reads what changes between two placements with each traveler's trail laid out
 * as the board faces, a knight's along its L.
 */
export function laidOut(before: string, after: string, facing: Facing): Laid {
  const changes = changesOf(before, after)
  const travels = changes.travels.map(travel =>
    Object.assign(travel, { trail: trailOf(travel.from, knightly(travel), travel.to, facing) }))
  return { ...changes, travels }
}

/**
 * Lays out the trail a piece takes between two squares as the board faces: a
 * knight's two legs, the two-square leg first, turned through a curve at the
 * corner, and a straight line for every other piece.
 */
export function trailOf(from: number, knight: boolean, to: number, facing: Facing = 'white'): Trail {
  const start = cornerOf(from, facing)
  const end   = cornerOf(to, facing)
  const files = Math.abs(to % 8 - from % 8)
  const ranks = Math.abs(Math.floor(to / 8) - Math.floor(from / 8))
  if (!knight || files * ranks !== 2) return new Trail([start.x, start.y, end.x, end.y])

  const corner = files === 2 ? { x: end.x, y: start.y } : { x: start.x, y: end.y }
  const first  = Math.hypot(corner.x - start.x, corner.y - start.y)
  const second = Math.hypot(end.x - corner.x, end.y - corner.y)
  const enter  = {
    x : corner.x - (corner.x - start.x) / first * TURN,
    y : corner.y - (corner.y - start.y) / first * TURN
  }
  const leave = {
    x : corner.x + (end.x - corner.x) / second * TURN,
    y : corner.y + (end.y - corner.y) / second * TURN
  }
  const xy = [start.x, start.y, enter.x, enter.y]
  for (let step = 1; step < 8; step++) {
    const t = step / 8
    const u = 1 - t
    xy.push(
      u * u * enter.x + 2 * u * t * corner.x + t * t * leave.x,
      u * u * enter.y + 2 * u * t * corner.y + t * t * leave.y
    )
  }
  xy.push(leave.x, leave.y, end.x, end.y)
  return new Trail(xy)
}
