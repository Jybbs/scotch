// @vitest-environment happy-dom
import { flushPromises, mount }     from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h }       from 'vue'

import { DATA_WIDGETS } from '../../../../../docs/.vitepress/theme/components/data/index.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

describe('DATA_WIDGETS', () => {
  it.each(Object.keys(DATA_WIDGETS))('loads the %s widget with the page placing it', async name => {
    const widget = mount(defineComponent({ setup: () => () => h(DATA_WIDGETS[name]!) }))
    await vi.dynamicImportSettled()
    await flushPromises()
    expect(widget.element).toBeInstanceOf(Element)
  })
})
