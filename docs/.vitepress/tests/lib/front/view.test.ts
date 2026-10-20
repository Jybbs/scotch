// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'

import { CROP }             from '../../../lib/front/colors.ts'
import * as painter         from '../../../lib/front/painter.ts'
import { View }             from '../../../lib/front/view.ts'
import { context, standIn } from '../../common/page.ts'

/**
 * Lays the stand-in page out and builds a view on it, its canvas inside the
 * front page.
 */
function built(drawn = context()): { canvas: HTMLCanvasElement, home: HTMLElement, view: View } {
  const home   = standIn(drawn)
  const canvas = document.createElement('canvas')
  home.append(canvas)
  const view = new View()
  view.build(home, canvas)
  return { canvas, home, view }
}

/**
 * Reads the SVG source of every image the view decoded.
 */
function decoded(): string[] {
  const images = vi.mocked(HTMLImageElement.prototype.decode).mock.contexts as HTMLImageElement[]
  return images.map(image => decodeURIComponent(image.src))
}

/**
 * Moves every box inside the lockup and the actions down by the room the view
 * last set above them, as the browser lays the page out again once it is set.
 */
function lowerLockup(home: HTMLElement): void {
  const boxOf = vi.mocked(Element.prototype.getBoundingClientRect).getMockImplementation()!
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const box = boxOf.call(this)
    return this.closest('.sc-lockup, .actions')
      ? new DOMRect(box.x, box.y + roomOf(home), box.width, box.height)
      : box
  })
}

/**
 * Reads the room the view last set above the lockup, in pixels, or 0 before it
 * sets any.
 */
function roomOf(home: HTMLElement): number {
  return Number(home.style.getPropertyValue('--sc-hero-top').replace(/px$/u, ''))
}

describe('View.build as its room moves the lockup', () => {
  it('measures the lockup again once the room it sets has moved it', () => {
    const home = standIn()
    lowerLockup(home)
    const view = new View()
    view.build(home, document.createElement('canvas'))
    expect(roomOf(home)).toBeGreaterThan(0)
    expect(view.scene.measure!.parts[0]!.y).toBeCloseTo(157 - 64 + roomOf(home), 6)
  })
})

describe('View.build', () => {
  it("sets the hero's room above and beneath the lockup to what the oval needs", () => {
    const { home } = built()
    expect(home.style.getPropertyValue('--sc-hero-top')).toMatch(/^\d+\.\d\dpx$/u)
    expect(home.style.getPropertyValue('--sc-hero-bottom')).toMatch(/^\d+\.\d\dpx$/u)
  })

  it('sizes the canvas to the viewport on whole device pixels, rounding each side to the nearest', () => {
    vi.stubGlobal('devicePixelRatio', 1.1)
    const { canvas }               = built()
    const { height, style, width } = canvas
    expect([window.innerHeight, width, height, style.width, style.height])
      .toEqual([768, 1584, 845, '1440px', '768px'])
  })

  it("scales the canvas's context by the screen's pixel ratio", () => {
    vi.stubGlobal('devicePixelRatio', 1.1)
    const drawn = context()
    built(drawn)
    expect(drawn.setTransform).toHaveBeenLastCalledWith(1.1, 0, 0, 1.1, 0, 0)
  })

  it('lays the pieces out on its first build and not again while nothing the layout reads changes', () => {
    const { canvas, home, view } = built()
    expect(view.scene.motes.length).toBeGreaterThan(0)
    expect(view.build(home, canvas)).toBe(false)
  })

  it.each(['.sc-wordmark svg', '.sc-tagline'])('lays nothing out on a page holding no %s', part => {
    const home = standIn()
    home.querySelector(part)!.remove()
    expect(new View().build(home, document.createElement('canvas'))).toBe(false)
  })

  it("reads the page's top from under the bar, so each piece is drawn where the page scrolls it", () => {
    const { view } = built()
    expect(view.origin).toBe(64)
    expect(view.scene.shift).toBe(-64)
  })
})

describe("View.build without the page's chrome", () => {
  it("reads the page's top from the hero's own top where the page shows no bar", () => {
    const home = standIn()
    document.querySelector('.VPNavBar')!.remove()
    const view = new View()
    view.build(home, document.createElement('canvas'))
    expect(view.origin).toBe(0)
  })

  it("fades the loose pieces a little above the page's end where the page shows no footer", () => {
    const home = standIn()
    document.querySelector('.VPFooter')!.remove()
    const view = new View()
    view.build(home, document.createElement('canvas'))
    expect(view.scene.measure!.F).toBe(view.scene.measure!.P - 40)
  })
})

