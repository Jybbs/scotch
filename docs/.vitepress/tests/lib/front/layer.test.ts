// @vitest-environment happy-dom
import { flushPromises, mount }               from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef }       from 'vue'

import { LAYER_TUNING, MarkLayer, useMarkLayer } from '../../../lib/front/layer.ts'
import { type Mosaic, mosaicOf }                 from '../../../lib/front/mosaic.ts'
import { POUR_TUNING, Pour }                     from '../../../lib/front/pour.ts'
import { type Motion, useMotion }                from '../../../lib/motion/control.ts'
import { context }                               from '../../common/canvas.ts'
import { reduceMotion }                          from '../../common/motion.ts'

/**
 * A canvas beside the stand-in context it draws into.
 */
interface Drawn {
  canvas : HTMLCanvasElement
  drawn  : CanvasRenderingContext2D
}

const made = { sprites: 0 }
const loop = { frame: undefined as ((step: { delta: number, timestamp: number }) => void) | undefined }
const raf  = { pause: vi.fn<() => void>(), resume: vi.fn<() => void>() }

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useRafFn: (frame: typeof loop.frame) => {
    loop.frame = frame
    return raf
  }
}))

/**
 * Builds a canvas the given size, drawing into a stand-in context.
 */
function canvasOf(width: number, height: number): Drawn {
  const canvas = document.createElement('canvas')
  const drawn  = context()
  vi.spyOn(canvas, 'clientWidth', 'get').mockReturnValue(width)
  vi.spyOn(canvas, 'clientHeight', 'get').mockReturnValue(height)
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(function (this: HTMLCanvasElement) {
    if (this === canvas) return drawn as never
    made.sprites++
    return context() as never
  })
  return { canvas, drawn }
}

/**
 * Reads where each piece a context drew stands, past the call that clears the
 * canvas's transform.
 */
function drawnAt(drawn: CanvasRenderingContext2D): [number, number][] {
  const calls = vi.mocked(drawn.setTransform).mock.calls as unknown as number[][]
  return calls.slice(1).map(([, , , , x, y]) => [x!, y!])
}

/**
 * Mounts a layer inside a stand-in front page and returns its canvas, the
 * context it draws into, and the page, once the pieces' drawings decode.
 */
async function mounted(): Promise<Drawn & { home: HTMLElement }> {
  const home = document.createElement('div')
  const hero = document.createElement('div')
  home.className = 'VPHome'
  hero.className = 'VPHero'
  home.append(hero)
  document.body.append(home)
  const { canvas, drawn } = canvasOf(800, 600)
  vi.spyOn(home, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, -500, 800, 2600))
  vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, -500, 800, 1000))
  mount(defineComponent({
    setup: () => {
      const node = shallowRef<HTMLCanvasElement | null>(canvas)
      useMarkLayer(node)
      return () => h('i')
    }
  }), { attachTo: home })
  home.append(canvas)
  await flushPromises()
  return { canvas, drawn, home }
}

/**
 * Mounts a component calling `useMotion` and returns what the call returned.
 */
async function switched(): Promise<Motion> {
  let read: Motion | undefined
  mount(defineComponent({
    setup: () => {
      read = useMotion()
      return () => null
    }
  }))
  await flushPromises()
  return read!
}

beforeEach(() => {
  vi.stubGlobal('Path2D', vi.fn<() => void>())
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context() as never)
  made.sprites = 0
  vi.spyOn(HTMLImageElement.prototype, 'decode').mockResolvedValue()
  raf.pause.mockClear()
  raf.resume.mockClear()
  sessionStorage.clear()
})

describe('MarkLayer', () => {
  const mosaic = mosaicOf()

  it('draws no piece until one pours in', () => {
    const { canvas, drawn } = canvasOf(800, 600)
    new MarkLayer(canvas, {}, mosaic).paint(false, 2)
    expect(drawn.clearRect).toHaveBeenCalledWith(0, 0, 1600, 1200)
    expect(drawn.drawImage).not.toHaveBeenCalled()
  })

  it('draws every poured piece at its cell once the pour completes', () => {
    const { canvas, drawn } = canvasOf(800, 600)
    const layer             = new MarkLayer(canvas, {}, mosaic)
    layer.pour.advance(0, false, 0, 1)
    layer.paint(true, 1)
    expect(drawn.drawImage).toHaveBeenCalledTimes(mosaic.cells.length)
    expect(drawn.globalAlpha).toBe(1)
  })

  it('draws its sprites again only once the size, the ratio, or the scheme changes', () => {
    const { canvas } = canvasOf(800, 600)
    const layer      = new MarkLayer(canvas, {}, mosaic)
    const counts     = [] as number[]
    for (const [dark, ratio] of [[false, 1], [false, 1], [true, 1], [true, 2]] as const) {
      layer.paint(dark, ratio)
      counts.push(made.sprites)
    }
    expect(counts).toEqual([1, 1, 2, 3].map(builds => builds * mosaic.cells.length))
  })

  it('draws nothing into a canvas with no size', () => {
    const { canvas, drawn } = canvasOf(0, 0)
    new MarkLayer(canvas, {}, mosaic as Mosaic).paint(false, 1)
    expect(drawn.clearRect).not.toHaveBeenCalled()
  })
})

