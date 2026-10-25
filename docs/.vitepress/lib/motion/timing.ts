import { type CubicBezierPoints, clamp } from '@vueuse/core'

/**
 * The cubic Bézier curves every motion on the site eases along, as the four
 * control values `cubic-bezier()` takes, the glide easing a move to its end and
 * the sway carrying a fade out and back in.
 */
export const CURVES: Readonly<Record<'glide' | 'sway', CubicBezierPoints>> = {
  glide : [0.32, 0.72, 0, 1],
  sway  : [0.45, 0, 0.55, 1]
}
/**
 * The length of each kind of motion in milliseconds, which a transition reads
 * through its custom property and an animation a script runs reads from here.
 */
export const DURATIONS = { enter: 300, fade: 200, glide: 420, lag: 60, move: 180, settle: 480 } as const

/**
 * Solves a cubic Bézier curve for the progress it reaches at a share of its
 * duration, the way a browser runs `cubic-bezier()`, through Newton's method on
 * the curve's horizontal coordinate.
 */
export function bezier([x1, y1, x2, y2]: CubicBezierPoints): (share: number) => number {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by

  return share => {
    let t = clamp(share, 0, 1)
    for (let step = 0; step < 8; step++) {
      const slope = (3 * ax * t + 2 * bx) * t + cx
      if (Math.abs(slope) < 1e-6) break
      t = clamp(t - (((ax * t + bx) * t + cx) * t - share) / slope, 0, 1)
    }
    return ((ay * t + by) * t + cy) * t
  }
}

/**
 * Writes a curve's four control values as the `cubic-bezier()` a stylesheet and
 * an animation a script runs both ease along.
 */
export function cubicBezier(points: CubicBezierPoints): string {
  return `cubic-bezier(${points.join(', ')})`
}

/**
 * Reads the smoothstep of a share, 0 below 0, 1 above 1, and an S-curve with
 * level ends between them.
 */
export function smooth(share: number): number {
  const value = clamp(share, 0, 1)
  return value * value * (3 - 2 * value)
}

/**
 * Reads the smootherstep of a share, a step whose first and second derivatives
 * are both zero at its ends, which starts and stops a piece gently.
 */
export function smoother(share: number): number {
  const value = clamp(share, 0, 1)
  return value * value * value * (value * (6 * value - 15) + 10)
}

/**
 * Solves the smootherstep for the share of its time at which it reaches a share
 * of its way, by bisection, since the smootherstep rises over the whole of it.
 */
export function unsmoother(reached: number): number {
  let low  = 0
  let high = 1
  for (let step = 0; step < 24; step++) {
    const middle = (low + high) / 2
    if (smoother(middle) < reached) low = middle
    else high = middle
  }
  return (low + high) / 2
}
