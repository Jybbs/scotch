import { clamp } from '@vueuse/core'

import * as timing   from '../motion/timing.ts'
import type { Cell } from './mosaic.ts'

/**
 * Where one piece of the mosaic stands while it shows: its distance out from its
 * cell along the angle it pours in on, in pixels, its turn in radians, and its
 * opacity.
 */
export interface Placed {
  alpha : number
  away  : number
  turn  : number
}

/**
 * How the pieces pour: the milliseconds a pour and a lift take, the share of
 * the drawing's diagonal a piece starts from, twice the widest turn in radians a
 * piece takes at the start of its course, which a piece whose drift is furthest
 * from its middle takes, the share of its course over which a piece fades in,
 * and the most milliseconds its drift holds a piece back before its course
 * starts.
 */
export interface PourTuning {
  fade  : number
  lift  : number
  pour  : number
  reach : number
  spin  : number
  wait  : number
}

/**
 * One piece's course: whether the scroll has passed its place, how far along
 * its course it stands as a share, and the moment its course resumes.
 */
interface Course {
  on    : boolean
  share : number
  wait  : number
}

/**
 * The pour every reader meets, timed by the site's pour and lift.
 */
export const POUR_TUNING: Readonly<PourTuning> = {
  fade  : 1 / 3,
  lift  : timing.DURATIONS.lift,
  pour  : timing.DURATIONS.pour,
  reach : 0.42,
  spin  : 2.4,
  wait  : 140
}

/**
 * Pours each piece of the mosaic into its cell once the scroll passes its place
 * and lifts it back out once the scroll falls behind it, each along its own
 * course, eased on the site's glide so a piece slows into its cell as a move on
 * the site's boards does.
 */
export class Pour {
  readonly #cells   : readonly Cell[]
  readonly #courses : Course[]
  readonly #ease    = timing.bezier(timing.CURVES.glide)
  readonly #tuning  : PourTuning

  /**
   * Starts every piece out of its cell.
   *
   * Args:
   *   cells  : The mosaic's cells.
   *   tuning : How the pieces pour.
   */
  constructor(cells: readonly Cell[], tuning: PourTuning = POUR_TUNING) {
    this.#cells   = cells
    this.#courses = cells.map(() => ({ on: false, share: 0, wait: 0 }))
    this.#tuning  = tuning
  }

  /**
   * Moves each piece along its course toward where the scroll sets it, or
   * straight there while the drawings hold still.
   *
   * Args:
   *   elapsed  : The milliseconds since the last move.
   *   moving   : Whether the site's drawings move.
   *   now      : The moment of this move, in milliseconds.
   *   progress : How far down the page the scroll stands, as a share.
   *
   * Returns:
   *   Whether any piece still stands short of where the scroll sets it.
   */
  advance(elapsed: number, moving: boolean, now: number, progress: number): boolean {
    let short = false
    for (const [index, course] of this.#courses.entries()) {
      const on = progress >= this.#cells[index]!.at
      if (on !== course.on) {
        course.on   = on
        course.wait = on ? now + this.#cells[index]!.drift * this.#tuning.wait : now
      }
      const step   = on ? elapsed / this.#tuning.pour : -elapsed / this.#tuning.lift
      const held   = now < course.wait
      const moved  = held ? course.share : clamp(course.share + step, 0, 1)
      course.share = moving ? moved : Number(on)
      if (course.share !== Number(on)) short = true
    }
    return short
  }

  /**
   * Reads where a cell's piece stands, or `undefined` while it is out of the
   * drawing.
   *
   * Args:
   *   index : The cell's place in the mosaic.
   *   reach : The drawing's diagonal in pixels.
   */
  placed(index: number, reach: number): Placed | undefined {
    const share = this.#courses[index]!.share
    if (share <= 0) return undefined
    const left = 1 - this.#ease(share)
    return {
      alpha : Math.min(1, share / this.#tuning.fade),
      away  : left * reach * this.#tuning.reach,
      turn  : left * (this.#cells[index]!.drift - 0.5) * this.#tuning.spin
    }
  }
}
