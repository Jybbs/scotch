// @vitest-environment happy-dom
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { nextTick }                                from 'vue'

import { Scene }            from '../../../../lib/front/scene.ts'
import { View }             from '../../../../lib/front/view.ts'
import { Backdrop }         from '../../../../theme/components/front/backdrop.ts'
import { test }             from '../../../common/clock.ts'
import { reduceMotion }     from '../../../common/motion.ts'
import { context, standIn } from '../../../common/page.ts'

/**
 * Mounts the backdrop inside the stand-in front page and lets its first layout
 * and painting finish.
 */
async function mounted(drawn = context()): Promise<{ home: HTMLElement, wrapper: ReturnType<typeof mount> }> {
  const home = standIn(drawn)
  const host = document.createElement('div')
  home.prepend(host)
  const wrapper = mount(Backdrop, { attachTo: host })
  await flushPromises()
  await flushPromises()
  return { home, wrapper }
}

/**
 * Builds a stand-in for `IntersectionObserver` that reports every element it
 * observes as on screen or off it at once.
 */
function observing(isIntersecting: boolean): typeof IntersectionObserver {
  return class {
    readonly callback: IntersectionObserverCallback
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
    }
    disconnect(): void {}
    observe(target: Element): void {
      const entry = { isIntersecting, target, time: 0 } as unknown as IntersectionObserverEntry
      this.callback([entry], this as never)
    }
    unobserve(): void {}
  } as unknown as typeof IntersectionObserver
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', observing(true))
  vi.stubGlobal('requestAnimationFrame', (run: FrameRequestCallback) =>
    setTimeout(() => run(performance.now()), 16) as unknown as number)
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => clearTimeout(handle))
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('Backdrop as it mounts', () => {
  it('draws on a canvas a screen reader passes over', async () => {
    const { wrapper } = await mounted()
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('canvas').exists()).toBe(true)
  })

  it('lays the oval out around the lockup once mounted', async () => {
    const { home } = await mounted()
    expect(home.style.getPropertyValue('--sc-hero-top')).not.toBe('')
  })

  it('lays the oval out only once the faces have loaded', async () => {
    const faces = Promise.withResolvers<void>()
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: faces.promise } })
    onTestFinished(() => {
      Reflect.deleteProperty(document, 'fonts')
    })
    const build = vi.spyOn(View.prototype, 'build')
    await mounted()
    expect(build).not.toHaveBeenCalled()
    faces.resolve()
    await flushPromises()
    expect(build).toHaveBeenCalledOnce()
  })

  it('paints its drawings in the dark scheme where the page opens dark', async () => {
    document.documentElement.classList.add('dark')
    const repaint = vi.spyOn(View.prototype, 'repaint')
    await mounted()
    expect(repaint).toHaveBeenCalled()
    expect(repaint.mock.calls.map(([, dark]) => dark)).toAllEqual(true)
  })
})

describe('Backdrop while it runs', () => {
  test('draws frame after frame while the page is on screen', async ({ clock }) => {
    const drawn = context()
    await mounted(drawn)
    clock.advanceTimersByTime(60)
    expect(vi.mocked(drawn.clearRect).mock.calls.length).toBeGreaterThan(1)
  })

  test('draws no frame while its tab is hidden', async ({ clock }) => {
    const drawn = context()
    await mounted(drawn)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    vi.mocked(drawn.clearRect).mockClear()
    clock.advanceTimersByTime(60)
    expect(drawn.clearRect).not.toHaveBeenCalled()
  })

  test('draws no frame while the page is off screen', async ({ clock }) => {
    vi.stubGlobal('IntersectionObserver', observing(false))
    const drawn = context()
    await mounted(drawn)
    vi.mocked(drawn.clearRect).mockClear()
    clock.advanceTimersByTime(60)
    expect(drawn.clearRect).not.toHaveBeenCalled()
  })

  it('leaves the drawing to its frame loop while it runs', async () => {
    await mounted()
    const render = vi.spyOn(View.prototype, 'render')
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 20, clientY: 30 }))
    expect(render).not.toHaveBeenCalled()
  })
})

