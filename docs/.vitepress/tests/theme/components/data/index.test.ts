// @vitest-environment happy-dom
import { flushPromises, mount }     from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h }       from 'vue'

import { PLACED }          from '../../../../lib/markdown/placements.ts'
import { DATA_WIDGETS }    from '../../../../theme/components/data/index.ts'
import { METHODS_WIDGETS } from '../../../../theme/components/methods/index.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

describe('DATA_WIDGETS', () => {
  it.each(Object.keys(DATA_WIDGETS))('loads the %s widget with the page placing it', async name => {
    const widget = mount(defineComponent({ setup: () => () => h(DATA_WIDGETS[name]!) }))
    await vi.dynamicImportSettled()
    await flushPromises()
    expect(widget.find(`.sc-data-${name}`).exists()).toBe(true)
  })

  it('holds, beside the Methods widgets, a widget under every name a page places and no other', () => {
    const placed = new Set(Object.values(PLACED).flatMap(list => list.map(placement => placement.draw)))
    expect(new Set([...Object.keys(DATA_WIDGETS), ...Object.keys(METHODS_WIDGETS)])).toEqual(placed)
  })
})
