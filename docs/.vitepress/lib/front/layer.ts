import { clamp, useDevicePixelRatio, useEventListener, useRafFn, useResizeObserver } from '@vueuse/core'
import { type Ref, onMounted, watch }                                                 from 'vue'

import { resolved, useDark }     from '../identity/scheme.ts'
import { useMotion }             from '../motion/control.ts'
import { type Mosaic, mosaicOf } from './mosaic.ts'
import { Pour }                  from './pour.ts'
import * as sprites              from './sprites.ts'

/**
 * How the layer behind the front page draws the mark: the share of the layer's
 * height and width the mark fills at most, the share of the scroll down the
 * page past which every piece has poured in, the share of the hero's height
 * over which its board fades as the page scrolls past it, and the share of a
 * game's color and the opacity of the pieces in each scheme.
 */
export interface LayerTuning {
  fade   : number
  fill   : number
  filled : number
  inks   : Readonly<Record<'dark' | 'light', Pick<sprites.Ink, 'glyph' | 'strength'>>>
}

/**
 * The layer every reader meets.
 */
export const LAYER_TUNING: Readonly<LayerTuning> = {
  fade   : 0.85,
  fill   : 0.9,
  filled : 0.94,
  inks   : { dark: { glyph: 0.36, strength: 0.26 }, light: { glyph: 0.5, strength: 0.24 } }
}

/**
 * Reads how far down the front page the scroll stands, as a share of the
 * scroll the page leaves below the layer.
 */
function progressOf(canvas: HTMLCanvasElement, home: HTMLElement, tuning: LayerTuning): number {
  const box    = home.getBoundingClientRect()
  const travel = box.height - canvas.clientHeight
  return travel > 0 ? clamp(-box.top / travel / tuning.filled, 0, 1) : 1
}

/**
 * Draws the mark built of pieces into a canvas the size of the window, each
 * piece placed where its pour sets it, the mark centered and scaled to fill
 * the canvas as far as `fill` allows, every cell drawn once into a sprite and
 * drawn again only once the canvas's size, its pixel ratio, or the scheme
 * changes.
 */
export class MarkLayer {
  readonly #canvas : HTMLCanvasElement
  readonly #glyphs : Readonly<Record<string, HTMLImageElement>>
  readonly #mosaic : Mosaic
  readonly #tuning : LayerTuning
  #built           = ''
  #sprites         : sprites.Sprite[] = []
  readonly pour    : Pour

  /**
   * Takes over a canvas, every piece standing out of its cell.
   *
   * Args:
   *   canvas : The canvas the mark is drawn into.
   *   glyphs : Each piece's drawing, decoded.
   *   mosaic : The mark laid out as cells.
   *   tuning : How the layer draws the mark.
   */
  constructor(
    canvas : HTMLCanvasElement,
    glyphs : Readonly<Record<string, HTMLImageElement>>,
    mosaic : Mosaic,
    tuning : LayerTuning = LAYER_TUNING
  ) {
    this.#canvas = canvas
    this.#glyphs = glyphs
    this.#mosaic = mosaic
    this.#tuning = tuning
    this.pour    = new Pour(mosaic.cells)
  }

  #build(dark: boolean, height: number, ratio: number, scale: number, width: number): void {
    const key = `${width}x${height}@${ratio}:${dark}`
    if (key === this.#built) return
    const colors = resolved(this.#canvas, { page: 'page', stored: 'stored', submitted: 'submitted' })
    const ink    = { ...colors, ...this.#tuning.inks[dark ? 'dark' : 'light'] }
    this.#sprites       = sprites.spritesOf(this.#glyphs, ink, this.#mosaic, ratio, scale)
    this.#canvas.width  = Math.round(width * ratio)
    this.#canvas.height = Math.round(height * ratio)
    this.#built         = key
  }

  /**
   * Clears the canvas and draws each piece where its pour stands.
   *
   * Args:
   *   dark  : Whether the page shows its dark scheme.
   *   ratio : The device pixel ratio the canvas draws at.
   */
  paint(dark: boolean, ratio: number): void {
    const width  = this.#canvas.clientWidth
    const height = this.#canvas.clientHeight
    if (!width || !height) return
    const { box } = this.#mosaic
    const scale   = this.#tuning.fill * Math.min(height / box.height, width / box.width)
    this.#build(dark, height, ratio, scale, width)

    const context = this.#canvas.getContext('2d')!
    const reach   = Math.hypot(width, height)
    const left    = (width - box.width * scale) / 2
    const top     = (height - box.height * scale) / 2
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, this.#canvas.width, this.#canvas.height)
    for (const [index, cell] of this.#mosaic.cells.entries()) {
      const placed = this.pour.placed(index, reach)
      if (!placed) continue
      const { canvas, pad, side } = this.#sprites[index]!
      const x = left + (cell.left - box.x) * scale + side / 2 + Math.cos(cell.angle) * placed.away
      const y = top + (cell.top - box.y) * scale + side / 2 + Math.sin(cell.angle) * placed.away
      context.setTransform(ratio, 0, 0, ratio, x * ratio, y * ratio)
      context.rotate(placed.turn)
      context.globalAlpha = placed.alpha
      context.drawImage(canvas, -side / 2 - pad, -side / 2 - pad, canvas.width / ratio, canvas.height / ratio)
    }
    context.globalAlpha = 1
  }
}

/**
 * Draws the mark built of pieces into the front page's layer once the page
 * mounts and the pieces' drawings decode, pouring each piece in once the
 * scroll passes its place and lifting it out once the scroll falls behind,
 * and fades the hero's board as the page scrolls past it through the
 * `--sc-ground` property the front page's element carries. A frame runs only
 * while a piece moves or once the scroll, the canvas's size, the pixel ratio,
 * the scheme, or the motion switch changes, and every piece stands in its cell
 * at once while the site's drawings hold still.
 *
 * Args:
 *   canvas : The ref the layer's canvas binds to.
 *   tuning : How the layer draws the mark.
 */
export function useMarkLayer(canvas: Ref<HTMLCanvasElement | null>, tuning = LAYER_TUNING): void {
  const dark           = useDark()
  const { moving }     = useMotion()
  const { pixelRatio } = useDevicePixelRatio()
  let layer: MarkLayer | undefined

  const frame = ({ delta, timestamp }: { delta: number, timestamp: number }): void => {
    const home = canvas.value?.closest<HTMLElement>('.VPHome')
    const hero = home?.querySelector<HTMLElement>('.VPHero')
    if (!layer || !home) return void loop.pause()
    if (hero) {
      const box = hero.getBoundingClientRect()
      home.style.setProperty('--sc-ground', String(1 - clamp(-box.top / (box.height * tuning.fade), 0, 1)))
    }
    const short = layer.pour.advance(Math.min(delta, 64), moving.value, timestamp,
      moving.value ? progressOf(canvas.value!, home, tuning) : 1)
    layer.paint(dark.value, pixelRatio.value)
    if (!short) loop.pause()
  }
  const loop = useRafFn(frame, { immediate: false })

  onMounted(async () => {
    layer = new MarkLayer(canvas.value!, await sprites.glyphsOf(), mosaicOf(), tuning)
    loop.resume()
  })
  useEventListener('scroll', loop.resume, { passive: true })
  useResizeObserver(canvas, loop.resume)
  watch([dark, moving, pixelRatio], loop.resume)
}
