import { DURATIONS, smooth, smoother, unsmoother } from '../motion/timing.ts'
import type { Fade, Leg, Plan, Sprite, Tie }       from './sprites.ts'

/**
 * The pace of the motion between positions: the length of one ply, of a
 * crossfade between two games, and of the span a jump's moves start across, the
 * least any of them takes and the least a piece already moving takes for its
 * next move, how much a moving piece grows at the middle of its trail, the
 * share of its move a capture fades over, how far into the king's move
 * castling's rook sets off, the time past which a piece still moving when a new
 * step arrives is hastened toward landing within it and by no more than
 * `haste`, and the fastest a piece travels, in the board's units a millisecond.
 */
export interface Pace {
  chain     : number
  crossfade : number
  fade      : number
  haste     : number
  least     : number
  lift      : number
  ply       : number
  span      : number
  speed     : number
  stagger   : number
  warp      : number
}

/**
 * The pace every board moves at unless it is handed another.
 */
export const PACE: Readonly<Pace> = {
  chain     : DURATIONS.lag,
  crossfade : DURATIONS.fade,
  fade      : 0.45,
  haste     : 0.6,
  least     : 150,
  lift      : 0.08,
  ply       : DURATIONS.glide,
  span      : 800,
  speed     : 1.2,
  stagger   : 0.3,
  warp      : 600
}

/**
 * Reads how much of a leg or a fade has run by `now`, as the share of it run
 * and the time it took, the whole of it once it has landed.
 */
function ranBy(item: { t0: number, t1: number }, now: number): { share: number, took: number } {
  return {
    share : item.t1 > now ? (now - item.t0) / (item.t1 - item.t0) : 1,
    took  : Math.min(now, item.t1) - item.t0
  }
}

/**
 * Hastens each piece whose legs and fades run past `pace.warp` from now,
 * scaling that piece's own timeline so it lands by then while keeping where it
 * stands now and the order of its moves, and moves each plan's start and end
 * with its pieces.
 */
export function hasten(
  active : readonly Sprite[],
  now    : number,
  pace   : Readonly<Pace>,
  plans  : readonly Plan[]
): void {
  for (const sprite of active) {
    const left = Math.max(0, ...sprite.legs.map(({ t1 }) => t1), ...sprite.fades.map(({ t1 }) => t1)) - now
    if (left <= pace.warp) continue
    const scale = Math.max(pace.haste, pace.warp / left)
    const tail  = sprite.fades.at(-1)
    for (const item of [...sprite.legs, ...sprite.fades]) squeeze(item, now, scale)
    if (tail && tail.t0 > now) tail.t0 = Math.max(now, Math.min(tail.t0, tail.t1 - pace.chain))
    sprite.end     = lastEnd(sprite.legs)
    sprite.fadeEnd = lastEnd(sprite.fades)
  }
  for (const plan of plans) {
    const items = [...plan.legs, ...plan.fades].map(([, item]) => item)
    if (items.length === 0) continue
    plan.t0  = Math.min(...items.map(({ t0 }) => t0))
    plan.end = Math.max(...items.map(({ t1 }) => t1))
  }
}

/**
 * Reads when the last leg or fade still planned for any moving piece lands, or
 * now where none lands later.
 */
export function horizonOf(active: readonly Sprite[], now: number): number {
  return Math.max(now, ...active.flatMap(({ fades, legs }) => [...legs, ...fades].map(({ t1 }) => t1)))
}

/**
 * Reads when the last of a piece's legs or fades lands, or 0 where none is
 * planned.
 */
export function lastEnd(items: readonly { t1: number }[]): number {
  return items.at(-1)?.t1 ?? 0
}

/**
 * Paces a run of `count` moves, one ply taking the ply's length and a jump
 * starting its moves a slot apart across at most `pace.span`, each overlapping
 * the next, so the whole jump lands within about a second.
 */
export function paceOf(count: number, pace: Readonly<Pace> = PACE): { length: number, slot: number } {
  if (count <= 1) return { length: pace.ply, slot: 0 }
  const slot = Math.min(pace.ply * 0.55, pace.span / count)
  return { length: Math.min(Math.max(slot * 1.8, pace.least), pace.ply), slot }
}

