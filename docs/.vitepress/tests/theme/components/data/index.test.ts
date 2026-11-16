// @vitest-environment happy-dom
import { flushPromises, mount }     from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h }       from 'vue'

import { PLACED }       from '../../../../lib/markdown/placements.ts'
import { DATA_WIDGETS } from '../../../../theme/components/data/index.ts'
import { WIDGETS }      from '../../../../theme/components/figure.ts'

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

  it('holds, beside the other families, a widget under every name a page places and no other', () => {
    const placed = new Set(Object.values(PLACED).flatMap(list => list.map(placement => placement.draw)))
    expect(new Set(Object.keys(WIDGETS))).toEqual(placed)
  })
})
