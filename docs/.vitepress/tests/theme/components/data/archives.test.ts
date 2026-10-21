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
    expect(drawn.findAll('.sc-data-archive:not(.sc-data-archive-head)').length).toBe(rows.length)
    expect(drawn.findAll('.sc-data-bar-others').length).toBe(1)
    expect(drawn.find('.sc-data-bar-others').attributes('style')).toBe('width: 88.00%;')
  })

  it("sets each row's name, its games, and the share of the store held down to it", () => {
    const cells = mount(Archives).findAll('.sc-data-archive:not(.sc-data-archive-head)')
      .map(row => row.findAll('span').map(cell => cell.text()))
    expect(cells)
      .toEqual(rows.map(row => [row.name, '', numbers.counted(row.games), numbers.percent(row.held, 1)]))
  })

  it("draws each archive's bar against the largest archive's", () => {
    const widths = mount(Archives).findAll('.sc-data-bar i')
      .map(bar => Number(/width: ([\d.]+)%/u.exec(bar.attributes('style')!)![1]))
    expect(widths[1]! / widths[0]!).toBeCloseTo(rows[1]!.games / rows[0]!.games, 3)
  })

  it('counts every stored game beside the sentence naming the share the largest hold', () => {
    const drawn = mount(Archives)
    expect(drawn.find('.sc-data-big').text()).toBe(numbers.counted(STORE.games))
    expect(drawn.find('.sc-data-say').text()).toBe(files.largestSummary(archives, rows))
  })

  it('reads the row under the pointer and every row again as the pointer leaves', async () => {
    const drawn = mount(Archives)
    const row   = drawn.findAll('.sc-data-archive:not(.sc-data-archive-head)')[0]!
    await row.trigger('pointerenter')
    expect(row.classes()).toContain('sc-data-on')
    expect(drawn.find('.sc-data-line').text()).toBe(files.largestReading(archives, 0, rows))
    await drawn.find('.sc-data-archives').trigger('pointerleave')
    expect(drawn.find('.sc-data-line').text()).toBe(files.largestReading(archives, null, rows))
  })

  it('keeps the row a finger taps once the finger lifts', async () => {
    const drawn = mount(Archives)
    await drawn.findAll('.sc-data-archive:not(.sc-data-archive-head)')[0]!.trigger('pointerenter')
    await drawn.find('.sc-data-archives').trigger('pointerleave', { pointerType: 'touch' })
    expect(drawn.find('.sc-data-line').text()).toBe(files.largestReading(archives, 0, rows))
  })
})
