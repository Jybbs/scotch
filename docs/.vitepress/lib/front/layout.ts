import { clamp } from '@vueuse/core'

import type { Game } from './example.ts'

/**
 * A box on the backdrop, from its top left corner.
 */
export interface Box {
  h : number
  w : number
  x : number
  y : number
}

interface Ellipse {
  W      : number
  cx     : number
  cy     : number
  loose  : number
  narrow : boolean
  rx     : number
  ry     : number
  shared : boolean[]
}

/**
 * The front page as the backdrop measures it, in pixels from the bar's bottom
 * edge at the page's top, which is where the hero's own room begins.
 *
 * Attributes:
 *   F     : The depth a little above the foot where the loose pieces have
 *     faded.
 *   H     : The hero's depth below the bar.
 *   P     : The depth of the whole front page below the bar.
 *   W     : The page's width.
 *   lock  : The box around the wordmark, the tagline, and the actions.
 *   parts : The wordmark, each line of the tagline, and each action.
 */
export interface Measure {
  F     : number
  H     : number
  P     : number
  W     : number
  lock  : Box
  parts : Box[]
}

/**
 * The oval laid out around the lockup.
 *
 * Attributes:
 *   W         : The page's width.
 *   bottom    : The lowest point a piece or a ring on the bottom arc reaches.
 *   cx, cy    : The oval's center.
 *   loose     : The size a loose piece takes.
 *   ring      : How far a shared pair's ring reaches from its center.
 *   ringReach : How far a ring opens as a share of its piece's size.
 *   rx, ry    : The oval's half width and half height.
 *   size      : The size a piece in its place takes.
 *   slots     : Each ply's place on the top arc.
 *   top       : The highest point a piece or a ring on the top arc reaches.
 */
export interface Plan {
  W         : number
  bottom    : number
  cx        : number
  cy        : number
  loose     : number
  ring      : number
  ringReach : number
  rx        : number
  ry        : number
  size      : number
  slots     : Point[]
  top       : number
}

export type Point = [number, number]

interface Track {
  cut    : number
  length : number
  points : Point[]
}

/**
 * The widest page a phone shows, 40rem at the browser's default font size,
 * below which the oval and the pieces take their narrow sizes.
 */
export const NARROW = 640
/**
 * The ring a pair whose position the two games share opens as it lands: how
 * long it runs in seconds, and how far it opens as a share of the piece's size
 * on a narrow page and on a wide one.
 */
export const RING = { dur: 0.7, narrow: 1.25, wide: 1.42 } as const

/**
 * Sets every ply's place along the chosen arc and reads the plan's sizes and
 * reaches from it.
 */
function planOf(ellipse: Ellipse, track: Track): Plan {
  const { W, cx, cy, loose, narrow, rx, ry, shared } = ellipse
  const { at }    = walk(track.points)
  const pitch     = track.length / shared.length
  const size      = clamp(pitch - 2, 7, loose)
  const slots     = shared.map((_, k) => at((k + 0.5) * pitch))
  const ringReach = narrow ? RING.narrow : RING.wide
  const ring      = size * ringReach + 1
  const reach     = (k: number): number => shared[k] ? ring : size / 2
  const top       = Math.min(...slots.map(([, y], k) => y - reach(k)))

  return {
    W         : W,
    bottom    : 2 * cy - top,
    cx        : cx,
    cy        : cy,
    loose     : loose,
    ring      : ring,
    ringReach : ringReach,
    rx        : rx,
    ry        : ry,
    size      : size,
    slots     : slots,
    top       : top
  }
}

/**
 * Finds the top arc of an ellipse that keeps every piece on it and on its
 * reflection clear of the lockup, giving up the stretch nearest the ends beside
 * the lockup where a piece there would come too close, as the angle cut from
 * each end and the arc's points and length.
 *
 * Args:
 *   clear  : Whether a piece at a point keeps clear of the lockup.
 *   cx, cy : The ellipse's center.
 *   rx, ry : The ellipse's half width and half height.
 */
function trackOf(
  clear : (x: number, y: number) => boolean,
  cx    : number,
  cy    : number,
  rx    : number,
  ry    : number
): Track {
  const steps = 360
  let index   = steps / 2
  while (index > 0) {
    const angle = (index - 1) / steps * Math.PI
    const rise  = ry * Math.sin(angle)
    const ends  = [cx - rx * Math.cos(angle), cx + rx * Math.cos(angle)]
    if (!ends.every(x => clear(x, cy - rise) && clear(x, cy + rise))) break
    index--
  }
  const cut = index / steps * Math.PI
  if (index >= steps / 2) return { cut, length: 0, points: [] }
  const points = Array.from({ length: 241 }, (_, step): Point => {
    const angle = cut + (Math.PI - 2 * cut) * step / 240
    return [cx - rx * Math.cos(angle), cy - ry * Math.sin(angle)]
  })
  return { cut, length: walk(points).length, points }
}