describe('MarkLayer on a pour', () => {
  const mosaic = mosaicOf()

  it('draws a piece still on its course away from its cell along the angle it pours in on', () => {
    const at = (moving: boolean, elapsed: number): { away: number, x: number, y: number } => {
      const { canvas, drawn } = canvasOf(800, 600)
      const layer             = new MarkLayer(canvas, {}, mosaic)
      layer.pour.advance(0, moving, 0, 1)
      layer.pour.advance(elapsed, moving, 10_000, 1)
      layer.paint(false, 1)
      const [x, y] = drawnAt(drawn)[0]!
      return { away: layer.pour.placed(0, Math.hypot(800, 600))!.away, x, y }
    }
    const settled = at(false, 0)
    const pouring = at(true, POUR_TUNING.pour / 2)
    expect(pouring.away).toBeGreaterThan(0)
    expect(pouring.x - settled.x).toBeCloseTo(Math.cos(mosaic.cells[0]!.angle) * pouring.away)
    expect(pouring.y - settled.y).toBeCloseTo(Math.sin(mosaic.cells[0]!.angle) * pouring.away)
  })
})

describe('useMarkLayer', () => {
  it('starts its frames once the pieces decode', async () => {
    await mounted()
    expect(raf.resume).toHaveBeenCalled()
  })

  it("fades the hero's board as the page scrolls past it", async () => {
    const { home } = await mounted()
    loop.frame!({ delta: 16, timestamp: 16 })
    const fade = 1 - 500 / (1000 * LAYER_TUNING.fade)
    expect(Number(home.style.getPropertyValue('--sc-front-fade'))).toBeCloseTo(fade)
  })

  it('draws every piece in its cell at once and stops its frames while the drawings hold still', async () => {
    reduceMotion()
    const { drawn } = await mounted()
    loop.frame!({ delta: 16, timestamp: 16 })
    expect(drawn.drawImage).toHaveBeenCalledTimes(mosaicOf().cells.length)
    expect(raf.pause).toHaveBeenCalled()
  })

})

describe('useMarkLayer on the page', () => {
  it('pours the pieces in by how far the scroll stands down the page', async () => {
    const advance = vi.spyOn(Pour.prototype, 'advance')
    await mounted()
    loop.frame!({ delta: 16, timestamp: 16 })
    expect(advance.mock.calls[0]![3]).toBeCloseTo(500 / 2000 / LAYER_TUNING.filled)
  })

  it('pours every piece in on a page no taller than the layer', async () => {
    const advance  = vi.spyOn(Pour.prototype, 'advance')
    const { home } = await mounted()
    vi.spyOn(home, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 600))
    loop.frame!({ delta: 16, timestamp: 16 })
    expect(advance.mock.calls[0]![3]).toBe(1)
  })

  it('stops its frames and draws nothing once the layer leaves the front page', async () => {
    const { canvas, drawn } = await mounted()
    canvas.remove()
    loop.frame!({ delta: 16, timestamp: 16 })
    expect(raf.pause).toHaveBeenCalled()
    expect(drawn.clearRect).not.toHaveBeenCalled()
  })

  it('draws the mark and fades nothing on a page with no hero', async () => {
    const { drawn, home } = await mounted()
    home.querySelector('.VPHero')!.remove()
    home.style.removeProperty('--sc-front-fade')
    loop.frame!({ delta: 16, timestamp: 16 })
    expect(home.style.getPropertyValue('--sc-front-fade')).toBe('')
    expect(drawn.clearRect).toHaveBeenCalled()
  })

})

describe('useMarkLayer on a change', () => {
  it('runs a frame once the page scrolls', async () => {
    await mounted()
    raf.resume.mockClear()
    window.dispatchEvent(new Event('scroll'))
    expect(raf.resume).toHaveBeenCalled()
  })

  it('runs a frame once the motion switch is pressed', async () => {
    await mounted()
    const motion = await switched()
    raf.resume.mockClear()
    motion.toggle()
    await flushPromises()
    expect(raf.resume).toHaveBeenCalled()
  })

  it('keeps its frames running while a piece is still on its course', async () => {
    await mounted()
    loop.frame!({ delta: 16, timestamp: 16 })
    expect(raf.pause).not.toHaveBeenCalled()
  })
})
