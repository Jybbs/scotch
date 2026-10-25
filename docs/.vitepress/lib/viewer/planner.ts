import { type Piece, pieceKind } from '../site/pieces.ts'
import { standingOf }            from './placements.ts'
import type * as sprites         from './sprites.ts'
import * as timeline             from './timeline.ts'
import * as trails               from './trail.ts'

function moved(from: trails.Point, to: trails.Point): boolean {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y) > 0.01
}

/**
 * Plans the motion of one board's pieces between positions of its game: every
 * move between the ply it stands at and the one a step reaches, in order, each
 * piece's legs and fades laid out once when the step is planned, so a frame
 * only reads them. A step back taken while pieces still move turns them back
 * from where they stand, a step taken during a jump chains each piece's move
 * behind its part in the jump, and a piece still moving long after a new step
 * arrives is hastened.
 */
export class Planner {
  active            = [] as sprites.Sprite[]
  at                = new Map<number, sprites.Sprite>()
  breaks            = 0
  end               = 0
  facing            : trails.Facing = 'white'
  plans             = [] as sprites.Plan[]
  ply?              : number
  readonly #laid    = new Map<number, trails.Laid>()
  readonly #pace    : Readonly<timeline.Pace>
  readonly #sprites : Pick<sprites.Sprites, 'make' | 'raise' | 'retire' | 'write'>
  #batches          = 0
  #placements       = [] as readonly string[]

  /**
   * Takes the nodes of the board's pieces and the pace the board moves at.
   */
  constructor(
    nodes : Pick<sprites.Sprites, 'make' | 'raise' | 'retire' | 'write'>,
    pace  : Readonly<timeline.Pace> = timeline.PACE
  ) {
    this.#sprites = nodes
    this.#pace    = pace
  }

  /**
   * Takes the placements of the game the board draws, so the next step snaps to
   * its position.
   */
  reset(placements: readonly string[]): void {
    this.#placements = placements
    this.#laid.clear()
    this.ply = undefined
  }

