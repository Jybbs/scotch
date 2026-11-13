// @vitest-environment happy-dom
import { mount }                           from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import type { Tied } from '../../../../lib/viewer/ranks.ts'
import { Tally }     from '../../../../theme/components/viewer/tally.ts'

/**
 * Builds `count` tied games, each rated `rating` by both players.
 */
function rated(count: number, rating: string): Tied[] {
  return Array.from({ length: count }, () => ({ headers: { BlackElo: rating, WhiteElo: rating } }))
}

const TIES = [...rated(2, '2750'), ...rated(10, '2550'), ...rated(1, '2100')]

/**
 * Mounts the tally over `TIES` tied on a run of `length` positions, showing the
 * game at `at`.
 */
function mounted(at = 0, length = 22): ReturnType<typeof mount<typeof Tally>> {
  return mount(Tally, { attachTo: document.body, props: { at, length, ties: TIES } })
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('Tally naming the tied games', () => {
  it.each([
    [22, '13 games tied on 22 positions'],
    [1, '13 games tied on 1 position']
  ])('names how many games tie on a run of %i positions', (length, named) => {
    expect(mounted(0, length).find('.sc-viewer-tally-kicker').text()).toBe(`${named}Weighed by rating`)
  })

  it('draws a chip for each rank holding a game, each counting its games', () => {
    const chips = mounted().findAll('.sc-viewer-rank-chip')
    expect(chips.map(chip => chip.text())).toEqual(['×2', '×10', '×1'])
    expect(chips.map(chip => chip.attributes('title')))
      .toEqual(['2 games rated 2700 and up', '10 games rated 2500 to 2599', '1 game rated below 2400 or unrated'])
  })

  it('presses the chip of the shown game’s rank and fills its dot', () => {
    const wrapper = mounted(4)
    expect(wrapper.findAll('.sc-viewer-rank-chip').map(chip => chip.attributes('aria-pressed')))
      .toEqual(['false', 'true', 'false'])
    const dots = wrapper.findAll('.sc-viewer-rank')[1]!.findAll('.sc-viewer-rank-dot')
    expect(dots.map(dot => dot.attributes('data-on') !== undefined)).toEqual([false, true, false, false, false,
      false, false])
  })

  it('caps a rank past seven games at seven dots and marks the row as holding more', () => {
    const rank = mounted().findAll('.sc-viewer-rank')[1]!
    expect(rank.findAll('.sc-viewer-rank-dot')).toHaveLength(7)
    expect(rank.find('.sc-viewer-rank-dots').attributes('data-more')).toBe('')
    expect(mounted().findAll('.sc-viewer-rank-dots')[0]!.attributes('data-more')).toBeUndefined()
  })

})

describe('Tally stepping between the tied games', () => {
  it.each([
    [0, 0, 1],
    [1, 0, 0],
    [0, 1, 2],
    [4, 1, 5],
    [11, 1, 2],
    [12, 2, 12]
  ])('steps from the game at %i through the chip of rank %i to the game at %i', async (at, chip, next) => {
    const wrapper = mounted(at)
    await wrapper.findAll('.sc-viewer-rank-chip')[chip]!.trigger('click')
    expect(wrapper.emitted('show')).toEqual([[next]])
  })

  it.each([
    [0, 2],
    [1, 4],
    [6, 11]
  ])('shows the game the dot at %i of the 10-game rank opens on, at %i', async (dot, at) => {
    const wrapper = mounted()
    await wrapper.findAll('.sc-viewer-rank')[1]!.findAll('.sc-viewer-rank-dot')[dot]!.trigger('click')
    expect(wrapper.emitted('show')).toEqual([[at]])
  })

  it('marks each rank’s share of the ties on the meter, the shown game’s rank filled', () => {
    const spans = mounted(12).findAll('.sc-viewer-meter span')
    expect(spans.map(span => span.attributes('data-on') !== undefined)).toEqual([false, false, false, false, true])
    expect(spans[2]!.attributes('style')).toContain('left: 15.38')
  })
})
