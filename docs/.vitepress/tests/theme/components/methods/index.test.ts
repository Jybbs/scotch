// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h }   from 'vue'

import { METHODS_WIDGETS } from '../../../../theme/components/methods/index.ts'

describe('METHODS_WIDGETS', () => {
  it.each(Object.keys(METHODS_WIDGETS))('draws the %s widget with the page placing it', name => {
    const widget = mount(defineComponent({ setup: () => () => h(METHODS_WIDGETS[name]!) }))
    expect(widget.find(`.sc-${name}`).exists()).toBe(true)
  })
})
