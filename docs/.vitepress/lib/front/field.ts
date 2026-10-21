import * as example  from './example.ts'
import { type Measure, NARROW, type Plan, type Point, boxAround, gapBetween, slotOf } from './layout.ts'
import type { Mote } from './motes.ts'
import { seeded }    from './random.ts'

/**
 * The tuning a field takes: the drift each piece takes across and down, the
 * farthest a pointer or a passing piece pushes it, how many times as many
 * pieces it holds as a grid of full-size cells would, the seed its layout
 * repeats from, the pixels each piece keeps beyond its drift and its push, and
 * the room every piece keeps from the wordmark, the tagline, and the actions.
 */
export interface Settings {
  drift     : { x: number, y: number }
  push      : number
  scale     : number
  seed      : number
  spare     : number
  textReach : number
}

/**
 * The idle field the front page draws: each piece drifting up to 7 pixels
 * across and 5 down and pushed up to 9, one piece to a cell of a grid whose
 * cells shrink by the square root of 1.5, so the field holds one and a half
 * times the pieces the grid would at full size, a layout repeating from the
 * seed 58, 4 pixels each piece keeps beyond its drift and its push, and 26
 * pixels every piece keeps from the wordmark, the tagline, and the actions.
 */
export const FIELD: Settings = {
  drift     : { x: 7, y: 5 },
  push      : 9,
  scale     : 1.5,
  seed      : 58,
  spare     : 4,
  textReach : 26
}

/**
 * The pieces of the front page laid out on one measured page, with the homes
 * they take and the tests a home or a spot passes.
 */
export class Field {
  readonly homes    = [] as Point[]
  readonly measure  : Pick<Measure, 'H' | 'P' | 'W' | 'parts'>
  readonly oval     : example.Oval
  readonly plan     : Plan
  readonly random   : () => number
  readonly settings : Settings

  constructor(
    measure  : Pick<Measure, 'H' | 'P' | 'W' | 'parts'>,
    oval     : example.Oval,
    plan     : Plan,
    settings : Settings = FIELD
  ) {
    this.measure  = measure
    this.oval     = oval
    this.plan     = plan
    this.random   = seeded(settings.seed)
    this.settings = settings
  }

  /**
   * Reads how far a loose piece's home keeps from each place on the oval, its
   * drift, its push, its spare room, half its size, and a ring all counted.
   */
  get clearance(): number {
    return this.room + this.plan.ring + this.plan.loose / 2
  }

  /**
   * Reads how far a piece moves from its home through the farthest its drift
   * and a push carry it, with its spare room.
   */
  get room(): number {
    return this.settings.drift.x + this.settings.push + this.settings.spare
  }

  /**
   * Tests whether two homes stand far enough apart that the pieces drifting
   * about them never overlap, apart across by the piece's size and twice its
   * drift across, or apart down by its size and twice its drift down.
   */
  apart([x1, y1]: Point, [x2, y2]: Point): boolean {
    const { drift } = this.settings
    const size      = this.plan.loose
    return Math.abs(x1 - x2) >= size + 2 * drift.x || Math.abs(y1 - y2) >= size + 2 * drift.y
  }

  /**
   * Places the pieces of the plies the oval shows at homes across the hero and
   * just below it, each about a set distance from its place on the oval so its
   * journey stays unhurried, the top arc's first.
   */
  arcs(): Mote[] {
    return example.GAMES.flatMap(game =>
      this.oval[game].moves
        .slice(0, this.oval.shown)
        .map((move, k) => this.mote(game, k, move, this.near(slotOf(this.plan, game, k)))))
  }

  /**
   * Tests whether a piece standing at a spot keeps clear of every place on the
   * oval, a ring included, as well as passing `open`.
   */
  free(spot: Point): boolean {
    const { cy, slots } = this.plan
    const [x, y]        = spot
    const away          = (sx: number, row: number): boolean => Math.hypot(x - sx, y - row) >= this.clearance
    return this.open(spot) && slots.every(([sx, sy]) => away(sx, sy) && away(sx, 2 * cy - sy))
  }

