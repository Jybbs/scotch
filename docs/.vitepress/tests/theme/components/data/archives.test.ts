// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import * as files   from '../../../../lib/data/files.ts'
import * as numbers from '../../../../lib/data/numbers.ts'
import { STORE }    from '../../../../lib/data/store.ts'
import { Archives } from '../../../../theme/components/data/archives.ts'

const archives = STORE.files.length
const rows     = STORE.largest

describe('Archives', () => {
  it("draws a row per archive and one for the rest, the rest's bar striped", () => {
    const drawn = mount(Archives)
    expect(drawn.findAll('[data-chart] > div:not([aria-hidden])').length).toBe(rows.length)
    expect(drawn.findAll('i[data-others]').length).toBe(1)
    expect(drawn.find('i[data-others]').attributes('style')).toBe('width: 88.00%;')
  })

  it("sets each row's name, its games, and the share of the store held down to it", () => {
    const cells = mount(Archives).findAll('[data-chart] > div:not([aria-hidden])')
      .map(row => row.findAll('span').map(cell => cell.text()))
    expect(cells)
      .toEqual(rows.map(row => [row.name, '', numbers.counted(row.games), numbers.percent(row.held, 1)]))
  })

  it("draws each archive's bar against the largest archive's", () => {
    const widths = mount(Archives).findAll('span > i')
      .map(bar => Number(/width: ([\d.]+)%/u.exec(bar.attributes('style')!)![1]))
    expect(widths[1]! / widths[0]!).toBeCloseTo(rows[1]!.games / rows[0]!.games, 3)
  })

  it('counts every stored game beside the sentence naming the share the largest hold', () => {
    const drawn = mount(Archives)
    expect(drawn.find('span').text()).toBe(numbers.counted(STORE.games))
    expect(drawn.find('p').text()).toBe(files.largestSummary(archives, rows))
  })

  it('reads the row under the pointer and every row again as the pointer leaves', async () => {
    const drawn = mount(Archives)
    const row   = drawn.findAll('[data-chart] > div:not([aria-hidden])')[0]!
    await row.trigger('pointerenter')
    expect(row.attributes('data-on')).toBe('')
    expect(drawn.findAll('p').at(-1)!.text()).toBe(files.largestReading(archives, 0, rows))
    await drawn.find('[data-chart]').trigger('pointerleave')
    expect(drawn.findAll('p').at(-1)!.text()).toBe(files.largestReading(archives, null, rows))
  })

  it('keeps the row a finger taps once the finger lifts', async () => {
    const drawn = mount(Archives)
    await drawn.findAll('[data-chart] > div:not([aria-hidden])')[0]!.trigger('pointerenter')
    await drawn.find('[data-chart]').trigger('pointerleave', { pointerType: 'touch' })
    expect(drawn.findAll('p').at(-1)!.text()).toBe(files.largestReading(archives, 0, rows))
  })
})
