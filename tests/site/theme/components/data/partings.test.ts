// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import * as parting       from '../../../../../docs/.vitepress/lib/data/parting.ts'
import { SharedPartings } from '../../../../../docs/.vitepress/theme/components/data/partings.ts'
import { pressed }        from '../../../common/keys.ts'
import { unsized }        from '../../../common/size.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

const decades = parting.SHARED.decades
const layout  = parting.partingsLayout(600)

describe('SharedPartings', () => {
  it('draws nothing until the chart has a width', () => {
    unsized()
    expect(mount(SharedPartings).find('svg').exists()).toBe(false)
  })

  it('opens on the latest decade at move 10, naming it in bold', () => {
    const drawn = mount(SharedPartings)
    expect(drawn.find('p').text()).toBe(parting.partingsSentence(10, decades.at(-1)!))
    expect(drawn.find('text[data-on]').text()).toBe(decades.at(-1)!.name)
    expect(drawn.findAll('rect[style]')).toHaveLength(decades.length * (parting.LAST_MOVE + 1))
  })

  it('picks the decade and the move under the pointer', async () => {
    const drawn  = mount(SharedPartings)
    const slider = drawn.find('[role="slider"]')
    slider.element.dispatchEvent(new PointerEvent('pointermove', {
      clientX : parting.columnOn(layout, 20),
      clientY : layout.row / 2
    }))
    await drawn.vm.$nextTick()
    expect(slider.attributes('aria-valuenow')).toBe('20')
    expect(drawn.find('text[data-on]').text()).toBe(decades[0]!.name)
  })

  it('steps between the decades and along the moves on the arrow keys, answering no other key', async () => {
    const drawn  = mount(SharedPartings)
    const slider = drawn.find('[role="slider"]')
    expect(await pressed(slider.element, 'ArrowUp')).toBe(true)
    expect(await pressed(slider.element, 'ArrowLeft')).toBe(true)
    expect(slider.attributes('aria-valuenow')).toBe('9')
    expect(drawn.find('text[data-on]').text()).toBe(decades.at(-2)!.name)
    expect(await pressed(slider.element, 'Tab')).toBe(false)
  })

  it('dims every part but the one a corner mark lights', async () => {
    const drawn = mount(SharedPartings)
    await drawn.findAll('[role=listitem]')[2]!.trigger('pointerenter')
    expect(drawn.find('path[data-k=decade]').attributes('data-off')).toBeUndefined()
    expect(drawn.find('path[data-k=every]').attributes('data-off')).toBe('')
    expect(drawn.find('rect[style]').attributes('data-off')).toBe('')
  })
})
