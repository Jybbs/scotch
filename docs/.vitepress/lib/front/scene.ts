import { clamp } from '@vueuse/core'

import { smooth, smoother } from '../motion/timing.ts'
import * as cycle           from './cycle.ts'
import type { Kind, Oval }  from './example.ts'
import * as field           from './field.ts'
import * as layers          from './layers.ts'
import { type Measure, type Plan, type Point, RING, slotOf } from './layout.ts'
import type { Mote, Way }   from './motes.ts'
import { spring }           from './spring.ts'
import { makeWay }          from './ways.ts'

/**
 * One frame of the backdrop: each piece drawn in each coloring at the opacity
 * it takes, and each ring a shared pair opens as it lands.
 */
export interface Frame {
  rings  : Ring[]
  stamps : Stamp[]
}

/**
 * Which pointer event reaches the scene, a press, a departure from the page, a
 * move, or a release.
 */
export type Pointing = 'down' | 'leave' | 'move' | 'up'

/**
 * The ring a shared pair opens as it lands, at the strength and the radius it
 * has reached.
 */
interface Ring {
  alpha  : number
  radius : number
  x      : number
  y      : number
}

/**
 * One drawing of a piece on the backdrop in one coloring.
 */
export interface Stamp {
  alpha : number
  layer : layers.Layer
  piece : Kind
  size  : number
  x     : number
  y     : number
}

/**
 * The front page's backdrop as a model the theme draws from: two games played
 * at once as an oval around the lockup, the submitted line on the top arc and
 * the stored game it meets on the bottom arc, ply n of each facing the other,
 * landing pair by pair from the left end, each pair whose position the two
 * share taking the run's color with a ring as it lands, and every other move of
 * the stored game loose down the whole page, a loose piece in the oval's path
 * giving way as the oval's pieces pass. A pointer stirs the pieces it passes,
 * and a tap gathers the oval or lets it go.
 */
export class Scene {
  animate = true
  drifted = 0
  held    = false
  motes   = [] as Mote[]
  pointer = null as Point | null
  press   = null as { at: number, x: number, y: number } | null
  shift   = 0
  time    = 5

  readonly oval     : Oval
  readonly settings : field.Settings
  readonly timing   : cycle.Timing

  measure? : Measure
  plan?    : Plan

  constructor(oval: Oval, settings = field.FIELD) {
    this.oval     = oval
    this.settings = settings
    this.timing   = cycle.timingOf(oval.shown)
  }

  /**
   * Finds where an oval piece stands on its journey: its drifted home and its
   * place on the oval joined by a straight path, carried past its end as the
   * Settle motion sets, before any push.
   */
  arcAt(piece: Mote, state: cycle.State): Point {
    const [sx, sy] = slotOf(this.plan!, piece.game, piece.k)
    const ex       = sx - piece.dx
    const ey       = sy - piece.dy
    const scale    = state.p + state.out * state.push / (Math.hypot(ex, ey) || 1)
    return [piece.dx + ex * scale, piece.dy + ey * scale]
  }

  /**
   * Reads how far a loose piece in the oval's path has gone from its home
   * toward the spot it makes way to, from 0 to 1, rising as an oval piece
   * coming to a place it stands near draws within reach and falling as that
   * piece leaves, or all the way while the oval holds still.
   */
  away(way: Way, at: Map<string, Point>): number {
    if (this.held) return 1
    return Math.max(0, ...way.near.map(place => {
      const [x, y] = at.get(place.id)!
      return smoother((way.r0 - Math.hypot(x - place.x, y - place.y)) / (way.r0 - way.r1))
    }))
  }

  /**
   * Lays out every piece for a measured page and the oval planned on it.
   *
   * Returns:
   *   How many loose pieces found a spot to make way to and how many found
   *   none.
   */
  build(measure: Measure, plan: Plan): { lost: number, made: number } {
    const laid   = new field.Field(measure, this.oval, plan, this.settings)
    this.measure = measure
    this.plan    = plan
    this.motes   = laid.placed()
    const ways   = makeWay(laid, this.motes)
    this.drift()
    return ways
  }

  /**
   * Reads the share of its strength a loose piece keeps at a depth down the
   * page, all of it across the hero, easing to the faded share a little before
   * the foot.
   */
  depth(y: number): number {
    const { F, H } = this.measure!
    const { foot } = layers.ALPHA
    return y <= H ? 1 : foot + (1 - foot) * (1 - smooth((y - H) / Math.max(1, F - H)))
  }

  /**
   * Draws the backdrop for the moment the scene holds, stepping every piece's
   * spring over `seconds` where any have passed, and leaving out every piece
   * more than twice its size above the backdrop's top or below its bottom.
   *
   * Args:
   *   height  : The height of the backdrop in view.
   *   seconds : The time the frame covers, 0 for a drawing that steps no
   *     spring.
   */
  draw(height: number, seconds = 0): Frame {
    const states = this.states()
    const hush   = 1 - 0.55 * clamp(states[this.oval.shown >> 1]!.p, 0, 1)
    const arcs   = this.motes.filter(piece => piece.k >= 0)
    const at     = new Map(arcs.map(piece => [piece.id, this.arcAt(piece, states[piece.k]!)]))
    const flying = arcs.filter(piece => states[piece.k]!.u > 0 && states[piece.k]!.u < 1)
    const moving = seconds > 0 ? flying.map(piece => at.get(piece.id)!) : []
    const frame  = { rings: [], stamps: [] } as Frame

    for (const piece of this.motes) {
      const [x, y] = at.get(piece.id) ?? this.made(piece, at)
      if (seconds > 0) {
        const placed = piece.k >= 0 ? states[piece.k]!.p : 0
        const passes = piece.k < 0 ? moving : []
        spring([x, y - this.shift], [x, y], this.settings.push, passes, piece, placed, this.pointer, seconds)
      }
      const drawn: Point = [x + piece.ox, y - this.shift + piece.oy]
      this.stamp(frame, piece, this.lookAt(piece, states, hush), drawn, height)
    }
    return frame
  }

