import { arrowOf, hopAt }             from './drawing.ts'
import type { Side }                  from './examples.ts'
import type { Party }                 from './loaded.ts'
import { type Hop, standingOf }       from './placements.ts'
import { Planner }                    from './planner.ts'
import { type Pose, Sprites, poseAt } from './sprites.ts'
import { PACE, type Pace }            from './timeline.ts'
import type { Facing }                from './trail.ts'

/**
 * How a board reaches a ply: playing each move between, snapping there with a
 * crossfade where it draws another game than before, or snapping there with no
 * motion at all, as a reader who prefers reduced motion sees it.
 */
export type Reach = 'glide' | 'jump' | 'still'

/**
 * The milliseconds past a step's last landing after which a board settles
 * whatever its frames left, should no frame run to the end.
 */
const SPARE = 400

/**
 * Moves one game's board between the positions of its game once it is drawn:
 * every piece's node kept mounted and reused, each move between two positions
 * planned as a step is taken and played out once a frame, the last move's two
 * squares marked, each game's next move drawn as an arrow, and the squares the
 * two boards differ on marked while the reader asks for them.
 */
export class GameBoard {
  readonly #arrows  : Record<Party, SVGGElement>
  readonly #hops    : SVGRectElement[]
  readonly #pace    : Readonly<Pace>
  readonly #planner : Planner
  readonly #pose    : Pose = { a: 0, s: 1, x: 0, y: 0 }
  readonly #sprites : Sprites
  readonly #squares : SVGRectElement[]
  #frame            = 0
  #game?            : Side
  #swap             = false
  #timer?           : ReturnType<typeof setTimeout>

