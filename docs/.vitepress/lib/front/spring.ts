import type { Mote }  from './motes.ts'
import type { Point } from './layout.ts'

/**
 * A push away from a point, as far as its reach and as strong as its force at
 * the point itself, its strength at a distance scaled by the square of the
 * share of the reach left beyond that distance.
 */
interface Push {
  force  : number
  radius : number
}

/**
 * The springs that carry a pushed piece back to its path: the share of critical
 * damping each takes, how stiff it is for a piece in its place and for any
 * other, and the push a pointer gives every piece and a traveling piece gives a
 * loose piece it passes.
 */
export const PUSH = {
  damping : 0.85,
  firm    : 80,
  pointer : { force: 2400, radius: 74 },
  slack   : 22,
  wake    : { force: 1400, radius: 44 }
} as const

/**
 * Adds to a force the push `push` gives a piece at `[x, y]` from `source`.
 */
function repel([fx, fy]: Point, [x, y]: Point, source: Point, push: Push): Point {
  const [ex, ey] = [x - source[0], y - source[1]]
  const distance = Math.hypot(ex, ey)
  if (distance >= push.radius || distance <= 0.1) return [fx, fy]
  const strength = push.force * (1 - distance / push.radius) ** 2
  return [fx + ex / distance * strength, fy + ey / distance * strength]
}

/**
 * Steps one piece's push over `seconds`: a spring pulling it back to its path,
 * stiffer once its pair stands in its place, a pointer within reach pushing it
 * away, and every oval piece in flight within reach pushing it aside, the push
 * capped at `limit` pixels.
 *
 * Args:
 *   at      : Where the piece stands before its push, on the backdrop.
 *   below   : Where it stands before its push, on the page.
 *   limit   : The farthest the push carries it.
 *   moving  : Where each oval piece in flight stands, on the page.
 *   piece   : The piece, whose push this updates.
 *   placed  : How far the piece's pair has come to its place.
 *   pointer : Where a pointer stands on the backdrop, if anywhere.
 *   seconds : The time the step covers.
 */
export function spring(
  at      : Point,
  below   : Point,
  limit   : number,
  moving  : Point[],
  piece   : Mote,
  placed  : number,
  pointer : Point | null,
  seconds : number
): void {
  const stiff      = placed > 0.9 ? PUSH.firm : PUSH.slack
  const damping    = 2 * Math.sqrt(stiff) * PUSH.damping
  let force: Point = [-stiff * piece.ox - damping * piece.vx, -stiff * piece.oy - damping * piece.vy]

  const pushed: Point = [below[0] + piece.ox, below[1] + piece.oy]
  if (pointer) force = repel(force, [at[0] + piece.ox, at[1] + piece.oy], pointer, PUSH.pointer)
  for (const source of moving) force = repel(force, pushed, source, PUSH.wake)

  piece.vx += force[0] * seconds
  piece.vy += force[1] * seconds
  piece.ox += piece.vx * seconds
  piece.oy += piece.vy * seconds

  const reach = Math.hypot(piece.ox, piece.oy)
  if (reach <= limit) return
  const scale = limit / reach
  Object.assign(piece, { ox: piece.ox * scale, oy: piece.oy * scale, vx: piece.vx * 0.5, vy: piece.vy * 0.5 })
}
