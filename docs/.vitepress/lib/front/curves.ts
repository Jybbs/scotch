import * as timing from '../motion/timing.ts'

/**
 * Eases a share of a journey along a curve that starts and stops level, slow
 * off the mark and slowing over a long final stretch, which every journey of
 * the front page's pieces travels along.
 */
export const soft = timing.bezier([0.4, 0, 0.15, 1])

/**
 * Reads how strongly a piece in flight shows its game's edging at a share of
 * its journey, rising as it leaves home, held through the flight, and easing
 * out as it settles, and none before it leaves or once it has landed.
 */
export function edgeAt(share: number): number {
  return timing.smooth(share / 0.18) * timing.smooth((1 - share) / 0.25)
}

/**
 * Reads a bump that rests at 0 until 62 percent of a journey, rises level to 1
 * at 85 percent of it, and falls level back to 0 at its end, which carries a
 * piece a few pixels past its place and back.
 */
export function past(share: number): number {
  return share < 0.85 ? timing.smoother((share - 0.62) / 0.23) : timing.smoother((1 - share) / 0.15)
}