/**
 * Moves each fade tied to a leg to the time the leg now reaches the length the
 * fade is tied to, ending there or starting there.
 */
export function retime(leg: Leg): void {
  for (const { at, fade, lead, length } of leg.ties) {
    const t = leg.t0 + unsmoother(leg.trail.total ? length / leg.trail.total : 1) * (leg.t1 - leg.t0)
    fade.t0 = at === 'end' ? t - lead : t
    fade.t1 = at === 'end' ? t : t + lead
  }
}

/**
 * Scales what is left of a leg or a fade after `now` by `scale`, keeping the
 * share it has run at `now`.
 */
export function squeeze(item: { t0: number, t1: number }, now: number, scale: number): void {
  if (item.t1 <= now) return
  const t1 = now + (item.t1 - now) * scale
  item.t0  = item.t0 >= now
           ? now + (item.t0 - now) * scale
           : t1 - (t1 - now) / (1 - (now - item.t0) / (item.t1 - item.t0))
  item.t1 = t1
}

/**
 * Ties a fade to the time a leg reaches `length` along its trail, so joining a
 * later move onto the leg moves the fade too.
 */
export function tie(leg: Leg, at: Tie['at'], fade: Fade, length: number): void {
  leg.ties.push({ at, fade, lead: fade.t1 - fade.t0, length })
  retime(leg)
}

/**
 * Takes back a move that has not started, dropping each leg and fade it planned
 * and taking the leg it joined onto inside a jump back to where it stood, each
 * piece it made hidden.
 */
export function undo(plan: Plan): void {
  if (plan.merge) {
    const [sprite, leg] = plan.merge
    Object.assign(leg, leg.merged.pop())
    leg.ties   = leg.ties.filter(({ fade }) => fade.plan !== plan)
    sprite.end = lastEnd(sprite.legs)
    retime(leg)
  }
  for (const [sprite, leg] of plan.legs) {
    without(sprite.legs, leg)
    sprite.end = lastEnd(sprite.legs)
  }
  for (const [sprite, fade] of plan.fades) {
    without(sprite.fades, fade)
    sprite.fadeEnd = lastEnd(sprite.fades)
  }
  for (const sprite of plan.made) sprite.rest.a = 0
}

/**
 * Reads whether a move has yet to start at `now`, none of its legs or fades
 * under way and the leg it joined onto inside a jump not yet set off.
 */
export function unstarted(plan: Plan, now: number): boolean {
  if (plan.merge && plan.merge[1].t0 <= now) return false
  return plan.legs.every(([, leg]) => leg.t0 > now) && plan.fades.every(([, fade]) => fade.t0 > now)
}

/**
 * Takes back a move still running, each piece turning back from where it stands
 * now along the part of its trail it has traveled, over the time it has taken,
 * and no faster than `chain`.
 */
export function unwind(chain: number, now: number, plan: Plan): void {
  for (const [sprite, leg] of plan.legs) {
    without(sprite.legs, leg)
    if (leg.t0 < now) {
      const { share, took } = ranBy(leg, now)
      const trail           = leg.trail.back(smoother(share))
      const t1              = now + Math.max(chain, took)
      sprite.legs.push({ batch: 0, from: 0, merged: [], plan: undefined, t0: now, t1, ties: [], trail })
    }
    sprite.end = lastEnd(sprite.legs)
  }
  for (const [sprite, fade] of plan.fades) {
    without(sprite.fades, fade)
    if (fade.t0 < now) {
      const { share, took } = ranBy(fade, now)
      const a0              = fade.a0 + (fade.a1 - fade.a0) * smooth(share)
      sprite.fades.push({ a0, a1: fade.a0, plan: undefined, t0: now, t1: now + Math.max(chain, took) })
    }
    sprite.fadeEnd = lastEnd(sprite.fades)
  }
}

/**
 * Takes one item out of a list where the list holds it.
 */
export function without<T>(list: T[], item: T): void {
  const at = list.indexOf(item)
  if (at >= 0) list.splice(at, 1)
}
