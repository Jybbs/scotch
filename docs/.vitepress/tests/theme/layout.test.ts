// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h }       from 'vue'

import { IDENTITY } from '../../lib/identity/tokens.ts'
import { Notes }    from '../../theme/components/notes.ts'
import { Layout }   from '../../theme/layout.ts'

vi.mock('vitepress/theme-without-fonts', () => ({
  default: {
    Layout: defineComponent({
      setup: (_, { slots }) => () => h('main', [
        'home-hero-before', 'home-hero-info', 'layout-bottom', 'nav-bar-content-after', 'nav-bar-title-before'
      ].map(name => h('section', { 'data-slot': name }, slots[name]?.())))
    })
  }
}))
vi.mock('../../theme/components/colophon.ts', () => ({
  Colophon: defineComponent({ setup: () => () => h('footer', { id: 'colophon' }) })
}))
vi.mock('../../theme/components/front/layer.ts', () => ({
  Layer: defineComponent({ setup: () => () => h('i', { class: 'layer' }) })
}))

describe('Layout', () => {
  it.each([
    ['sets the colophon beneath every page', 'layout-bottom', '#colophon'],
    ["sets beneath every page the slip a term's link opens", 'layout-bottom', "[role='tooltip']"],
    ['draws the layer the pour plays on before the hero', 'home-hero-before', '.layer'],
    ['sets the motion switch at the end of the navigation bar', 'nav-bar-content-after', "[role='switch']"]
  ])('%s', (_, slot, selector) => {
    expect(mount(Layout).find(`[data-slot='${slot}'] ${selector}`).exists()).toBe(true)
  })

  it('sets beneath every page the component picking out a citation and its source', () => {
    expect(mount(Layout).findComponent(Notes).exists()).toBe(true)
  })

  it('sets the wordmark over the tagline in the hero', () => {
    const lockup = mount(Layout).find("[data-slot='home-hero-info'] > div")
    expect(lockup.find('span > svg').exists()).toBe(true)
    expect(lockup.find('p').text()).toBe(IDENTITY.tagline)
  })

  it("sets the mark beside the site's title, hidden from a screen reader", () => {
    const mark = mount(Layout).find("[data-slot='nav-bar-title-before'] .sc-mark")
    expect(mark.attributes('aria-hidden')).toBe('true')
    expect(mark.find('svg').exists()).toBe(true)
  })
})
