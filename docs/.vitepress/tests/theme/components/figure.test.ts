// @vitest-environment happy-dom
import { mount }                                     from '@vue/test-utils'
import { describe, expect, it, vi }                  from 'vitest'
import { type VNode, defineComponent, h, nextTick } from 'vue'
import { renderToString }                            from 'vue/server-renderer'

import { FIGURE }          from '../../../lib/markdown/placements.ts'
import { Figure, WIDGETS } from '../../../theme/components/figure.ts'

vi.mock('../../../theme/components/data/index.ts', () => ({
  DATA_WIDGETS: { probe: defineComponent({ setup: () => () => h('svg', { class: 'probe' }) }) }
}))
vi.mock('../../../theme/components/front/index.ts', () => ({
  FRONT_WIDGETS: { front: defineComponent({ setup: () => () => h('svg', { class: 'front' }) }) }
}))
vi.mock('../../../theme/components/methods/index.ts', () => ({
  METHODS_WIDGETS: { other: defineComponent({ setup: () => () => h('svg', { class: 'other' }) }) }
}))
vi.mock('../../../theme/components/reference/index.ts', () => ({ REFERENCE_WIDGETS: {} }))

/**
 * Draws a table of two rows, which a figure folds beneath its widget.
 */
function rows(): VNode {
  return h('table', h('tbody', [h('tr', h('td', 'Najdorf')), h('tr', h('td', 'Dragon'))]))
}

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

  it('finds the rows of what it folds once scripts run, hiding the rest', async () => {
    const figure = mount(Figure, { props: { name: 'probe' }, slots: { default: rows } })
    await nextTick()
    await figure.find('details input.sc-folded-find').setValue('  najdorf ')
    expect(figure.findAll('tbody tr').map(row => row.attributes('hidden'))).toEqual([undefined, ''])
  })

  it('writes no field into the page a reader without scripts opens', async () => {
    const page = await renderToString(h(Figure, { name: 'probe' }, { default: () => h('table') }))
    expect(page).toContain('<table>')
    expect(page).not.toContain('<input')
  })

  it('draws nothing for a name no widget takes, keeping what it folds', () => {
    const figure = mount(Figure, { props: { name: 'missing' }, slots: { default: () => h('p', 'kept') } })
    expect(figure.find('svg').exists()).toBe(false)
    expect(figure.find('details p').text()).toBe('kept')
  })

  it("gathers each section's widgets under one record", () => {
    expect(Object.keys(WIDGETS)).toEqual(['probe', 'front', 'other'])
  })
})