  /**
   * Moves every piece to the point of its drift path for the scene's drift
   * time.
   */
  drift(): void {
    for (const piece of this.motes) {
      piece.dx = piece.hx + piece.ax * Math.sin(this.drifted / piece.px * 2 * Math.PI + piece.fx)
      piece.dy = piece.hy + piece.ay * Math.sin(this.drifted / piece.py * 2 * Math.PI + piece.fy)
    }
  }

  /**
   * Holds every piece still, the oval formed in its places and every push let
   * go, for a reader who prefers reduced motion.
   */
  hold(): void {
    this.held = true
    for (const piece of this.motes) Object.assign(piece, { ox: 0, oy: 0, vx: 0, vy: 0 })
  }

  /**
   * Reads how a piece is drawn at the scene's moment: a loose piece in plain
   * ink, dimmed across the hero while the oval forms and faded toward the foot,
   * and an oval piece as its pair's journey sets.
   */
  lookAt(piece: Mote, states: cycle.State[], hush: number): layers.Look {
    if (piece.k >= 0) {
      const shared = this.oval[piece.game].shared[piece.k]!
      return layers.lookOf(piece.game, hush, this.plan!, shared, states[piece.k]!)
    }
    const alpha = layers.ALPHA.loose * (piece.dy < this.measure!.H ? hush : 1) * this.depth(piece.dy)
    return { layers: [['ink', alpha]], since: -1, size: this.plan!.loose }
  }

  /**
   * Finds where a loose piece stands, its drifted home moved toward the spot it
   * makes way to as far as the oval's passing pieces have moved it.
   */
  made(piece: Mote, at: Map<string, Point>): Point {
    if (!piece.way) return [piece.dx, piece.dy]
    const share = this.away(piece.way, at)
    return [piece.dx + (piece.way.tx - piece.hx) * share, piece.dy + (piece.way.ty - piece.hy) * share]
  }

  /**
   * Takes a pointer's move, press, release, or departure at a point on the
   * backdrop, stirring the pieces it passes through while it stays inside, and
   * turning a quick tap into gathering the oval while its pieces are home or
   * letting it go while it holds, or, where the scene does not animate, into
   * holding it or releasing it.
   *
   * Args:
   *   inside : Whether the point lies on the backdrop rather than over the
   *     page's content.
   *   kind   : Which pointer event arrived.
   *   now    : The event's time in milliseconds.
   *   x, y   : The point on the backdrop.
   */
  point(inside: boolean, kind: Pointing, now: number, x: number, y: number): void {
    this.pointer = inside && kind !== 'leave' && kind !== 'up' ? [x, y] : null
    if (kind === 'down' && inside) this.press = { at: now, x, y }
    if (kind !== 'up' || !this.press) return
    const tap  = now - this.press.at < 320 && Math.hypot(x - this.press.x, y - this.press.y) < 8
    this.press = null
    if (tap && this.animate) this.toggle()
    else if (tap) {
      this.held = !this.held
      if (!this.held) this.time = 0
    }
  }

  /**
   * Adds a piece's drawings at a point to a frame where the point falls within
   * the backdrop's height by twice the piece's size, and its ring where its
   * shared pair landed less than a ring's time ago.
   */
  stamp(frame: Frame, piece: Mote, look: layers.Look, [x, y]: Point, height: number): void {
    const { layers: drawings, since, size } = look
    if (y < -size * 2 || y > height + size * 2) return
    for (const [layer, alpha] of drawings) {
      if (alpha > 0.005) frame.stamps.push({ alpha, layer, piece: piece.kind, size, x, y })
    }
    const run = drawings.find(([layer]) => layer === 'run')?.[1] ?? 0
    if (since < 0 || since >= RING.dur || run <= 0.005) return
    const share = since / RING.dur
    frame.rings.push({
      alpha  : 0.75 * (1 - share) ** 1.5 * run / layers.ALPHA.run,
      radius : size * (0.62 + (this.plan!.ringReach - 0.62) * (1 - (1 - share) ** 2)),
      x      : x,
      y      : y
    })
  }

  /**
   * Reads where each ply's pair stands at the scene's time.
   */
  states(): cycle.State[] {
    return cycle.statesAt(this.time, this.timing, this.held)
  }

  /**
   * Steps the scene's clock and its drift by `milliseconds`, capped at 40 so a
   * frame the browser dropped never jumps a piece, and draws it.
   */
  step(milliseconds: number, height: number): Frame {
    const seconds = Math.min(milliseconds, 40) / 1000
    this.time    += seconds
    this.drifted += seconds
    this.drift()
    return this.draw(height, seconds)
  }

  /**
   * Moves the cycle on to the oval letting go while every pair stands in its
   * place, or to the oval gathering while every pair is home.
   */
  toggle(): void {
    const { gatherAt, length, releaseAt } = cycle.CYCLE
    const moment                          = this.time % length
    if (moment >= this.timing.setAt && moment < releaseAt) this.time += releaseAt - moment
    else if (moment < gatherAt) this.time += gatherAt - moment
    else if (moment >= this.timing.looseAt) this.time += length - moment + gatherAt
  }
}