  /**
   * Places the stored game's other moves, and the line's past the oval, one
   * home to a cell of a grid down the whole page, the oval's places included,
   * each at a spot in its cell the seed sets, skipping a cell no spot in it
   * passes.
   */
  loose(): Mote[] {
    const narrow  = this.measure.W < NARROW
    const cell    = 1 / Math.sqrt(this.settings.scale)
    const columns = Math.max(3, Math.round(this.measure.W / ((narrow ? 88 : 96) * cell)))
    const height  = (narrow ? 92 : 96) * cell
    const width   = this.measure.W / columns
    const rest    = [
      ...this.oval.bot.moves.slice(this.oval.shown).map(move => ['bot', move] as const),
      ...this.oval.top.moves.slice(this.oval.shown).map(move => ['top', move] as const)
    ]
    if (rest.length === 0) return []
    const motes = [] as Mote[]

    for (let row = 0; row < Math.ceil(this.measure.P / height); row++) {
      for (let column = 0; column < columns; column++) {
        const spot = this.spotIn(column * width, row * height, width, height)
        if (!spot) continue
        const [game, move] = rest[motes.length % rest.length]!
        motes.push({ ...this.mote(game, -1, move, spot), id: `loose${motes.length}` })
      }
    }
    return motes
  }

  /**
   * Builds the piece playing `move` for `game` at its home, drawing its drift
   * from the seed in a fixed order, so the field's layout repeats, and records
   * its home among the homes taken.
   */
  mote(game: example.Game, k: number, move: example.Move, [hx, hy]: Point): Mote {
    const { drift } = this.settings
    this.homes.push([hx, hy])
    const [ax, ay, px, py, fx, fy] = [
      drift.x * (0.4 + 0.6 * this.random()), drift.y * (3 + 4 * this.random()) / 7,
      19 + this.random() * 24, 23 + this.random() * 20,
      this.random() * 2 * Math.PI, this.random() * 2 * Math.PI
    ]
    return {
      ax   : ax,
      ay   : ay,
      dx   : hx,
      dy   : hy,
      fx   : fx,
      fy   : fy,
      game : game,
      home : this.homes.length - 1,
      hx   : hx,
      hy   : hy,
      id   : example.moteId(game, k),
      k    : k,
      kind : move.kind,
      ox   : 0,
      oy   : 0,
      px   : px,
      py   : py,
      vx   : 0,
      vy   : 0
    }
  }

  /**
   * Finds a home for a piece of the oval near its place: the spot, of the first
   * ten free and roomy ones the seed draws across the hero and just below it,
   * whose distance from the place comes nearest the reach a journey takes, or
   * the place itself where none is found.
   */
  near(place: Point): Point {
    const { H, W } = this.measure
    const reach    = W < NARROW ? 120 : 180
    let best: [Point, number] | undefined
    for (let found = 0, tries = 0; tries < 600 && found < 10; tries++) {
      const spot: Point = [8 + this.random() * (W - 16), 8 + this.random() * (H + 260)]
      if (!this.free(spot) || !this.roomy(spot)) continue
      found++
      const miss = Math.abs(Math.hypot(spot[0] - place[0], spot[1] - place[1]) - reach)
      if (!best || miss < best[1]) best = [spot, miss]
    }
    return best?.[0] ?? place
  }

  /**
   * Tests whether a piece standing at a spot keeps inside the page's sides and
   * clear of the wordmark, the tagline, and the actions through the farthest
   * its drift and a push carry it.
   */
  open([x, y]: Point): boolean {
    const size  = this.plan.loose
    const reach = Math.max(this.settings.textReach, this.room)
    if (x < size / 2 + 2 || x > this.measure.W - size / 2 - 2) return false
    const box = boxAround([x, y], size)
    return this.measure.parts.every(part => gapBetween(box, part) >= reach)
  }

  /**
   * Places the oval's pieces first, so every loose piece stands apart from
   * their homes, and lists the loose pieces ahead of them.
   */
  placed(): Mote[] {
    const arcs = this.arcs()
    return [...this.loose(), ...arcs]
  }

  /**
   * Tests whether a spot stands apart from every home taken so far.
   */
  roomy(spot: Point): boolean {
    return this.homes.every(home => this.apart(spot, home))
  }

  /**
   * Draws up to twelve spots in the middle seven tenths of a grid cell from the
   * seed, and takes the first one open and apart from every home.
   */
  spotIn(left: number, top: number, width: number, height: number): Point | undefined {
    for (let tries = 0; tries < 12; tries++) {
      const across      = left + (0.15 + 0.7 * this.random()) * width
      const spot: Point = [across, top + (0.15 + 0.7 * this.random()) * height]
      if (this.open(spot) && this.roomy(spot)) return spot
    }
    return undefined
  }
}
