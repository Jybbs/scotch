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
  const drawing = wrapper.find('svg.sc-rails-drawing').element
  vi.spyOn(drawing, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 600 } as DOMRect)
  drawing.dispatchEvent(new PointerEvent(type, { clientX: share * 600 }))
  await wrapper.vm.$nextTick()
}

const animate = vi.fn<Element['animate']>()

beforeEach(() => {
  animate.mockReset()
  vi.spyOn(Element.prototype, 'animate').mockImplementation(animate)
})

describe('OVERVIEW_WIDGETS', () => {
  it('loads the rails with the page placing them', async () => {
    const widget = mount(defineComponent({ setup: () => () => h(OVERVIEW_WIDGETS.rails!) }))
    await vi.dynamicImportSettled()
    await flushPromises()
    expect(widget.find('.sc-rails').exists()).toBe(true)
  })
})

describe('Rails', () => {
  it('draws a square for each position and the key at rest', () => {
    const wrapper = mount(Rails)
    expect(wrapper.findAll('rect')).toHaveLength(rails.squaresOf(rails.example).length)
    expect(wrapper.find('.sc-rails-key').text())
      .toBe('positions shared36Yours22. c6Kasparov vs. Sosonko22. Bc2')
  })

  it('shades the shared squares as a board does, light and dark by turns', () => {
    const tones = mount(Rails).findAll('rect[data-game=both]').map(square => square.attributes('data-tone'))
    expect(tones.slice(0, 2)).toEqual(['dark', 'light'])
  })

  it('replays the run and the parting as the pointer enters, still under reduced motion', async () => {
    await mount(Rails).find('svg.sc-rails-drawing').trigger('pointerenter')
    expect(animate).toHaveBeenCalledTimes(rails.squaresOf(rails.example).length)
    animate.mockClear()
    reduceMotion()
    await mount(Rails).find('svg.sc-rails-drawing').trigger('pointerenter')
    expect(animate).not.toHaveBeenCalled()
  })

  it('reads the position under the pointer into the key, the start mark at the first', async () => {
    const wrapper = mount(Rails)
    await point(wrapper, 'pointermove', 0)
    expect(wrapper.find('.sc-rails-key .sc-start').exists()).toBe(true)
    expect(wrapper.find('rect.is-lit').attributes('data-game')).toBe('submitted')
    await point(wrapper, 'pointerdown', 0.5)
    expect(wrapper.find('.sc-rails-key').text()).toContain('Position 24 of 36')
    await wrapper.find('svg.sc-rails-drawing').trigger('pointerleave')
    expect(wrapper.find('.sc-rails-key').text()).toContain('positions shared')
    expect(wrapper.find('rect.is-lit').exists()).toBe(false)
  })
})
