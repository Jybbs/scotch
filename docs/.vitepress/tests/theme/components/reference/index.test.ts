// @vitest-environment happy-dom
import { flushPromises, mount }     from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h }       from 'vue'

import { REFERENCE_WIDGETS } from '../../../../theme/components/reference/index.ts'

describe('REFERENCE_WIDGETS', () => {
  it.each(Object.keys(REFERENCE_WIDGETS))('loads the %s widget with the page placing it', async name => {
    const widget = mount(defineComponent({ setup: () => () => h(REFERENCE_WIDGETS[name]!) }))
    await vi.dynamicImportSettled()
    await flushPromises()
    expect(widget.find('.sc-ref').exists()).toBe(true)
  })
})
