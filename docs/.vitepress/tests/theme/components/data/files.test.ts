// @vitest-environment happy-dom
import { enableAutoUnmount, mount }        from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import * as files    from '../../../../lib/data/files.ts'
import * as numbers  from '../../../../lib/data/numbers.ts'
import { Files }     from '../../../../theme/components/data/files.ts'
import { prevented } from '../../../common/keys.ts'

const players  = files.playersOf()
const span     = files.curveSpan()
const initials = files.initialsOf(players)
const opening  = files.busiest(players)

enableAutoUnmount(afterEach)

/**
 * Reads which tab is selected and which initial the panel shows.
 */
function shown(list: ReturnType<typeof mount>): [string, string] {
  return [list.find('[aria-selected="true"]').text(), list.find('.sc-data-folio b').text()]
}

describe('Files', () => {
  it('opens on the initial whose archives hold the most games, its tab alone in the tab order', () => {
    const list = mount(Files)
    expect(shown(list)).toEqual([opening, opening])
    expect(list.findAll('[tabindex="0"]').map(tab => tab.text())).toEqual([opening])
    expect(list.findAll('[tabindex="-1"]').length).toBe(initials.length - 1)
    expect(list.find('[role="tabpanel"]').attributes('aria-labelledby'))
      .toBe(list.find('[aria-selected="true"]').attributes('id'))
  })

  it("ranks the initial's archives, each linked to its file, over an axis of the years", () => {
    const list   = mount(Files)
    const rows   = list.findAll('.sc-data-player')
    const ranked = files.rankedUnder(players, opening)
    const years  = list.findAll('.sc-data-years span').map(year => [year.text(), year.attributes('style')])
    expect(rows.map(row => row.find('a').attributes('href'))).toEqual(ranked.map(player => player.address))
    expect(years).toEqual([1850, 1900, 1950, 2000]
      .map(year => [String(year), `left: ${files.yearAt(span, year).toFixed(2)}%;`]))
  })

  it("numbers each archive's row and sets its games and the decades it spans beneath a count of them", () => {
    const list   = mount(Files)
    const ranked = files.rankedUnder(players, opening)
    const games  = numbers.counted(numbers.summed(ranked.map(player => player.games)))
    expect(list.find('.sc-data-folio span').text()).toBe(`${ranked.length} files · ${games} games`)
    expect(list.findAll('.sc-data-player').map(row => [
      row.find('.sc-data-number').text(), row.find('.sc-data-games').text(), row.attributes('title')
    ])).toEqual(ranked.map((player, index) => [
      String(index + 1), numbers.counted(player.games), files.playedSpan(player)
    ]))
  })

  it("fills each player's curve closed along the foot of its box", () => {
    expect(mount(Files).findAll('.sc-data-curve-fill').map(fill => fill.attributes('d')))
      .toAllEqual(expect.stringMatching(/Z$/u))
  })

  it('shows the initial whose tab is clicked', async () => {
    const list = mount(Files)
    await list.findAll('[role="tab"]')[0]!.trigger('click')
    expect(shown(list)).toEqual([initials[0], initials[0]])
  })

  it('counts a lone archive as one file', async () => {
    const lone = initials.find(initial => files.rankedUnder(players, initial).length === 1)!
    const list = mount(Files)
    await list.findAll('[role="tab"]')[initials.indexOf(lone)]!.trigger('click')
    expect(list.find('.sc-data-folio span').text()).toMatch(/^1 file · /u)
  })
})

describe('Files, from the keyboard', () => {
  it.each([
    { key: 'ArrowRight', to: initials[initials.indexOf(opening) + 1] },
    { key: 'ArrowLeft', to: initials[initials.indexOf(opening) - 1] },
    { key: 'Home', to: initials[0] },
    { key: 'End', to: initials.at(-1) }
  ])('moves to $to on $key and focuses its tab', async ({ key, to }) => {
    const list = mount(Files, { attachTo: document.body })
    await list.find('[role="tablist"]').trigger('keydown', { key })
    expect(shown(list)).toEqual([to, to])
    expect(document.activeElement?.textContent).toBe(to)
  })

  it('wraps from the first tab to the last and ignores any other key', async () => {
    const list = mount(Files)
    const tabs = list.find('[role="tablist"]')
    await tabs.trigger('keydown', { key: 'Home' })
    await tabs.trigger('keydown', { key: 'ArrowLeft' })
    await tabs.trigger('keydown', { key: 'a' })
    expect(shown(list)).toEqual([initials.at(-1), initials.at(-1)])
  })

  it('wraps from the last tab to the first', async () => {
    const list = mount(Files)
    const tabs = list.find('[role="tablist"]')
    await tabs.trigger('keydown', { key: 'End' })
    await tabs.trigger('keydown', { key: 'ArrowRight' })
    expect(shown(list)).toEqual([initials[0], initials[0]])
  })

  it('keeps the page from scrolling on a key it answers and lets any other key through', () => {
    const tabs = mount(Files).find('[role="tablist"]').element
    expect([prevented(tabs, 'Home'), prevented(tabs, 'a')]).toEqual([true, false])
  })
})