  /**
   * Takes over a board as drawn, holding its squares, the two marks of the last
   * move, the layer the pieces are drawn in with any pieces the build drew at
   * rest there, and the two arrows.
   */
  constructor(svg: SVGSVGElement, pace: Readonly<Pace> = PACE) {
    this.#arrows = {
      stored    : svg.querySelector<SVGGElement>(".sc-viewer-arrow[data-game='stored']")!,
      submitted : svg.querySelector<SVGGElement>(".sc-viewer-arrow[data-game='submitted']")!
    }
    this.#hops       = [...svg.querySelectorAll<SVGRectElement>('.sc-viewer-hop')]
    this.#pace       = pace
    this.#sprites    = new Sprites(svg.querySelector<SVGGElement>('.sc-viewer-pieces')!)
    this.#squares    = [...svg.querySelectorAll<SVGRectElement>('.sc-viewer-square')]
    this.#planner    = new Planner(this.#sprites, pace)
    this.#planner.at = this.#sprites.adopted
  }

  /**
   * Reads how many times a piece was planned to set off from somewhere other
   * than where it stood, which a smooth board never does.
   */
  get breaks(): number {
    return this.#planner.breaks
  }

  /**
   * Reports whether every piece the board shows stands on the square and is the
   * piece its ply's placement names, with no piece shown beyond them.
   */
  get checked(): boolean {
    if (!this.#game || this.#planner.ply === undefined) return this.#sprites.shown.length === 0
    const want  = standingOf(this.#game.placements[this.#planner.ply]!)
    const shown = this.#sprites.shown
    return shown.length === want.filter(Boolean).length
        && shown.every(({ off, piece, square }) => want[square] === piece && off < 0.01)
  }

  /**
   * Marks each square `squares` lists as one the two boards differ on, and
   * clears the mark from every other square.
   */
  differ(squares: readonly number[] = []): void {
    for (const rect of this.#squares) {
      rect.toggleAttribute('data-differ', squares.includes(Number(rect.dataset.square)))
    }
  }

  /**
   * Stops every frame and timer the board runs, as the board leaves the page.
   */
  dispose(): void {
    cancelAnimationFrame(this.#frame)
    clearTimeout(this.#timer)
  }

  /**
   * Settles every move still planned at its end.
   */
  finish(): void {
    if (this.#planner.plans.length === 0 && this.#planner.active.length === 0) return
    cancelAnimationFrame(this.#frame)
    this.#frame = 0
    for (const sprite of this.#planner.active) {
      this.#sprites.write(sprite, poseAt(sprite, 0, this.#pose, Infinity))
    }
    this.#planner.settle()
    clearTimeout(this.#timer)
  }

  /**
   * Moves the board to ply `to` of its game.
   *
   * Returns:
   *   How many milliseconds from now the moves take to land.
   */
  go(to: number, reach: Reach): number {
    if (!this.#game) return 0
    const now = performance.now()
    if (to === this.#planner.ply) return Math.max(0, this.#planner.end - now)
    if (reach !== 'glide' || this.#planner.ply === undefined) {
      const crossfade = this.#swap && reach !== 'still'
      this.#swap      = false
      this.finish()
      this.#planner.snap(to, now, crossfade)
      if (this.#planner.plans.length === 0) return 0
      this.#run(now)
      return this.#planner.end - now
    }
    if (now >= this.#planner.end) this.finish()
    this.#planner.steer(to, now)
    this.#run(now)
    return this.#planner.end - now
  }

  /**
   * Takes the game the board draws, so the next step snaps to its position,
   * crossfading from the game it drew before, or clears the board where no game
   * is given.
   */
  load(game: Side | null): void {
    this.finish()
    if (!game) {
      for (const sprite of this.#planner.at.values()) this.#sprites.retire(sprite)
      this.#planner.at = new Map()
    }
    this.#swap = !!this.#game && this.#planner.at.size > 0
    this.#game = game ?? undefined
    this.#planner.reset(game?.placements ?? [])
  }

  /**
   * Marks the last move's two squares, or hides the marks where no move reached
   * the ply.
   */
  mark(hop?: Hop): void {
    for (const [at, rect] of this.#hops.entries()) {
      const square = hop && [hop.from, hop.to][at]
      rect.setAttribute('opacity', square === undefined ? '0' : '1')
      if (square === undefined) continue
      const { x, y } = hopAt(square, this.#planner.facing)
      rect.setAttribute('x', String(x))
      rect.setAttribute('y', String(y))
    }
  }

  /**
   * Draws each game's move from the last position the two share as an arrow in
   * that game's color, the stylesheet lighting it once the pieces land and
   * drawing the other game's arrow thinner and fainter than the board's own,
   * the heads drawn apart where both moves reach one square, and hides the
   * arrow of a game given no move.
   */
  point(hops: Partial<Record<Party, Hop>> = {}): void {
    const apart = hops.stored && hops.submitted && hops.stored.to === hops.submitted.to
    for (const [party, arrow] of Object.entries(this.#arrows) as [Party, SVGGElement][]) {
      const hop = hops[party]
      arrow.toggleAttribute('data-on', !!hop)
      if (!hop) continue
      const { head, line } = arrowOf(apart ? (party === 'submitted' ? -7 : 7) : 0, this.#planner.facing, hop)
      const [stroke, tip]  = arrow.children
      stroke!.setAttribute('d', line)
      tip!.setAttribute('d', head)
    }
  }

  /**
   * Turns the board to a side, settling whatever a step left running and laying
   * every piece out again where its square now stands.
   */
  turn(facing: Facing): void {
    if (facing === this.#planner.facing) return
    this.finish()
    this.#planner.turn(facing)
  }

  #run(now: number): void {
    this.#frame ||= requestAnimationFrame(this.#tick)
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => {
      this.finish()
    }, this.#planner.end - now + SPARE)
  }

  readonly #tick = (now: number): void => {
    for (const sprite of this.#planner.active) {
      this.#sprites.write(sprite, poseAt(sprite, this.#pace.lift, this.#pose, now))
    }
    this.#frame = now < this.#planner.end ? requestAnimationFrame(this.#tick) : 0
  }
}