  /**
   * Lays out the pieces of ply `to` at once, keeping each piece already
   * standing on its square, reusing a node of the same piece for the rest
   * unless `crossfade` is set, which fades each piece that differs out and the
   * new one in, so a new game never moves a piece along a path it did not take.
   * Each node the ply leaves over is hidden at once, or faded out with the
   * rest.
   */
  snap(to: number, now: number, crossfade: boolean): void {
    const spare = new Map(this.at)
    const next  = new Map<number, sprites.Sprite>()
    const plan  = this.#planned(to, to, 0, now)
    const want  = standingOf(this.#placements[to]!)
    for (const [square, piece] of want.entries()) {
      if (piece && spare.get(square)?.piece === piece) next.set(square, spare.get(square)!)
    }
    for (const square of next.keys()) spare.delete(square)
    for (const [square, piece] of want.entries()) {
      if (!piece || next.has(square)) continue
      const reused = crossfade ? undefined : spare.entries().find(([, sprite]) => sprite.piece === piece)
      if (reused) spare.delete(reused[0])
      const sprite = reused?.[1] ?? this.#sprites.make(piece)
      sprite.rest  = { a: crossfade ? 0 : 1, s: 1, ...trails.cornerOf(square, this.facing) }
      this.#sprites.write(sprite, sprite.rest)
      if (crossfade) this.#fade(plan, sprite, now, now + this.#pace.crossfade, 1)
      next.set(square, sprite)
    }
    for (const sprite of spare.values()) {
      if (crossfade) this.#fade(plan, sprite, now, now + this.#pace.crossfade, 0)
      else this.#sprites.retire(sprite)
    }
    this.at  = next
    this.ply = to
    if (plan.fades.length > 0) this.plans.push(plan)
    this.end = timeline.horizonOf(this.active, now)
  }

  /**
   * Turns the board to a side, laying each piece out again where its square now
   * stands, with no motion, and laying every trail out afresh from there.
   */
  turn(facing: trails.Facing): void {
    this.facing = facing
    this.#laid.clear()
    for (const [square, sprite] of this.at) {
      sprite.rest = { ...sprite.rest, ...trails.cornerOf(square, facing) }
      this.#sprites.write(sprite, sprite.rest)
    }
  }

  /**
   * Plans the moves from the ply the board stands at to ply `to`, taking back a
   * planned move that has not started and turning back a single step still
   * running the other way, hastening each piece still moving long after now.
   */
  steer(to: number, now: number): void {
    while (this.plans.length > 0 && timeline.unstarted(this.plans.at(-1)!, now)) {
      const plan = this.plans.pop()!
      timeline.undo(plan)
      this.at  = plan.before
      this.ply = plan.a
    }
    while (this.plans.length > 0) {
      const last = this.plans.at(-1)!
      if (last.batch || last.end <= now || Math.sign(to - last.b) !== Math.sign(last.a - last.b)) break
      const plan = this.plans.pop()!
      timeline.unwind(this.#pace.chain, now, plan)
      this.at  = plan.before
      this.ply = plan.a
    }
    if (this.end - now > this.#pace.warp) timeline.hasten(this.active, now, this.#pace, this.plans)
    const count = Math.abs(to - this.ply!)
    const way   = Math.sign(to - this.ply!)
    const pace  = timeline.paceOf(count, this.#pace)
    const batch = count > 1 ? ++this.#batches : 0
    for (let step = 0; step < count; step++) {
      this.#plan(now + step * pace.slot, pace.length, this.ply!, this.ply! + way, batch)
      this.ply! += way
    }
    this.end = timeline.horizonOf(this.active, now)
  }

  /**
   * Takes each moving piece's last place and opacity as where it rests, writes
   * it at its own size, clears every plan, and hides each node no square holds
   * once the moves land.
   */
  settle(): void {
    const held = new Set(this.at.values())
    for (const sprite of this.active) {
      const rest = { ...sprite.written, a: sprite.shown / 100, s: 1 }
      Object.assign(sprite, { end: 0, fadeEnd: 0, live: false, rest })
      sprite.legs.length  = 0
      sprite.fades.length = 0
      this.#sprites.write(sprite, sprite.rest)
      if (!held.has(sprite) && sprite.node.getAttribute('display') !== 'none') this.#sprites.retire(sprite)
    }
    this.active = []
    this.plans  = []
    this.end    = 0
  }

  #carry(plan: sprites.Plan, travel: trails.Trailed, index: number, length: number): sprites.Leg | undefined {
    const sprite = plan.before.get(travel.from)
    if (!sprite) {
      this.breaks++
      return undefined
    }
    const arriving = sprite.legs.at(-1)
    const late     = plan.batch && arriving?.batch === plan.batch ? Math.max(0, arriving.t1 - plan.t0) : 0
    const start    = plan.t0 + index * length * this.#pace.stagger
    const stop     = plan.t0 + length
    const fade     = length * this.#pace.fade
    const morph    = travel.was !== travel.now
    const first    = morph && pieceKind(travel.was) !== 'p'
    const mover    = first ? this.#made(plan, travel.now, travel.trail.start) : sprite
    if (first) {
      const out  = this.#fade(plan, sprite, start, start + fade, 0)
      const into = this.#fade(plan, mover, start, start + fade, 1)
      if (late) for (const each of [out, into]) timeline.tie(arriving!, 'start', each, arriving!.trail.total)
    }
    const begin = first ? Math.max(start, plan.t0 + late) : start
    const until = first ? Math.max(stop, plan.t0 + late + this.#pace.chain) : stop
    const leg   = this.#travel(plan, mover, travel.trail, begin, until)
    plan.after.set(travel.to, mover)
    this.#sprites.raise(mover)
    if (morph && !first) {
      const promoted = this.#made(plan, travel.now, travel.trail.end)
      this.#sprites.raise(promoted)
      this.#fade(plan, mover, leg.t1 - fade, leg.t1, 0)
      this.#fade(plan, promoted, leg.t1 - fade, leg.t1, 1)
      plan.after.set(travel.to, promoted)
    }
    return leg
  }

  #fade(plan: sprites.Plan, sprite: sprites.Sprite, t0: number, t1: number, a1: 0 | 1): sprites.Fade {
    const start = Math.max(t0, sprite.fadeEnd)
    const fade  = { a0: 1 - a1, a1, plan, t0: start, t1: Math.max(t1, start + this.#pace.chain) }
    sprite.fades.push(fade)
    sprite.fadeEnd = fade.t1
    plan.fades.push([sprite, fade])
    plan.end = Math.max(plan.end, fade.t1)
    this.#live(sprite)
    return fade
  }

  /**
   * Joins a move inside a jump onto the leg its piece has not yet finished, so
   * the piece runs through both moves in one motion.
   */
  #join(
    plan   : sprites.Plan,
    sprite : sprites.Sprite,
    leg    : sprites.Leg,
    trail  : trails.Trail,
    stop   : number
  ): sprites.Leg {
    leg.merged.push({ from: leg.from, t1: leg.t1, trail: leg.trail })
    leg.from   = leg.trail.total
    leg.trail  = leg.trail.join(trail)
    leg.t1     = Math.max(stop, leg.t1, leg.t0 + leg.trail.total / this.#pace.speed)
    plan.merge = [sprite, leg]
    plan.end   = Math.max(plan.end, leg.t1)
    sprite.end = leg.t1
    timeline.retime(leg)
    return leg
  }

  #laidOf(a: number, b: number): trails.Laid {
    const [before, after] = [this.#placements[a]!, this.#placements[b]!]
    const key             = a * 4096 + b
    const laid            = this.#laid.get(key) ?? trails.laidOut(before, after, this.facing)
    this.#laid.set(key, laid)
    return laid
  }

  #live(sprite: sprites.Sprite): void {
    if (sprite.live) return
    sprite.live = true
    this.active.push(sprite)
  }

  #made(plan: sprites.Plan, piece: Piece, point: trails.Point): sprites.Sprite {
    const sprite = this.#sprites.make(piece)
    sprite.rest  = { a: 0, s: 1, ...point }
    this.#sprites.write(sprite, sprite.rest)
    plan.made.push(sprite)
    return sprite
  }

  /**
   * Plans the move from ply `a` to ply `b` over `length` from `t0`, chaining
   * each piece's travel after any it still has to finish, fading a captured
   * piece out as its taker lands and a piece taken back in as its taker leaves.
   */
  #plan(t0: number, length: number, a: number, b: number, batch: number): void {
    const { appear, travels, vanish } = this.#laidOf(a, b)
    const plan                        = this.#planned(a, b, batch, t0)
    for (const square of [...travels.map(({ from }) => from), ...vanish]) plan.after.delete(square)
    const lead = travels.map((travel, index) => this.#carry(plan, travel, index, length))[0]
    const fade = length * this.#pace.fade
    for (const square of vanish) {
      const sprite = plan.before.get(square)
      if (!sprite) continue
      const out = this.#fade(plan, sprite, Math.max(t0 + length - fade, sprite.end), t0 + length, 0)
      if (lead) timeline.tie(lead, 'end', out, lead.trail.total)
    }
    for (const { piece, square } of appear) {
      const sprite = this.#made(plan, piece, trails.cornerOf(square, this.facing))
      const into   = this.#fade(plan, sprite, t0, t0 + fade, 1)
      if (lead) timeline.tie(lead, 'start', into, lead.from)
      plan.after.set(square, sprite)
    }
    this.at = plan.after
    this.plans.push(plan)
  }

  #planned(a: number, b: number, batch: number, t0: number): sprites.Plan {
    const after = new Map(this.at)
    return { a, after, b, batch, before: this.at, end: t0, fades: [], legs: [], made: [], t0 }
  }

  #travel(
    plan   : sprites.Plan,
    sprite : sprites.Sprite,
    trail  : trails.Trail,
    start  : number,
    stop   : number
  ): sprites.Leg {
    const last = sprite.legs.at(-1)
    if (moved(last?.trail.end ?? sprite.rest, trail.start)) this.breaks++
    const joins = plan.batch && last?.batch === plan.batch && last.t1 > start
    if (joins) return this.#join(plan, sprite, last, trail, stop)
    const t0  = Math.max(start, sprite.end)
    const t1  = Math.max(stop, t0 + Math.max(this.#pace.chain, stop - start, trail.total / this.#pace.speed))
    const leg = { batch: plan.batch, from: 0, merged: [], plan, t0, t1, ties: [], trail }
    sprite.legs.push(leg)
    sprite.end = t1
    plan.legs.push([sprite, leg])
    plan.end = Math.max(plan.end, t1)
    this.#live(sprite)
    return leg
  }
}
