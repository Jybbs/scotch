// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Painted }   from '../../../../lib/viewer/drive.ts'
import * as track         from '../../../../lib/viewer/track.ts'
import { Track }          from '../../../../theme/components/viewer/track.ts'
import { test }           from '../../../common/clock.ts'
import { prevented }      from '../../../common/keys.ts'
import { loaded, meet }   from '../../../common/matches.ts'
import { observeResizes } from '../../../common/observer.ts'
import { context }        from '../../../common/page.ts'

/**
 * Mounts the track at the first position the two share, drawing into `drawn`.
 */
function mounted(drawn = context()): {
  painted : Painted
  resize  : (width?: number) => void
  slider  : HTMLElement
  wrapper : ReturnType<typeof mount<typeof Track>>
} {
  const { resize } = observeResizes()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(drawn as never)
  const wrapper = mount(Track, {
    attachTo : document.body,
    props    : { cursor: meet, facing: 'white', loaded, status: loaded.status(meet) }
  })
  const slider = wrapper.find('[role="slider"]').element as HTMLElement
  return { painted: wrapper.vm as unknown as Painted, resize, slider, wrapper }
}

/**
 * Sends a pointer event to the track at `x` pixels from its left edge.
 */
function pointer(slider: HTMLElement, type: string, x: number, button = 0): void {
  slider.dispatchEvent(new PointerEvent(type, { bubbles: true, button, clientX: x, pointerId: 1 }))
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 600, 140))
  vi.spyOn(Element.prototype, 'scrollTo').mockImplementation(() => {})
  vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => {})
})

afterEach(() => {
  document.body.replaceChildren()
})

describe('Track as drawn', () => {
  it('reads as a slider over the cursor’s range, its value the status line', () => {
    const { slider } = mounted()
    expect(['min', 'max', 'now', 'text'].map(name => slider.getAttribute(`aria-value${name}`)))
      .toEqual([String(loaded.first), String(loaded.last), String(meet), loaded.status(meet).line])
  })

  it('names each game’s row by a swatch standing at the row’s middle', () => {
    const { wrapper } = mounted()
    expect(wrapper.findAll('.sc-viewer-track-swatches span')
      .map(swatch => (swatch.element as HTMLElement).style.getPropertyValue('--sc-viewer-middle')))
      .toEqual(['40px', '102px'])
  })

  it('sizes its canvas to a column for every ply and stands the head at the cursor’s column', () => {
    const { wrapper } = mounted()
    expect((wrapper.find('canvas').element as HTMLElement).style.width).toBe(`${track.trackWidth(loaded)}px`)
    expect((wrapper.find('.sc-viewer-track-head').element as HTMLElement).style.transform)
      .toBe(`translate(${meet * track.TRACK.column}px, 0px)`)
  })
})

describe('Track once loaded', () => {
  it('draws nothing until its box is measured, then draws every glyph and scrolls the head into view', () => {
    const drawn                        = context()
    const { painted, resize, wrapper } = mounted(drawn)
    painted.load()
    painted.paint(meet, false)
    expect(drawn.clearRect).not.toHaveBeenCalled()
    resize(600)
    resize(600)
    expect(drawn.clearRect).toHaveBeenCalledTimes(1)
    expect([(wrapper.find('canvas').element as HTMLCanvasElement).width]).toEqual([track.trackWidth(loaded)])
    expect(Element.prototype.scrollTo)
      .toHaveBeenLastCalledWith({ behavior: 'auto', left: meet * track.TRACK.column + 25 - 200 })
  })

  it('glides the head to a cursor a step reaches, scrolling only where the track moves', () => {
    const { painted, resize, wrapper } = mounted()
    painted.load()
    resize(600)
    painted.paint(meet + 1, true)
    painted.paint(meet + 1, true)
    expect(Element.prototype.scrollTo).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.sc-viewer-track-head').classes()).toContain('sc-viewer-gliding')
  })
})

describe('Track answering the keys and the pointer', () => {
  it.each([
    ['ArrowUp', meet + 1],
    ['ArrowDown', meet - 1],
    ['PageUp', meet + 10],
    ['PageDown', meet - 10]
  ])('moves the cursor as the slider pattern sets on %s', (key, to) => {
    const { painted, slider, wrapper } = mounted()
    painted.load()
    painted.paint(meet, false)
    expect(prevented(slider, key)).toBe(true)
    expect(wrapper.emitted('go')).toEqual([[to]])
  })

  it('leaves every other key to the Viewer', () => {
    const { painted, slider, wrapper } = mounted()
    painted.load()
    expect(prevented(slider, 'ArrowRight')).toBe(false)
    expect(wrapper.emitted('go')).toBeUndefined()
  })

  it('moves the cursor to the ply under a press and under a drag, until the button lifts', () => {
    const { painted, slider, wrapper } = mounted()
    painted.load()
    pointer(slider, 'pointerdown', 3 * track.TRACK.column + 1)
    pointer(slider, 'pointermove', 5 * track.TRACK.column + 1)
    pointer(slider, 'pointerup', 5 * track.TRACK.column + 1)
    pointer(slider, 'pointermove', 9 * track.TRACK.column + 1)
    pointer(slider, 'pointerdown', 9 * track.TRACK.column + 1, 2)
    expect(wrapper.emitted('go')).toEqual([[3], [5]])
  })

  it('stops following a drag once the pointer is released elsewhere', () => {
    const { painted, slider, wrapper } = mounted()
    painted.load()
    pointer(slider, 'pointerdown', 0)
    slider.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 }))
    pointer(slider, 'pointermove', 4 * track.TRACK.column)
    expect(wrapper.emitted('go')).toEqual([[0]])
  })

  it('answers no pointer before a match loads', () => {
    const { slider, wrapper } = mounted()
    pointer(slider, 'pointerdown', 0)
    expect(wrapper.emitted('go')).toBeUndefined()
  })
})

describe('Track redrawing and leaving', () => {
  test('draws again from Black’s side once the boards turn', async ({ clock }) => {
    const drawn                        = context()
    const { painted, resize, wrapper } = mounted(drawn)
    painted.load()
    resize(600)
    await wrapper.setProps({ facing: 'black' })
    clock.advanceTimersByTime(20)
    expect(drawn.clearRect).toHaveBeenCalledTimes(2)
  })

  it('draws nothing where the canvas gives no context', () => {
    const { painted, resize } = mounted(null as never)
    painted.load()
    expect(() => {
      resize(600)
    }).not.toThrow()
  })

  it('stops measuring and answering once it leaves the page', () => {
    const observer = observeResizes()
    const props    = { cursor: 0, facing: 'white', loaded, status: loaded.status(0) } as const
    const wrapper  = mount(Track, { attachTo: document.body, props })
    const slider   = wrapper.find('[role="slider"]').element as HTMLElement
    const painted  = wrapper.vm as unknown as Painted
    painted.load()
    wrapper.unmount()
    pointer(slider, 'pointerdown', 0)
    expect([observer.observed(), wrapper.emitted('go')]).toEqual([0, undefined])
  })
})
