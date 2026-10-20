// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h }       from 'vue'

import { FIGURE }          from '../../../lib/markdown/placements.ts'
import { Figure, WIDGETS } from '../../../theme/components/figure.ts'

vi.mock('../../../theme/components/data/index.ts', () => ({
  DATA_WIDGETS: { probe: defineComponent({ setup: () => () => h('svg', { class: 'probe' }) }) }
}))
vi.mock('../../../theme/components/methods/index.ts', () => ({
  METHODS_WIDGETS: { other: defineComponent({ setup: () => () => h('svg', { class: 'other' }) }) }
}))

describe('Figure', () => {
  it('registers under the name the placements write into a page', () => {
    expect(Figure.name).toBe(FIGURE)
  })

  it('draws the widget a placement names inside a figure carrying that name', () => {
    const figure = mount(Figure, { props: { name: 'probe' } })
    expect(figure.find('figure.sc-figure').attributes('data-name')).toBe('probe')
    expect(figure.find('svg.probe').exists()).toBe(true)
    expect(figure.find('details').exists()).toBe(false)
  })

  it("folds what a region's markers enclose shut beneath the widget, for a reader without scripts", () => {
    const figure = mount(Figure, { props: { name: 'probe' }, slots: { default: () => h('table', 'rows') } })
    expect(figure.find('details.sc-folded').attributes('open')).toBeUndefined()
    expect(figure.find('details summary').text()).toBe('The table beneath')
    expect(figure.find('details table').text()).toBe('rows')
  })

  it('draws nothing for a name no widget takes, keeping what it folds', () => {
    const figure = mount(Figure, { props: { name: 'missing' }, slots: { default: () => h('p', 'kept') } })
    expect(figure.find('svg').exists()).toBe(false)
    expect(figure.find('details p').text()).toBe('kept')
  })

  it('gathers the Data and Methods widgets under one record', () => {
    expect(Object.keys(WIDGETS)).toEqual(['probe', 'other'])
  })
})
