// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h, nextTick }          from 'vue'

import type { CornerMark } from '../../../../../docs/.vitepress/lib/data/corner.ts'
import { Corner }          from '../../../../../docs/.vitepress/theme/components/data/corner.ts'

const ITEMS: readonly CornerMark[] = [
  { key: 'up', label: 'Clears it', tone: 'var(--sc-data-link)' },
  { glyph: '=', key: null, label: 'A color alone', tone: 'var(--sc-data-ink)' }
]

describe('Corner', () => {
  it('draws a square per item in its color or its glyph, labeled, over an empty caption', () => {
    const legend = mount(Corner, { props: { column: true, items: ITEMS } })
    expect(legend.get('[role=list]').classes()).toContain('flex-col')
    expect(legend.findAll('[role=listitem]').map(mark => [
      mark.attributes('style'), mark.attributes('aria-label'), mark.text()
    ])).toEqual([
      ['--sc-data-tone: var(--sc-data-link);', 'Clears it', ''],
      ['--sc-data-tone: var(--sc-data-ink);', 'A color alone', '=']
    ])
    expect(legend.find('p').text()).toBe('')
  })

  it('lights the square under the pointer or the focus, naming it until it leaves', async () => {
    const legend          = mount(Corner, { props: { items: ITEMS, lit: 'up' } })
    const [first, second] = legend.findAll('[role=listitem]')
    expect([first!.attributes('data-on'), second!.attributes('data-on')]).toEqual(['', undefined])
    await first!.trigger('pointerenter')
    expect(legend.find('p').text()).toBe('Clears it')
    await first!.trigger('pointerleave')
    await second!.trigger('focus')
    expect(legend.find('p').text()).toBe('A color alone')
    await second!.trigger('keydown', { key: 'Escape' })
    expect(legend.find('p').text()).toBe('')
    await second!.trigger('blur')
    expect(legend.emitted('update:lit')).toEqual([['up'], [null], [null], [null], [null]])
  })

  it('names on the caption the part its chart holds pressed while no square is lit', async () => {
    const chart = mount({
      setup: () => () => h('div', { 'data-chart': '' }, [
        h('button', { 'aria-pressed': 'true', 'data-k': 'up' }),
        h(Corner, { items: ITEMS })
      ])
    }, { attachTo: document.body })
    await nextTick()
    expect(chart.find('p').text()).toBe('Clears it')
    chart.unmount()
  })
})
