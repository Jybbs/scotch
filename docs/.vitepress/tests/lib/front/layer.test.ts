// @vitest-environment happy-dom
import { flushPromises, mount }               from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef }       from 'vue'

import { LAYER_TUNING, MarkLayer, useMarkLayer } from '../../../lib/front/layer.ts'
import { type Mosaic, mosaicOf }                 from '../../../lib/front/mosaic.ts'
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

beforeEach(() => {
  vi.stubGlobal('Path2D', vi.fn<() => void>())
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context() as never)
  made.sprites = 0
  vi.spyOn(HTMLImageElement.prototype, 'decode').mockResolvedValue()
  raf.pause.mockClear()
  raf.resume.mockClear()
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

describe('useMarkLayer', () => {
  it('starts its frames once the pieces decode', async () => {
    await mounted()
    expect(raf.resume).toHaveBeenCalled()
  })

  it("fades the hero's board as the page scrolls past it", async () => {
    const { home } = await mounted()
    loop.frame!({ delta: 16, timestamp: 16 })
    const fade = 1 - 500 / (1000 * LAYER_TUNING.fade)
    expect(Number(home.style.getPropertyValue('--sc-ground'))).toBeCloseTo(fade)
  })

  it('stops its frames once every piece stands where the scroll sets it', async () => {
    reduceMotion()
    const { drawn } = await mounted()
    loop.frame!({ delta: 16, timestamp: 16 })
    expect(drawn.drawImage).toHaveBeenCalled()
    expect(raf.pause).toHaveBeenCalled()
  })

  it('keeps its frames running while a piece is still on its course', async () => {
    await mounted()
    loop.frame!({ delta: 16, timestamp: 16 })
    expect(raf.pause).not.toHaveBeenCalled()
  })
})