/**
 * Builds the walk along a path of points, finding the point a length along it
 * reaches inside the first stretch whose end lies at least that far along.
 */
function walk(points: Point[]): { at: (length: number) => Point, length: number } {
  const totals = [0]
  for (let index = 1; index < points.length; index++) {
    const [[ax, ay], [bx, by]] = [points[index - 1]!, points[index]!]
    totals.push(totals[index - 1]! + Math.hypot(bx - ax, by - ay))
  }
  const length = totals.at(-1)!

  const at = (distance: number): Point => {
    const want     = clamp(distance, 0, length)
    const low      = Math.max(1, totals.findIndex(total => total >= want))
    const [ax, ay] = points[low - 1] ?? [0, 0]
    const [bx, by] = points[low] ?? [ax, ay]
    const share    = (want - totals[low - 1]!) / ((totals[low] ?? 0) - totals[low - 1]! || 1)
    return [ax + (bx - ax) * share, ay + (by - ay) * share]
  }

  return { at, length }
}

/**
 * Builds the box of a square `size` pixels on a side centered on a point.
 */
export function boxAround([x, y]: Point, size: number): Box {
  return { h: size, w: size, x: x - size / 2, y: y - size / 2 }
}

/**
 * Measures the gap between two boxes, 0 where they touch or overlap.
 */
export function gapBetween(a: Box, b: Box): number {
  return Math.hypot(
    Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w)),
    Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h))
  )
}

/**
 * Lays the oval out around the lockup at the page's width: its center on the
 * lockup's, its width reaching 26 percent of the page past the lockup's sides
 * where the page allows, and its height the least that keeps every piece clear
 * of the wordmark, the tagline, and the actions along the whole ellipse, or, on
 * a narrow page, the least that keeps them clear along arcs long enough for
 * every piece at its size, each arc giving up the stretch nearest its ends
 * beside the lockup. The height never grows more than 60 percent of the page's
 * width past the least that clears the lockup, and the pieces shrink where the
 * arcs still run short. The oval's top and bottom count the ring a shared pair
 * opens.
 *
 * Args:
 *   measure : The page's width and the lockup's boxes.
 *   shared  : Whether each ply the oval shows reaches a shared position.
 */
export function layout({ W, lock, parts }: Pick<Measure, 'W' | 'lock' | 'parts'>, shared: boolean[]): Plan {
  const narrow = W < NARROW
  const loose  = Math.round(clamp(W / 66, 11, 17))
  const buffer = clamp(Math.round(W * 0.03), 20, 34)
  const cx     = lock.x + lock.w / 2
  const cy     = lock.y + lock.h / 2
  const rx     = Math.min(lock.w / 2 + W * 0.26, W / 2 - loose / 2 - 4)
  const clear  = (x: number, y: number): boolean =>
    parts.every(part => gapBetween(boxAround([x, y], loose), part) >= buffer - 0.5)
  const low  = lock.h / 2 + buffer + loose / 2
  const cap  = low + W * 0.6
  const need = shared.length * (loose + 2)
  let best   = { ry: low, track: trackOf(clear, cx, cy, rx, low) }

  for (let ry = low; ry <= cap + 1; ry += 2) {
    const track = trackOf(clear, cx, cy, rx, ry)
    if (track.length === 0) continue
    best = { ry, track }
    if (track.cut === 0 || (narrow && track.length >= need)) break
  }

  return planOf({ W, cx, cy, loose, narrow, rx, ry: best.ry, shared }, best.track)
}

/**
 * Reads the room the hero takes above the wordmark and beneath the actions, so
 * the oval's top, its rings included, sits 16 pixels under the bar, 12 on a
 * narrow page, and the first card the same distance under the oval's lowest
 * ring.
 */
export function pads(
  measure : Pick<Measure, 'W' | 'lock'>,
  plan    : Pick<Plan, 'bottom' | 'top'>
): { bottom: number, top: number } {
  const margin   = measure.W < NARROW ? 12 : 16
  const { h, y } = measure.lock
  return { bottom: Math.max(0, plan.bottom + margin - (y + h)), top: Math.max(0, y + margin - plan.top) }
}

/**
 * Reads the place a ply's piece of one game takes on the oval, its slot on the
 * top arc for the submitted line and that slot's reflection through the oval's
 * center for the stored game.
 */
export function slotOf(plan: Pick<Plan, 'cy' | 'slots'>, game: Game, k: number): Point {
  const [x, y] = plan.slots[k]!
  return [x, game === 'top' ? y : 2 * plan.cy - y]
}
