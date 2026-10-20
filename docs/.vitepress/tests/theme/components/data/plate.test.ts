// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h }                    from 'vue'

import { Plate } from '../../../../theme/components/data/plate.ts'

describe('Plate', () => {
  it('sets the figure beside its sentence, then the tools and the chart', () => {
    const plate = mount(Plate, {
      props : { big: '51%', say: 'Half end by move 40.' },
      slots : { default: () => h('svg', { class: 'chart' }), tools: () => h('button', 'Show one') }
    })
    expect(plate.find('.sc-data-big').text()).toBe('51%')
    expect(plate.find('.sc-data-say').text()).toBe('Half end by move 40.')
    expect(plate.find('.sc-data-tools button').text()).toBe('Show one')
    expect(plate.find('svg.chart').exists()).toBe(true)
  })

  it('reads each value under its label, the first in the display face and any count beside its value', () => {
    const plate    = mount(Plate, { props: { readings: [['Move', '40'], ['Drawn', '35%', '1,200']] } })
    const readings = plate.findAll('.sc-data-read > div')
    expect(readings.map(reading => [reading.find('dt').text(), reading.find('dd').text()])).toEqual([
      ['Move', '40'], ['Drawn', '35% 1,200']
    ])
    expect([readings[0]!.find('dd b').text(), readings[1]!.find('dd small').text()]).toEqual(['40', '1,200'])
    expect(plate.find('.sc-data-line').exists()).toBe(false)
  })

  it('reads one line where it holds no readings, and sets no head with neither figure nor sentence', () => {
    const plate = mount(Plate, { props: { line: 'Read from 250 archives' } })
    expect(plate.find('.sc-data-line').text()).toBe('Read from 250 archives')
    expect(plate.find('.sc-data-line').attributes('aria-live')).toBe('polite')
    expect(plate.find('.sc-data-head').exists()).toBe(false)
    expect(plate.find('.sc-data-tools').exists()).toBe(false)
  })
})
