// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { CornerMark } from '../../../../lib/data/corner.ts'
import { Corner }          from '../../../../theme/components/data/corner.ts'

const ITEMS: readonly CornerMark[] = [
  { key: 'up', label: 'Clears it', tone: 'var(--sc-data-link)' },
  { glyph: '=', key: null, label: 'A color alone', tone: 'var(--sc-data-ink)' }
]

describe('Corner', () => {
  it('draws a mark per item, its swatch in its color or its glyph, and its label', () => {
    const marks = mount(Corner, { props: { column: true, items: ITEMS } })
    expect(marks.classes()).toContain('sc-data-corner-column')
    expect(marks.findAll('.sc-data-mark').map(mark => [mark.attributes('style'), mark.text()])).toEqual([
      ['--sc-data-mark: var(--sc-data-link);', 'Clears it'],
      ['--sc-data-mark: var(--sc-data-ink);', '=A color alone']
    ])
  })

  it('lights the mark under the pointer or the focus and nothing once it leaves', async () => {
    const marks = mount(Corner, { props: { items: ITEMS, lit: 'up' } })
    const [first, second] = marks.findAll('.sc-data-mark')
    expect(first!.classes()).toContain('sc-data-on')
    await first!.trigger('pointerenter')
    await first!.trigger('pointerleave')
    await second!.trigger('focus')
    await second!.trigger('blur')
    expect(marks.emitted('update:lit')).toEqual([['up'], [null], [null], [null]])
  })
})
