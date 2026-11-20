// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import * as tags   from '../../../../lib/data/tags.ts'
import { TagGaps } from '../../../../theme/components/data/carried.ts'
import { pressed } from '../../../common/keys.ts'

describe('TagGaps', () => {
  it('opens on the Round tag of the 1980s, naming its gap and listing its files', () => {
    const drawn = mount(TagGaps)
    expect(drawn.find('[role=gridcell][data-on]').text()).toBe('56')
    expect(drawn.find('span[data-on]').text()).toBe('Round')
    expect(drawn.findAll('ol li')).toHaveLength(4)
    const count = tags.COLUMNS.length * tags.TAGS.names.length
    expect(drawn.findAll('[role=gridcell]')).toHaveLength(count)
  })

  it('picks the cell a pointer enters or presses, listing no files for every game’s column', async () => {
    const drawn = mount(TagGaps)
    const cells = drawn.findAll('[role=gridcell]')
    await cells.at(-1)!.trigger('pointerenter')
    expect(drawn.find('p').text()).toBe(
      tags.carriedSentence({ column: tags.COLUMNS.length - 1, tag: tags.TAGS.names.length - 1 })
    )
    expect(drawn.find('ol').exists()).toBe(false)
    await cells[0]!.trigger('click')
    expect(drawn.find('p').text()).toBe(tags.carriedSentence({ column: 0, tag: 0 }))
  })

  it('steps through the grid on the arrow keys and answers no other key', async () => {
    const drawn = mount(TagGaps)
    const grid  = drawn.find('[role="grid"]')
    expect(await pressed(grid.element, 'ArrowUp')).toBe(true)
    expect(drawn.find('span[data-on]').text()).toBe(tags.TAGS.names[2])
    expect(await pressed(grid.element, 'Tab')).toBe(false)
  })

  it('dims every cell but the gaps while the gap mark is lit', async () => {
    const drawn = mount(TagGaps)
    await drawn.findAll('[role=listitem]')[0]!.trigger('pointerenter')
    expect(drawn.find('[data-k="carried"]').attributes('data-off')).toBe('')
    expect(drawn.find('[data-k="gap"]').attributes('data-off')).toBeUndefined()
  })
})
