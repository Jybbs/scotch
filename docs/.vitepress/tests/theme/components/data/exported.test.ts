// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import * as exported from '../../../../lib/data/exported.ts'
import { Exported }  from '../../../../theme/components/data/exported.ts'
import { pressed }   from '../../../common/keys.ts'

describe('Exported', () => {
  it('draws every field panel in one cell, only the picked one in reach', () => {
    const drawn = mount(Exported)
    expect(drawn.findAll('[role="tabpanel"]')).toHaveLength(exported.FIELDS.length)
    expect(drawn.findAll('[role="tabpanel"][data-on]').map(panel => panel.attributes('id'))).toEqual([
      expect.stringMatching(/-panel-span$/u)
    ])
    expect(drawn.findAll('[role=tabpanel] code').length).toBeGreaterThan(0)
  })

  it('picks a field by a press or the arrow keys', async () => {
    const drawn = mount(Exported, { attachTo: document.body })
    const tabs  = drawn.findAll('[role="tab"]')
    await tabs[0]!.trigger('click')
    expect(tabs[0]!.attributes('aria-selected')).toBe('true')
    expect(await pressed(tabs[0]!.element, 'ArrowLeft')).toBe(true)
    expect(document.activeElement).toBe(tabs.at(-1)!.element)
    expect(await pressed(tabs[0]!.element, 'x')).toBe(false)
    drawn.unmount()
  })
})
