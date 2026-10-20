// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import * as decades  from '../../../../lib/data/decades.ts'
import { Decades }   from '../../../../theme/components/data/decades.ts'
import { prevented } from '../../../common/keys.ts'
import { unsized }   from '../../../common/size.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

const strip  = decades.stripOf()
const median = strip.quartiles[1]

describe('Decades', () => {
  it('shades a cell per decade and marks the median with a pawn, naming it beside the summary', () => {
    const drawn = mount(Decades)
    expect(drawn.findAll('svg rect[style]').length).toBe(strip.decades.length)
    expect(drawn.find('path.sc-data-pawn').exists()).toBe(true)
    expect(drawn.find('.sc-data-big').text()).toBe(strip.decades[median]!.name)
    expect(drawn.find('.sc-data-line').text()).toBe(decades.stripReading(strip, null))
  })
})

describe('Decades, under a pointer', () => {
  it('picks the last decade under a pointer past the last cell', async () => {
    const drawn = mount(Decades)
    await drawn.find('.sc-data-chart').trigger('pointermove', { clientX: 10_000 })
    expect(drawn.find('.sc-data-line').text()).toBe(decades.stripReading(strip, strip.decades.length - 1))
  })

  it('reads the decade under the pointer, clearing the reading and the shade as it leaves', async () => {
    const drawn = mount(Decades)
    const chart = drawn.find('.sc-data-chart')
    await chart.trigger('pointermove', { clientX: 1 })
    expect(drawn.find('.sc-data-line').text()).toBe(decades.stripReading(strip, 0))
    expect(drawn.find('.sc-data-cursor').classes()).toContain('sc-data-on')
    await chart.trigger('pointerleave')
    expect(drawn.find('.sc-data-line').text()).toBe(decades.stripReading(strip, null))
    expect(drawn.find('.sc-data-cursor').classes()).not.toContain('sc-data-on')
  })

  it("reads the pointer from the chart's own left edge wherever the page places it", async () => {
    const drawn = mount(Decades)
    const chart = drawn.find('.sc-data-chart')
    vi.spyOn(chart.element, 'getBoundingClientRect').mockReturnValue(new DOMRect(200, 0, 600, 78))
    await chart.trigger('pointermove', { clientX: 201 })
    expect(drawn.find('.sc-data-line').text()).toBe(decades.stripReading(strip, 0))
  })

  it('keeps the decade a finger taps without moving once the finger lifts', async () => {
    const drawn = mount(Decades)
    const chart = drawn.find('.sc-data-chart')
    await chart.trigger('pointerdown', { clientX: 1, pointerType: 'touch' })
    await chart.trigger('pointerup', { pointerType: 'touch' })
    await chart.trigger('pointerleave', { pointerType: 'touch' })
    expect(drawn.find('.sc-data-line').text()).toBe(decades.stripReading(strip, 0))
  })
})

describe('Decades, stepped by key and unsized', () => {
  it.each([
    { key: 'ArrowRight', picked: median + 1 },
    { key: 'ArrowLeft', picked: median - 1 },
    { key: 'Home', picked: 0 },
    { key: 'End', picked: strip.decades.length - 1 }
  ])('steps from the median decade on $key, as a slider does', async ({ key, picked }) => {
    const drawn = mount(Decades)
    await drawn.find('.sc-data-chart').trigger('keydown', { key })
    expect(drawn.find('.sc-data-chart').attributes('aria-valuenow')).toBe(String(picked))
    expect(drawn.find('.sc-data-line').text()).toBe(decades.stripReading(strip, picked))
  })

  it('ignores any other key and clears the reading on leaving the chart', async () => {
    const drawn = mount(Decades)
    const chart = drawn.find('.sc-data-chart')
    await chart.trigger('keydown', { key: 'a' })
    expect(drawn.find('.sc-data-line').text()).toBe(decades.stripReading(strip, null))
    await chart.trigger('keydown', { key: 'Home' })
    await chart.trigger('blur')
    expect(drawn.find('.sc-data-line').text()).toBe(decades.stripReading(strip, null))
  })

  it('draws nothing until the chart has a width, holding the room the chart takes', () => {
    unsized()
    const drawn  = mount(Decades)
    const height = decades.stripLayout(strip.decades.length, 0).height
    expect(drawn.find('svg').exists()).toBe(false)
    expect(drawn.find('.sc-data-chart').attributes('style')).toBe(`min-height: ${height}px;`)
  })
})

describe('Decades, its marks', () => {
  const layout = decades.stripLayout(strip.decades.length, 600)

  it('rules the decades holding the first and the third quarter of the dated games', () => {
    const [first, , third] = strip.quartiles
    const rules            = mount(Decades).findAll('rect.sc-data-rule')
      .map(rule => Number(rule.attributes('x')))
    expect(rules).toEqual([decades.cellMiddle(layout, first), decades.cellMiddle(layout, third)])
  })

  it('rules the median decade and stands the pawn on it', () => {
    const drawn  = mount(Decades)
    const middle = decades.cellMiddle(layout, median)
    expect(Number(drawn.find('rect.sc-data-median').attributes('x'))).toBe(middle)
    expect(drawn.find('path.sc-data-pawn').attributes('transform'))
      .toBe(decades.pawnAt(middle + 0.5, layout.band.top - 8))
  })

  it('names the first decade, the last, and each decade the axis marks beneath the strip', () => {
    expect(mount(Decades).findAll('text.sc-data-axis').map(name => name.text()))
      .toEqual(decades.stripTicks(strip).map(index => strip.decades[index]!.label))
  })

  it('names the median decade until a key picks another, then the decade picked', async () => {
    const chart = mount(Decades).find('.sc-data-chart')
    expect(chart.attributes('aria-valuetext')).toBe(decades.stripReading(strip, median))
    await chart.trigger('keydown', { key: 'Home' })
    expect(chart.attributes('aria-valuetext')).toBe(decades.stripReading(strip, 0))
  })
})

describe('Decades, shaded and picked', () => {
  const games = strip.decades.map(decade => decade.games)

  it('shades the busiest decade darkest and the quietest lightest', () => {
    const shades = mount(Decades).findAll('svg rect[style]')
      .map(cell => Number(/(\d+)%/u.exec(cell.attributes('style')!)![1]))
    expect([shades.indexOf(Math.max(...shades)), shades.indexOf(Math.min(...shades))])
      .toEqual([games.indexOf(Math.max(...games)), games.indexOf(Math.min(...games))])
  })

  it('moves the shade over the decade a key picks', async () => {
    const drawn = mount(Decades)
    await drawn.find('.sc-data-chart').trigger('keydown', { key: 'End' })
    const { starts } = decades.stripLayout(strip.decades.length, 600)
    expect(drawn.find('.sc-data-cursor').attributes('style'))
      .toContain(`translate3d(${starts.at(-2)}px, 0, 0)`)
  })
})

describe('Decades, from the keyboard', () => {
  it('steps as a slider across every decade from the tab order', () => {
    expect(mount(Decades).find('.sc-data-chart').attributes()).toMatchObject({
      'aria-valuemax' : String(strip.decades.length - 1),
      'aria-valuemin' : '0',
      'role'          : 'slider',
      'tabindex'      : '0'
    })
  })

  it('keeps the page from scrolling on a key it answers and lets any other key through', () => {
    const chart = mount(Decades).find('.sc-data-chart').element
    expect([prevented(chart, 'Home'), prevented(chart, 'a')]).toEqual([true, false])
  })
})
