// @vitest-environment happy-dom
import { flushPromises, mount }                 from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h }                   from 'vue'

import * as rails           from '../../../../lib/overview/rails.ts'
import { OVERVIEW_WIDGETS } from '../../../../theme/components/overview/index.ts'
import { Rails }            from '../../../../theme/components/overview/rails.ts'
import { reduceMotion }     from '../../../common/motion.ts'

/**
 * Sends a pointer event to the rails' drawing at a share of the way across it,
 * the drawing set 600 pixels wide from the left of the page.
 */
async function point(wrapper: ReturnType<typeof mount>, type: string, share: number): Promise<void> {
  const drawing = wrapper.find('svg[role=img]').element
  vi.spyOn(drawing, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 600 } as DOMRect)
  drawing.dispatchEvent(new PointerEvent(type, { clientX: share * 600 }))
  await wrapper.vm.$nextTick()
}

const animate = vi.fn<Element['animate']>()

beforeEach(() => {
  animate.mockReset()
  animate.mockReturnValue({ playState: 'finished' } as Animation)
  vi.spyOn(Element.prototype, 'animate').mockImplementation(animate)
})

describe('OVERVIEW_WIDGETS', () => {
  it('loads the rails with the page placing them', async () => {
    const widget = mount(defineComponent({ setup: () => () => h(OVERVIEW_WIDGETS.rails!) }))
    await vi.dynamicImportSettled()
    await flushPromises()
    expect(widget.find('figure').exists()).toBe(true)
  })
})

describe('Rails', () => {
  it('draws a square for each position and the key at rest', () => {
    const wrapper = mount(Rails)
    expect(wrapper.findAll('rect[data-game]')).toHaveLength(rails.squaresOf(rails.example).length)
    expect(wrapper.find('svg[role=img] > rect:first-child').attributes('data-on')).toBeUndefined()
    expect(wrapper.find('p[aria-live]').text())
      .toBe('positions shared36Yours22. c6Kasparov vs. Sosonko22. Bc2')
  })

  it('shades the shared squares as a board does, light and dark by turns', () => {
    const tones = mount(Rails).findAll('rect[data-game=both]').map(square => square.attributes('data-tone'))
    expect(tones.slice(0, 2)).toEqual(['dark', 'light'])
  })

  it('reads the position under the pointer into the key, the start mark at the first', async () => {
    const wrapper = mount(Rails)
    const band    = (): ReturnType<typeof wrapper.find> => wrapper.find('svg[role=img] > rect:first-child')
    await point(wrapper, 'pointermove', 0)
    expect(wrapper.find('p[aria-live] .sc-start').exists()).toBe(true)
    expect(wrapper.find('rect[data-lit]').attributes('data-game')).toBe('submitted')
    expect(band().attributes('data-on')).toBe('')
    await point(wrapper, 'pointerdown', 0.5)
    expect(wrapper.find('p[aria-live]').text()).toContain('Position 24 of 36')
    const at = rails.cursorAt(rails.example, 0.5)
    expect(band().attributes('x')).toBe(String(rails.bandOf(rails.example, at)))
    await wrapper.find('svg[role=img]').trigger('pointerleave')
    expect(wrapper.find('p[aria-live]').text()).toContain('positions shared')
    expect(wrapper.find('rect[data-lit]').exists()).toBe(false)
    expect(band().attributes('data-on')).toBeUndefined()
  })
})

describe('Rails’ replay', () => {
  it('replays the run and the parting as the pointer enters, still under reduced motion', async () => {
    await mount(Rails).find('svg[role=img]').trigger('pointerenter')
    expect(animate).toHaveBeenCalledTimes(rails.squaresOf(rails.example).length + 1)
    animate.mockClear()
    reduceMotion()
    await mount(Rails).find('svg[role=img]').trigger('pointerenter')
    expect(animate).not.toHaveBeenCalled()
  })

  it('fades the parting line in after the run, still under reduced motion', async () => {
    const { delay, duration, keys } = rails.cutReplayOf(rails.example)
    const wrapper                   = mount(Rails)
    const cut                       = wrapper.find('line').element
    await wrapper.find('svg[role=img]').trigger('pointerenter')
    const at = animate.mock.contexts.indexOf(cut)
    expect(animate.mock.calls[at]).toEqual([keys, { delay, duration, fill: 'backwards' }])
    animate.mockClear()
    reduceMotion()
    const still = mount(Rails)
    await still.find('svg[role=img]').trigger('pointerenter')
    expect(animate.mock.contexts).not.toContain(still.find('line').element)
  })

  it('leaves a replay still running to finish as the pointer enters again', async () => {
    const drawing = mount(Rails).find('svg[role=img]')
    animate.mockReturnValue({ playState: 'running' } as Animation)
    await drawing.trigger('pointerenter')
    await drawing.trigger('pointerenter')
    expect(animate).toHaveBeenCalledTimes(rails.squaresOf(rails.example).length + 1)
  })
})
