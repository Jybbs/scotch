// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import * as numbers      from '../../../../lib/data/numbers.ts'
import * as parting      from '../../../../lib/data/parting.ts'
import { SharedParting } from '../../../../theme/components/data/parting.ts'
import { pressed }       from '../../../common/keys.ts'
import { unsized }       from '../../../common/size.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

const every  = parting.SHARED.every
const layout = parting.partingLayout(600)

describe('SharedParting', () => {
  it('draws nothing until the chart has a width', () => {
    unsized()
    expect(mount(SharedParting).find('svg').exists()).toBe(false)
  })

  it('opens on move 10, lighting its bar and naming its shares', () => {
    const drawn = mount(SharedParting)
    expect(drawn.find('.sc-data-big').text()).toBe(numbers.percent(parting.sharingAt(every, 10)))
    expect(drawn.find('.sc-data-say').text()).toBe(parting.partingSentence(10))
    expect(drawn.findAll('.sc-data-parting-bar').findIndex(bar => bar.classes('sc-data-on'))).toBe(10)
    expect(drawn.find('.sc-data-parting-tag').attributes('text-anchor')).toBe('start')
  })

  it('follows the pointer to the move nearest it, turning the tag to the left past move 30', async () => {
    const drawn  = mount(SharedParting)
    const slider = drawn.find('[role="slider"]')
    slider.element.dispatchEvent(new PointerEvent('pointermove', { clientX: parting.moveOn(layout, 35) }))
    await drawn.vm.$nextTick()
    expect(slider.attributes('aria-valuenow')).toBe('35')
    expect(drawn.find('.sc-data-parting-tag').attributes('text-anchor')).toBe('end')
  })

  it('steps along the moves on an arrow key and answers no other key', async () => {
    const drawn  = mount(SharedParting)
    const slider = drawn.find('[role="slider"]')
    expect(await pressed(slider.element, 'ArrowRight')).toBe(true)
    expect(slider.attributes('aria-valuenow')).toBe('11')
    expect(await pressed(slider.element, 'End')).toBe(true)
    expect(slider.attributes('aria-valuenow')).toBe(String(parting.LAST_MOVE))
    expect(await pressed(slider.element, 'Tab')).toBe(false)
  })

  it('dims every part but the one a corner mark lights', async () => {
    const drawn = mount(SharedParting)
    await drawn.findAll('.sc-data-mark')[1]!.trigger('pointerenter')
    expect(drawn.find('.sc-data-parting-line').classes()).toContain('sc-data-off')
    expect(drawn.find('.sc-data-parting-half').classes()).toContain('sc-data-off')
    expect(drawn.find('.sc-data-parting-bar').classes()).not.toContain('sc-data-off')
  })
})
