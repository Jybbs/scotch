import { resolved }                         from '../identity/scheme.ts'
import * as colors                          from './colors.ts'
import { ovalOf }                           from './example.ts'
import { type Plan, layout, pads }          from './layout.ts'
import * as measure                         from './measure.ts'
import * as painter                         from './painter.ts'
import { type Frame, type Pointing, Scene } from './scene.ts'

/**
 * The elements the page shows over the backdrop, whose boxes a pointer passes
 * over without stirring the pieces.
 */
const CONTENT = '.sc-card, .VPNav, .VPLocalNav, .VPFooter, .VPButton, a, button, input'

/**
 * Draws every drawing a plan needs onto a canvas of its own at the screen's
 * pixel density, each from its SVG decoded once as an image.
 */
async function bitmapsOf(
  dark    : boolean,
  palette : colors.Palette,
  plan    : Plan
): Promise<Map<string, CanvasImageSource>> {
  const ratio   = window.devicePixelRatio
  const entries = await Promise.all(painter.needed(plan).map(async ({ kind, layer, size }) => {
    const svg     = colors.drawing(dark, kind, layer, palette, size * 4)
    const image   = new Image()
    image.src     = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    const bitmap  = document.createElement('canvas')
    bitmap.width  = Math.ceil(size * ratio)
    bitmap.height = Math.ceil(size * ratio)
    const context = bitmap.getContext('2d')
    context?.scale(ratio, ratio)
    await image.decode()
    context?.drawImage(image, 0, 0, size, size)
    return [painter.bitmapKey(layer, kind, size), bitmap] as const
  }))
  return new Map(entries)
}

/**
 * Reads the boxes the front page's elements take, or `undefined` where the page
 * holds no hero, wordmark, or tagline to lay the oval out around.
 */
function rectsOf(home: Element): measure.Rects | undefined {
  const hero     = home.querySelector('.VPHero')
  const wordmark = home.querySelector('.sc-wordmark svg')
  const tagline  = home.querySelector('.sc-tagline')
  if (!hero || !wordmark || !tagline) return undefined

  const range = document.createRange()
  const foot  = document.querySelector('.VPFooter')
  range.selectNodeContents(tagline)

  return {
    actions  : [...hero.querySelectorAll('.actions .VPButton')].map(button => button.getBoundingClientRect()),
    bar      : document.querySelector('.VPNavBar')?.getBoundingClientRect().height ?? 0,
    hero     : hero.getBoundingClientRect(),
    home     : home.getBoundingClientRect(),
    scrollY  : window.scrollY,
    tagline  : [...range.getClientRects()],
    width    : document.documentElement.clientWidth,
    wordmark : wordmark.getBoundingClientRect(),
    ...foot ? { foot: foot.getBoundingClientRect() } : {}
  }
}

/**
 * The backdrop as the page shows it: the scene, the drawings it paints each
 * piece from, and where the page's top sits, so a piece is drawn where the page
 * has scrolled it.
 */
export class View {
  built   = ''
  origin  = 0
  version = 0

  readonly scene: Scene

  drawings?: painter.Drawings

  constructor(scene = new Scene(ovalOf())) {
    this.scene = scene
  }

  /**
   * Measures the page without the room it set before, sets the hero's room
   * above and beneath the lockup to what the oval needs, and measures the page
   * again. It then reads where the page's top sits under the bar, sizes the
   * canvas to the viewport, and lays every piece out where anything the layout
   * reads has changed.
   *
   * Returns:
   *   Whether the pieces were laid out again, so their drawings need painting.
   */
  build(home: HTMLElement, canvas: HTMLCanvasElement): boolean {
    this.clear(home)
    const first = rectsOf(home)
    if (!first) return false

    const { shared } = this.scene.oval
    const bare       = measure.measured(first)
    const room       = pads(bare, layout(bare, shared))
    home.style.setProperty('--sc-hero-top', `${room.top.toFixed(2)}px`)
    home.style.setProperty('--sc-hero-bottom', `${room.bottom.toFixed(2)}px`)

    const rects = rectsOf(home)!
    const page  = measure.measured(rects)
    this.origin = measure.originOf(rects)
    this.scroll()
    this.fit(canvas, page.W, window.innerHeight)
    const key = measure.keyOf(page)
    if (key === this.built) return false
    this.built = key
    this.scene.build(page, layout(page, shared))
    return true
  }

  /**
   * Removes the room `build` sets above the wordmark and beneath the actions,
   * so the hero takes the room its stylesheet gives it.
   */
  clear(home: HTMLElement | null): void {
    home?.style.removeProperty('--sc-hero-top')
    home?.style.removeProperty('--sc-hero-bottom')
  }

  /**
   * Paints a frame onto the canvas inside the band below the bar while the page
   * sits at its top, which reaches the viewport's top once it scrolls.
   */
  draw(canvas: HTMLCanvasElement | null, frame: Frame): void {
    const context = canvas?.getContext('2d')
    if (!context || !this.drawings) return
    painter.paint(context, { ...this.drawings, clip: Math.max(0, this.origin - window.scrollY) }, frame)
  }

  /**
   * Sizes the canvas to the viewport on whole device pixels, scales its context
   * to the viewport's own pixels, and sizes the band the drawings are painted
   * in to match once they are painted.
   */
  fit(canvas: HTMLCanvasElement, width: number, height: number): void {
    const ratio         = window.devicePixelRatio
    canvas.width        = Math.round(width * ratio)
    canvas.height       = Math.round(height * ratio)
    canvas.style.width  = `${width}px`
    canvas.style.height = `${height}px`
    canvas.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0)
    if (this.drawings) Object.assign(this.drawings, { height, width })
  }

  /**
   * Passes a pointer event to the scene as a point on the backdrop, which stirs
   * the pieces only where the pointer is inside the viewport and over no
   * content.
   */
  point(kind: Pointing, event: PointerEvent): void {
    const over   = event.target instanceof Element && event.target.closest(CONTENT) !== null
    const inside = !over && event.clientY >= 0 && event.clientY <= window.innerHeight
    this.scene.point(inside, kind, event.timeStamp, event.clientX, event.clientY)
  }

  /**
   * Draws the scene as it stands, stepping nothing.
   */
  render(canvas: HTMLCanvasElement | null): void {
    if (this.scene.plan) this.draw(canvas, this.scene.draw(window.innerHeight))
  }

  /**
   * Paints every drawing the scene's plan needs in the colors the page shows
   * under `root`, dropping the drawings where a newer pass has overtaken this
   * one.
   *
   * Returns:
   *   Whether the drawings were kept.
   */
  async repaint(root: HTMLElement, dark: boolean): Promise<boolean> {
    const plan = this.scene.plan
    if (!plan) return false
    const version = ++this.version
    const palette = resolved(root, colors.PAINTS)
    const bitmaps = await bitmapsOf(dark, palette, plan)
    if (version !== this.version) return false
    this.drawings = {
      bitmaps : bitmaps,
      clip    : 0,
      height  : window.innerHeight,
      run     : palette.run,
      sizes   : painter.sizesOf(plan),
      width   : plan.W
    }
    return true
  }

  /**
   * Passes the scene how far the page has scrolled past its top.
   */
  scroll(): void {
    this.scene.shift = window.scrollY - this.origin
  }
}
