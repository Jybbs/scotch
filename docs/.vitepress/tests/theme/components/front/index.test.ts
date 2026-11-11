// @vitest-environment happy-dom
import { flushPromises, mount }     from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h }       from 'vue'

import { FRONT_WIDGETS } from '../../../../theme/components/front/index.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementVisibility: () => ({ value: true })
}))

describe('FRONT_WIDGETS', () => {
  it.each([
    ['prints', '.sc-front-prints'], ['session', '.sc-front-terminal'], ['split', '.sc-front-split'],
    ['store', '.sc-front-store']
  ])('loads the %s widget with the front page', async (name, drawn) => {
    const widget = mount(defineComponent({ setup: () => () => h(FRONT_WIDGETS[name]!) }))
    await vi.dynamicImportSettled()
    await flushPromises()
    expect(widget.element.querySelector(drawn)).not.toBeNull()
  })
})