describe('View.repaint', () => {
  it("paints every drawing the plan needs at the screen's density", async () => {
    vi.stubGlobal('devicePixelRatio', 2)
    const drawn          = context()
    const { home, view } = built(drawn)
    expect(await view.repaint(home, false)).toBe(true)
    const bitmaps = [...view.drawings!.bitmaps.values()] as HTMLCanvasElement[]
    const [size]  = view.drawings!.sizes
    expect(view.drawings!.bitmaps.size).toBe(painter.needed(view.scene.plan!).length)
    expect(view.drawings!.width).toBe(1440)
    expect(new Set(bitmaps.flatMap(bitmap => [bitmap.width, bitmap.height])))
      .toEqual(new Set(view.drawings!.sizes.map(each => Math.ceil(each * 2))))
    expect(drawn.scale).toHaveBeenCalledWith(2, 2)
    expect(drawn.drawImage).toHaveBeenCalledWith(expect.any(HTMLImageElement), 0, 0, size, size)
  })

  it('crops each piece it decodes to the part of its square it stands in', async () => {
    const { home, view } = built()
    await view.repaint(home, true)
    const sources = decoded()
    const crop    = `viewBox="${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}"`
    expect(sources).toHaveLength(painter.needed(view.scene.plan!).length)
    expect(sources.filter(source => !source.includes(crop))).toEqual([])
  })

  it('drops a pass a newer one overtakes', async () => {
    const { home, view } = built()
    const first          = view.repaint(home, false)
    const second         = view.repaint(home, false)
    expect([await first, await second]).toEqual([false, true])
  })

  it('paints nothing before the pieces are laid out', async () => {
    expect(await new View().repaint(standIn(), false)).toBe(false)
  })
})

describe('View.repaint, its colors', () => {
  it("paints in the page's own colors, the stored game in its dark coloring on a dark page", async () => {
    const { home, view } = built()
    home.style.setProperty('--sc-quiet', 'rgb(4, 5, 6)')
    home.style.setProperty('--sc-run', 'rgb(1, 2, 3)')
    await view.repaint(home, true)
    expect(view.drawings!.run).toBe('rgb(1, 2, 3)')
    expect(decoded().join('')).toContain('rgb(4, 5, 6)')
  })

  it('leaves nothing in the page from reading its colors', async () => {
    const { home, view } = built()
    await view.repaint(home, false)
    expect(home.querySelector('i')).toBeNull()
  })
})

describe('View.draw', () => {
  it('paints a frame inside the band below the bar while the page sits at its top', async () => {
    const drawn                  = context()
    const { canvas, home, view } = built(drawn)
    await view.repaint(home, false)
    view.render(canvas)
    expect(drawn.rect).toHaveBeenCalledWith(0, 64, 1440, window.innerHeight - 64)
    expect(drawn.drawImage).toHaveBeenCalled()
  })

  it("paints from the viewport's top once the page scrolls past the bar", async () => {
    const drawn                  = context()
    const { canvas, home, view } = built(drawn)
    await view.repaint(home, false)
    vi.stubGlobal('scrollY', 100)
    view.render(canvas)
    expect(drawn.rect).toHaveBeenLastCalledWith(0, 0, 1440, window.innerHeight)
  })

  it('paints in the band a resize of the height alone leaves, laying nothing out again', async () => {
    const drawn                  = context()
    const { canvas, home, view } = built(drawn)
    await view.repaint(home, false)
    vi.stubGlobal('innerHeight', 600)
    expect(view.build(home, canvas)).toBe(false)
    view.render(canvas)
    expect(drawn.rect).toHaveBeenLastCalledWith(0, 64, 1440, 536)
  })

  it('paints nothing before the drawings are painted', () => {
    const drawn            = context()
    const { canvas, view } = built(drawn)
    view.render(canvas)
    expect(drawn.clearRect).not.toHaveBeenCalled()
  })

  it('draws nothing before the pieces are laid out', () => {
    const drawn = context()
    standIn(drawn)
    new View().render(document.createElement('canvas'))
    expect(drawn.clearRect).not.toHaveBeenCalled()
  })
})

describe('View.point', () => {
  it.each([
    ['the backdrop', 'body', 300, [200, 300]],
    ['a card', '.sc-card p', 300, null],
    ['the backdrop above the viewport', 'body', -1, null],
    ['the top row of the viewport', 'body', 0, [200, 0]],
    ['the bottom row of the viewport', 'body', 768, [200, 768]],
    ['the backdrop below the viewport', 'body', 769, null]
  ] as const)(
    'stirs the pieces from a pointer over %s only away from content',
    (_, over, clientY, point) => {
      const { view } = built()
      const event    = new PointerEvent('pointermove', { clientX: 200, clientY })
      Object.defineProperty(event, 'target', { value: document.querySelector(over) })
      view.point('move', event)
      expect(view.scene.pointer).toEqual(point)
    }
  )
})

describe('View.clear', () => {
  it("removes the room build sets, leaving the hero its stylesheet's", () => {
    const { home, view } = built()
    view.clear(home)
    expect(home.style.getPropertyValue('--sc-hero-top')).toBe('')
    expect(home.style.getPropertyValue('--sc-hero-bottom')).toBe('')
  })
})