describe('Backdrop held still', () => {
  test('holds every piece still and draws once for a reader preferring reduced motion', async ({ clock }) => {
    reduceMotion()
    const drawn  = context()
    const render = vi.spyOn(View.prototype, 'render')
    await mounted(drawn)
    expect(render).toHaveBeenCalled()
    expect((render.mock.contexts.at(-1) as View).scene.held).toBe(true)
    vi.mocked(drawn.clearRect).mockClear()
    clock.advanceTimersByTime(60)
    expect(drawn.clearRect).not.toHaveBeenCalled()
  })

  it('draws the held pieces again where the page has scrolled them', async () => {
    reduceMotion()
    const drawn = context()
    await mounted(drawn)
    const [, , top] = vi.mocked(drawn.drawImage).mock.calls.at(-1)!
    vi.mocked(drawn.clearRect).mockClear()
    vi.stubGlobal('scrollY', 100)
    window.dispatchEvent(new Event('scroll'))
    expect(drawn.clearRect).toHaveBeenCalledOnce()
    expect(vi.mocked(drawn.drawImage).mock.calls.at(-1)![2]).toBeCloseTo(top - 100, 9)
  })

  test('lets the held oval go once the reader stops preferring reduced motion', async ({ clock }) => {
    const lift = reduceMotion()
    await mounted()
    const step = vi.spyOn(Scene.prototype, 'step')
    // happy-dom reports a media query's change against the last state it reported, which opens on no match.
    window.dispatchEvent(new Event('resize'))
    lift()
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    clock.advanceTimersByTime(60)
    expect((step.mock.contexts.at(-1) as Scene).held).toBe(false)
  })

  it('draws the held pieces again on each pointer event', async () => {
    reduceMotion()
    const drawn = context()
    await mounted(drawn)
    vi.mocked(drawn.clearRect).mockClear()
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 20, clientY: 30 }))
    window.dispatchEvent(new PointerEvent('pointerdown', { clientX: 20, clientY: 30 }))
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 20, clientY: 30 }))
    document.documentElement.dispatchEvent(new PointerEvent('pointerleave'))
    expect(drawn.clearRect).toHaveBeenCalledTimes(4)
  })
})

describe('Backdrop after a change', () => {
  it('keeps only the newest painting where the page turns dark and back at once', async () => {
    await mounted()
    const repaint = vi.spyOn(View.prototype, 'repaint')
    document.documentElement.classList.add('dark')
    await nextTick()
    document.documentElement.classList.remove('dark')
    await flushPromises()
    await nextTick()
    const kept = await Promise.all(repaint.mock.results.map(result => result.value as Promise<boolean>))
    expect(kept).toEqual([false, true])
  })

  it('paints its drawings again once the page turns dark', async () => {
    const repaint = vi.spyOn(View.prototype, 'repaint')
    await mounted()
    repaint.mockClear()
    document.documentElement.classList.add('dark')
    await flushPromises()
    await nextTick()
    expect(repaint).toHaveBeenCalledExactlyOnceWith(expect.any(HTMLElement), true)
  })
})

describe('Backdrop under a pointer', () => {
  it.each([
    ['pointercancel', 'a release', 'up'],
    ['pointerdown', 'a press', 'down'],
    ['pointerleave', 'a departure from the page', 'leave'],
    ['pointermove', 'a move', 'move'],
    ['pointerup', 'a release', 'up']
  ] as const)('passes a %s to the scene as %s', async (type, _, kind) => {
    await mounted()
    const point = vi.spyOn(View.prototype, 'point')
    document.documentElement.dispatchEvent(new PointerEvent(type, { bubbles: true }))
    expect(point).toHaveBeenCalledExactlyOnceWith(kind, expect.any(PointerEvent))
  })
})

describe('Backdrop after a change of size', () => {
  test('lays the oval out again once the page changes size', async ({ clock }) => {
    const observed: ResizeObserverCallback[] = []
    vi.stubGlobal('ResizeObserver', vi.fn(function (callback: ResizeObserverCallback) {
      observed.push(callback)
      return { disconnect: vi.fn<() => void>(), observe: vi.fn<() => void>(), unobserve: vi.fn<() => void>() }
    }))
    const build = vi.spyOn(View.prototype, 'build')
    await mounted()
    build.mockClear()
    for (const callback of observed) callback([], {} as ResizeObserver)
    clock.advanceTimersByTime(40)
    expect(build).toHaveBeenCalledOnce()
  })

  test('lays the oval out again after the window resizes', async ({ clock }) => {
    const build = vi.spyOn(View.prototype, 'build')
    await mounted()
    build.mockClear()
    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
    clock.advanceTimersByTime(40)
    expect(build).toHaveBeenCalledOnce()
  })

  test('draws what it holds where a resize changes nothing the layout reads', async ({ clock }) => {
    const render = vi.spyOn(View.prototype, 'render')
    await mounted()
    const calls = render.mock.calls.length
    window.dispatchEvent(new Event('resize'))
    clock.advanceTimersByTime(40)
    expect(render.mock.calls.length).toBeGreaterThan(calls)
  })
})

describe('Backdrop as it unmounts', () => {
  it('removes the room it set on the hero once it unmounts', async () => {
    const { home, wrapper } = await mounted()
    wrapper.unmount()
    expect(home.style.getPropertyValue('--sc-hero-top')).toBe('')
    expect(home.style.getPropertyValue('--sc-hero-bottom')).toBe('')
  })

  it('lays nothing out where it mounts outside a front page', async () => {
    standIn()
    const build = vi.spyOn(View.prototype, 'build')
    mount(Backdrop, { attachTo: document.body })
    await flushPromises()
    expect(build).not.toHaveBeenCalled()
  })
})
