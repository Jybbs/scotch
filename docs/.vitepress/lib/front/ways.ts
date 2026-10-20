import { GAMES, moteId }      from './example.ts'
import type { Field }         from './field.ts'
import { type Point, slotOf } from './layout.ts'
import type { Mote, Way }     from './motes.ts'

interface Blocking {
  near  : Place[]
  piece : Mote
}

type Place = Way['near'][number]

/**
 * The turns in degrees from the oval's normal `aside` tries for a loose piece
 * making way, nearest first, then the turns from the other side of the arc.
 */
const TURNS = [
  0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90,
  180, 165, -165, 150, -150, 135, -135, 120, -120
]

/**
 * Finds the spot a loose piece makes way to from the place it stands nearest,
 * the nearest spot along the oval's normal at that place or along a turn from
 * it, every spot keeping clear of the lockup, the oval's places, every home but
 * its own and the ones `leaving` names, and every spot already given, and
 * allowed to stand above the hero under the bar.
 */
function aside(field: Field, entry: Blocking, given: Point[], leaving: Set<number>): Point | undefined {
  const { cx, cy, loose, rx, ry } = field.plan
  const [{ piece }, place]        = [entry, entry.near[0]!]

  const nx    = (place.x - cx) / rx ** 2
  const ny    = (place.y - cy) / ry ** 2
  const side  = (piece.hx - place.x) * nx + (piece.hy - place.y) * ny >= 0 ? 1 : -1
  const base  = Math.atan2(side * ny, side * nx)
  const roomy = (spot: Point): boolean =>
    field.homes.every((home, index) => index === piece.home || leaving.has(index) || field.apart(spot, home))
    && given.every(other => field.apart(spot, other))
  const fits = (spot: Point): boolean =>
    spot[1] > -3 * loose && spot[1] < field.measure.P - loose && field.free(spot) && roomy(spot)

  for (let d = 2; d <= 260; d += 2) {
    for (const turn of TURNS) {
      const angle       = base + turn * Math.PI / 180
      const spot: Point = [piece.hx + d * Math.cos(angle), piece.hy + d * Math.sin(angle)]
      if (fits(spot)) return spot
    }
  }
  return undefined
}

/**
 * Lists each loose piece whose home stands within reach of a place on the oval,
 * beside those places nearest first, the piece standing nearest a place first.
 */
function blockingOf(field: Field, motes: Mote[]): Blocking[] {
  const places = field.plan.slots.flatMap((_, k) => GAMES.map(game => {
    const [x, y] = slotOf(field.plan, game, k)
    return { id: moteId(game, k), k, x, y }
  }))

  return motes.filter(piece => piece.k < 0)
    .map(piece => ({
      piece : piece,
      near  : places.map(place => Object.assign({ d: homeTo(piece, place) }, place))
        .filter(place => place.d < field.clearance)
        .toSorted((a, b) => a.d - b.d)
    }))
    .filter(entry => entry.near.length > 0)
    .toSorted((a, b) => a.near[0]!.d - b.near[0]!.d)
}

/**
 * Reads the first ply whose place a loose piece stands near.
 */
function firstOf(entry: Blocking): number {
  return Math.min(...entry.near.map(place => place.k))
}

/**
 * Measures how far a loose piece's home stands from a place on the oval.
 */
function homeTo(piece: Mote, { x, y }: { x: number, y: number }): number {
  return Math.hypot(piece.hx - x, piece.hy - y)
}

/**
 * Finds the spot each loose piece in the oval's path makes way to, a piece's
 * own home counting as free beside the homes of the pieces in the path whose
 * first ply the oval reaches no later, and sets it on the piece as its way.
 *
 * Returns:
 *   How many such pieces found a spot and how many found none.
 */
export function makeWay(field: Field, motes: Mote[]): { lost: number, made: number } {
  const blocking = blockingOf(field, motes)
  const given    = [] as Point[]
  let lost       = 0

  for (const entry of blocking) {
    const earlier = blocking.filter(other => other !== entry && firstOf(other) <= firstOf(entry))
    const spot    = aside(field, entry, given, new Set(earlier.map(other => other.piece.home)))
    if (!spot) {
      lost++
      continue
    }
    given.push(spot)
    entry.piece.way = {
      near : entry.near,
      r0   : field.clearance * 1.7,
      r1   : field.plan.size * 0.5,
      tx   : spot[0],
      ty   : spot[1]
    }
  }
  return { lost, made: blocking.length - lost }
}
