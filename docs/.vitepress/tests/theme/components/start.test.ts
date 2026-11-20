// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h }                    from 'vue'

import { startMark } from '../../../theme/components/start.ts'
import { styled }    from '../../common/tailwind.ts'

describe('startMark', () => {
  it('sets the glyph beside Start on one line, in capitals with plain figures in tabular text', async () => {
    const drawn = mount({ render: () => h('span', { class: 'tabular-nums' }, startMark()) }, {
      attachTo: document.body
    })
    const sheet = await styled(drawn.element)
    const mark  = getComputedStyle(drawn.find('[data-start]').element)
    const label = getComputedStyle(drawn.find('[data-start] > span').element)
    expect([mark.display, mark.whiteSpace]).toEqual(['inline-flex', 'nowrap'])
    expect(drawn.find('[data-start] svg').attributes('aria-hidden')).toBe('true')
    expect([label.fontWeight, label.textTransform, label.fontVariantNumeric])
      .toEqual(['600', 'uppercase', 'normal'])
    expect(drawn.text()).toBe('Start')
    sheet.remove()
    drawn.unmount()
  })
})
