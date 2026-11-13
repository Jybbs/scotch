// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import * as tags      from '../../../../lib/data/tags.ts'
import { DatedBands } from '../../../../theme/components/data/dated.ts'
import { pressed }    from '../../../common/keys.ts'
import { unsized }    from '../../../common/size.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

const decades = tags.TAGS.decades
const layout  = tags.datedLayout(600)

describe('DatedBands', () => {
  it('draws nothing until the chart has a width', () => {
    unsized()
    expect(mount(DatedBands).find('svg').exists()).toBe(false)
  })

  it('opens on the 1990s, drawing three tiers per decade in each band', () => {
    const drawn = mount(DatedBands)
    expect(drawn.find('.sc-data-big').text()).toBe('1990s')
    expect(drawn.findAll('.sc-data-dated-cell')).toHaveLength(decades.length * 6)
  })

  it('follows the pointer and the arrow keys across the decades, answering no other key', async () => {
    const drawn  = mount(DatedBands)
    const slider = drawn.find('[role="slider"]')
    const clientX = layout.left + 0.5 * layout.cell
    slider.element.dispatchEvent(new PointerEvent('pointermove', { clientX }))
    await drawn.vm.$nextTick()
    expect(drawn.find('.sc-data-say').text()).toBe(tags.datedSentence(decades[0]!))
    expect(await pressed(slider.element, 'ArrowRight')).toBe(true)
    expect(slider.attributes('aria-valuenow')).toBe('1')
    expect(await pressed(slider.element, 'ArrowUp')).toBe(false)
  })

  it('dims every tier but the one a corner mark lights', async () => {
    const drawn = mount(DatedBands)
    await drawn.findAll('.sc-data-mark')[1]!.trigger('pointerenter')
    expect(drawn.find('[data-k="part"]').classes()).not.toContain('sc-data-off')
    expect(drawn.find('[data-k="full"]').classes()).toContain('sc-data-off')
  })
})
