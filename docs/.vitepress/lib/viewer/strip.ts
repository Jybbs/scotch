import { clamp } from '@vueuse/core'

import { resolved }    from '../identity/scheme.ts'
import type { Loaded } from './loaded.ts'
import * as track      from './track.ts'
import type { Facing } from './trail.ts'

/**
 * The plies the track's own keys move the cursor by, as the ARIA slider pattern
 * sets: Up one ply on and Down one ply back, and Page Up and Page Down ten.
 */
const STEPS: Partial<Record<string, number>> = { ArrowDown: -1, ArrowUp: 1, PageDown: -10, PageUp: 10 }

/**
 * The drawn parts of the track: the area as wide as every ply, the canvas the
 * glyphs are drawn on, the head marking the cursor, the box the area scrolls
 * in, and the slider holding them.
 */
export interface TrackParts {
  area   : HTMLElement
  canvas : HTMLCanvasElement
  head   : HTMLElement
  scroll : HTMLElement
  slider : HTMLElement
}

/**
 * Keeps the drawn track in step with the Viewer's cursor, drawing every glyph
 * onto the canvas at the screen's pixel ratio, moving the head to the cursor's
 * column, and scrolling the track to keep that column a third of the way in,
 * measuring the box only when it resizes. Up and Down move the cursor one ply,
 * Page Up and Page Down ten, and a press or a drag moves it to the ply under
 * the pointer.
 */
export class TrackStrip {
  readonly #abort    = new AbortController()
  readonly #go       : (to: number) => void
  readonly #observer : ResizeObserver
  readonly #parts    : TrackParts
  #cursor            = 0
  #dragging          = false
  #facing            : Facing = 'white'
  #loaded?           : Loaded
  #target?           : number
  #view              = 0

  /**
   * Takes the drawn track and the call moving the Viewer's cursor, measuring
   * the box whenever it resizes and answering the keys and the pointer.
   */
  constructor(parts: TrackParts, go: (to: number) => void) {
    this.#go       = go
    this.#parts    = parts
    this.#observer = new ResizeObserver(([entry]) => {
      this.#measure(Math.round(entry!.contentRect.width))
    })
    this.#observer.observe(parts.scroll)
    this.#listen()
  }

  /**
   * Stops measuring the box and answering the keys and the pointer, as the
   * track leaves the page.
   */
  dispose(): void {
    this.#abort.abort()
    this.#observer.disconnect()
  }

  /**
   * Draws every glyph onto the canvas at the screen's pixel ratio, from the
   * side the boards face, in the colors the area's roles resolve to, drawing
   * nothing before a match loads, before the box is measured, or while the
   * canvas is off the page.
   */
  draw(facing = this.#facing): void {
    const { area, canvas } = this.#parts
    const loaded           = this.#loaded
    this.#facing           = facing
    if (!loaded || !canvas.isConnected || !this.#view) return
    const ratio = window.devicePixelRatio || 1
    Object.assign(canvas, {
      height : Math.round(track.TRACK_HEIGHT * ratio),
      width  : Math.round(track.trackWidth(loaded) * ratio)
    })
    const context = canvas.getContext('2d')
    if (!context) return
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    track.drawTrack(context, resolved(area, track.TRACK_ROLES), facing, loaded)
  }

  /**
   * Takes a newly loaded match, forgetting where the track last scrolled to,
   * and draws it from the side the boards face.
   */
  load(loaded: Loaded, facing: Facing): void {
    this.#loaded = loaded
    this.#target = undefined
    this.draw(facing)
  }

  /**
   * Moves the head to the cursor's column and scrolls the track to keep that
   * column a third of the way in, scrolling nothing before the box is measured.
   *
   * Args:
   *   cursor : The ply of the submitted game the boards show.
   *   glide  : Whether the head and the track glide there rather than jumping.
   */
  paint(cursor: number, glide: boolean): void {
    const { head, scroll } = this.#parts
    this.#cursor           = cursor
    if (!this.#loaded) return
    const x  = track.columnOf(cursor, this.#loaded)
    const at = `translate(${x}px, 0px)`
    head.classList.toggle('sc-viewer-gliding', glide)
    if (head.style.transform !== at) head.style.transform = at
    if (!this.#view) return
    const end = Math.max(0, track.trackWidth(this.#loaded) - this.#view)
    const to  = Math.round(clamp(x + track.TRACK.column / 2 - this.#view / 3, 0, end))
    if (to === this.#target) return
    this.#target = to
    scroll.scrollTo({ behavior: glide ? 'smooth' : 'auto', left: to })
  }

  /**
   * Answers Up, Down, Page Up, and Page Down, a press of the primary button,
   * and a drag while that button holds the pointer, each moving the cursor.
   */
  #listen(): void {
    const { canvas, slider } = this.#parts
    const options            = { signal: this.#abort.signal }
    const under              = (event: PointerEvent, loaded: Loaded): number =>
      track.plyUnder(loaded, event.clientX - canvas.getBoundingClientRect().left)
    const release = (): void => {
      this.#dragging = false
    }
    slider.addEventListener('keydown', event => {
      const by = STEPS[event.key]
      if (!by) return
      event.preventDefault()
      this.#go(this.#cursor + by)
    }, options)
    slider.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !this.#loaded) return
      this.#dragging = true
      slider.setPointerCapture(event.pointerId)
      this.#go(under(event, this.#loaded))
    }, options)
    slider.addEventListener('pointermove', event => {
      if (this.#dragging && this.#loaded) this.#go(under(event, this.#loaded))
    }, options)
    slider.addEventListener('lostpointercapture', release, options)
    slider.addEventListener('pointerup', release, options)
  }

  /**
   * Takes the box's new width, drawing the track again and scrolling the head
   * back into view where the width changed.
   */
  #measure(width: number): void {
    if (!width || width === this.#view) return
    this.#view   = width
    this.#target = undefined
    this.draw()
    this.paint(this.#cursor, false)
  }
}
