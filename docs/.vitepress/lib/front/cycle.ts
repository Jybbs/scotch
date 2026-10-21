import { smooth }     from '../motion/timing.ts'
import { past, soft } from './curves.ts'

/**
 * Where one ply's pair stands at a moment of the cycle.
 *
 * Attributes:
 *   col   : How far a shared pair has taken the run's color, from 0 to 1.
 *   out   : 1 on the way to the oval and -1 on the way home.
 *   p     : How far the pair has come from home to its places, from 0 to 1.
 *   push  : How many pixels the motion carries the pair past its end.
 *   since : The seconds since the pair landed, or -1 before it has.
 *   u     : The share of the pair's current journey gone.
 */
export interface State {
  col   : number
  out   : number
  p     : number
  push  : number
  since : number
  u     : number
}

/**
 * When each ply's pair sets off for the oval and when it lands, beside the
 * moment every pair stands in its place and the moment every pair is home
 * again, each journey taking the Settle motion's length and every pair setting
 * off home when the oval lets go.
 */
export interface Timing {
  land    : number[]
  looseAt : number
  setAt   : number
  start   : number[]
}

/**
 * The cycle the oval runs in seconds: when the first pair sets off, how long
 * the pairs take to set off one after another, when the oval lets go, and the
 * cycle's whole length.
 */
export const CYCLE = { gatherAt: 7, length: 22, releaseAt: 18, spread: 4 } as const
/**
 * The Settle motion every journey takes: its length in seconds, the share of it
 * gone when the pair lands, and the pixels it carries a piece past its end and
 * back, as a piece set down on a board settles.
 */
export const SETTLE = { dur: 1.8, land: 0.7, past: 5 } as const

/**
 * Eases a share of a journey under the Settle motion, which reaches its end
 * three quarters of the way through and spends the rest on the overshoot.
 */
export function eased(share: number): number {
  return soft(share / 0.75)
}

/**
 * Reads where each ply's pair stands at a time in the cycle, or, where the oval
 * holds still, every pair in its place with no ring running.
 *
 * Args:
 *   time   : The seconds since the cycle began, any number of cycles in.
 *   timing : The cycle's timing for the plies the oval shows.
 *   still  : Whether the oval holds still in its places.
 */
export function statesAt(time: number, timing: Timing, still = false): State[] {
  const moment = time % CYCLE.length

  return timing.start.map((start, k) => {
    if (still) return { col: 1, out: 1, p: 1, push: 0, since: -1, u: Number.POSITIVE_INFINITY }
    const going = moment < CYCLE.releaseAt
    const share = (moment - (going ? start : CYCLE.releaseAt)) / SETTLE.dur
    const done  = eased(share)
    const p     = going ? done : 1 - done

    return {
      col   : going ? smooth((p - 0.82) / 0.18) : 1,
      out   : going ? 1 : -1,
      p     : p,
      push  : SETTLE.past * past(share),
      since : going && moment >= timing.land[k]! ? moment - timing.land[k]! : -1,
      u     : share
    }
  })
}

/**
 * Times each ply's journey for an oval of `shown` plies, the pairs setting off
 * one after another across the cycle's spread.
 */
export function timingOf(shown: number): Timing {
  const step  = CYCLE.spread / Math.max(1, shown - 1)
  const start = Array.from({ length: shown }, (_, k) => CYCLE.gatherAt + k * step)

  return {
    land    : start.map(at => at + SETTLE.dur * SETTLE.land),
    looseAt : CYCLE.releaseAt + SETTLE.dur,
    setAt   : Math.max(...start) + SETTLE.dur,
    start   : start
  }
}
