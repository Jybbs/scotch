// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import * as crowding    from '../../../../lib/data/crowding.ts'
import { CrowdedLines } from '../../../../theme/components/data/crowding.ts'
import { pressed }      from '../../../common/keys.ts'
import { unsized }      from '../../../common/size.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

const blocks = crowding.blocksOf(crowding.crowdingLayout(600).rows)
const named  = (sans: string): crowding.Block => blocks.find(each => each.line.sans.join(' ') === sans)!

describe('CrowdedLines', () => {
  it('draws nothing until the chart has a width', () => {
    unsized()
    const drawn = mount(CrowdedLines)
    expect(drawn.find('svg').exists()).toBe(false)
  })

  it('opens on 1. e4 c5, lighting its block and the blocks before it and drawing its position', () => {
    const drawn = mount(CrowdedLines)
    expect(drawn.find('.sc-data-say').text()).toBe(crowding.crowdingSentence(named('e4 c5')))
    expect(drawn.find('[data-on="picked"] text').text()).toBe('1...c5')
    expect(drawn.findAll('[data-on="path"]')).toHaveLength(2)
    expect(drawn.findAll('.sc-data-position-piece')).toHaveLength(32)
  })

  it('picks the block under the pointer and keeps the pick over a blank', async () => {
    const drawn  = mount(CrowdedLines)
    const svg    = drawn.find('.sc-data-crowding .sc-data-svg')
    const layout = crowding.crowdingLayout(600)
    svg.element.dispatchEvent(new PointerEvent('pointermove', { clientX: 599, clientY: 2.5 * layout.row }))
    svg.element.dispatchEvent(new PointerEvent('pointermove', { clientX: 1, clientY: 1.5 * layout.row }))
    await drawn.vm.$nextTick()
    expect(drawn.find('.sc-data-say').text()).toBe(crowding.crowdingSentence(named('e4')))
  })

  it('steps through the tree on the arrow keys and answers no other key', async () => {
    const drawn = mount(CrowdedLines)
    const svg   = drawn.find('.sc-data-crowding .sc-data-svg')
    expect(await pressed(svg.element, 'ArrowUp')).toBe(true)
    expect(await pressed(svg.element, 'ArrowUp')).toBe(true)
    expect(drawn.find('.sc-data-say').text()).toBe(crowding.crowdingSentence(blocks[0]!))
    expect(await pressed(svg.element, 'Tab')).toBe(false)
  })

  it('dims every block off the line picked while its corner mark is lit', async () => {
    const drawn = mount(CrowdedLines)
    await drawn.findAll('.sc-data-mark')[0]!.trigger('pointerenter')
    expect(drawn.find('[data-on="picked"]').classes()).not.toContain('sc-data-off')
    expect(drawn.find('.sc-data-crowding-block:not([data-on])').classes()).toContain('sc-data-off')
  })
})
