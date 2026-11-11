// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h }       from 'vue'

import { IDENTITY } from '../../lib/identity/tokens.ts'
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
vi.mock('../../theme/components/front/layer.ts', () => ({
  Layer: defineComponent({ setup: () => () => h('i', { class: 'layer' }) })
}))

describe('Layout', () => {
  it("sets beneath every page the slip a term's link opens", () => {
    expect(mount(Layout).find("[data-slot='layout-bottom'] .sc-slip").exists()).toBe(true)
  })

  it('draws the layer the pour plays on before the hero', () => {
    expect(mount(Layout).find("[data-slot='home-hero-before'] .layer").exists()).toBe(true)
  })

  it('sets the motion switch at the end of the navigation bar', () => {
    expect(mount(Layout).find("[data-slot='nav-bar-content-after'] [role='switch']").exists()).toBe(true)
  })

  it('sets the wordmark over the tagline in the hero', () => {
    const lockup = mount(Layout).find("[data-slot='home-hero-info'] .sc-lockup")
    expect(lockup.find('.sc-wordmark svg').exists()).toBe(true)
    expect(lockup.find('.sc-tagline').text()).toBe(IDENTITY.tagline)
  })

  it("sets the mark beside the site's title, hidden from a screen reader", () => {
    const mark = mount(Layout).find("[data-slot='nav-bar-title-before'] .sc-mark")
    expect(mark.attributes('aria-hidden')).toBe('true')
    expect(mark.find('svg').exists()).toBe(true)
  })
})
