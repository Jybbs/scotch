// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import * as tie             from '../../../../lib/data/tie.ts'
import { Plate }            from '../../../../theme/components/data/plate.ts'
import { TieOrder }         from '../../../../theme/components/data/tie.ts'
import { resized, unsized } from '../../../common/size.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

const BINS = 'svg > g:first-of-type > g'

const leaves = (drawn: ReturnType<typeof mount>): HTMLElement[] =>
  drawn.findAll('[role=group]').map(group => group.element.parentElement!)
const shown  = (drawn: ReturnType<typeof mount>): string => drawn.find('[aria-hidden=false] strong').text()

describe('TieOrder', () => {
  it('draws nothing until the chart has a width', () => {
    unsized()
    expect(mount(TieOrder).find('svg').exists()).toBe(false)
  })

  it('opens on the first tied game, its path shown and its branch current', () => {
    const drawn = mount(TieOrder)
    expect(shown(drawn)).toBe(tie.tiedGames[0]!.name)
    expect(drawn.find('p').text()).toBe(tie.kindLead(tie.ratingKinds[0]!))
    expect(drawn.findAll('svg > g[data-on]:not([role])')).toHaveLength(1)
    expect(leaves(drawn)[0]!.dataset['on']).toBe('')
    expect(drawn.findAll('div[aria-hidden]')).toHaveLength(
      tie.tiedGames.length + tie.ratingKinds.length + tie.meanBins.length
    )
    expect(drawn.findComponent(Plate).props('line')).toBe('')
  })


  it('sets the places beside the flow, or beneath it where the figure is narrow', () => {
    expect(leaves(mount(TieOrder))[0]!.style.top).not.toBe('')
    resized(390)
    const narrow = mount(TieOrder)
    expect(leaves(narrow)[0]!.style.top).toBe('')
    expect(narrow.find('svg').text()).toContain('2 · One rating?')
  })
})

describe('TieOrder’s controls', () => {
  it('lights a place on a press, dimming the other branches and every other place', async () => {
    const drawn = mount(TieOrder)
    await drawn.findAll('[role=group] button')[4]!.trigger('click')
    expect(shown(drawn)).toBe(tie.tiedGames[4]!.name)
    expect(drawn.findAll('path[data-k]').map(ribbon => ribbon.attributes('data-off') === '')).toEqual([
      true, false, true
    ])
    expect(drawn.find('svg > g:first-of-type').attributes('data-off')).toBe('')
    expect(drawn.findAll('[role=group] button[data-off]')).toHaveLength(tie.tiedGames.length - 1)
    expect(drawn.findAll('[role=group] button')[4]!.attributes('aria-pressed')).toBe('true')
  })

  it('lights a branch’s places on its head’s focus, ringing each', async () => {
    const drawn = mount(TieOrder)
    await drawn.findAll('button[aria-pressed]:not([data-k])')[2]!.trigger('focus')
    expect(shown(drawn)).toBe('Neither, in the order the index stores them')
    const ringed = drawn.findAll('[role=group] button[data-on]')
    expect(ringed.map(place => place.text())).toEqual(['6', '7'])
    expect(drawn.findAll('svg > g[data-on]:not([role])')).toHaveLength(2)
  })

  it('reads out a bin on a pointer, dimming every other bin and the meter at its share', async () => {
    const drawn = mount(TieOrder)
    const at    = tie.binOf(tie.tiedGames[1]!)
    await drawn.findAll(BINS)[at]!.trigger('pointerenter')
    expect(shown(drawn)).toBe(tie.panelOf({ at, by: 'bin' }).title)
    expect(drawn.findAll(`${BINS}:not([data-off])`)).toHaveLength(1)
    const share = String(tie.litBy({ at, by: 'bin' }).share)
    expect(drawn.find('[aria-live] span > i').attributes('style')).toContain(share)
    expect(leaves(drawn).filter(leaf => leaf.dataset['on'] === '')).toHaveLength(0)
  })

  it('lights a pinned game from its pin and a branch from its ribbon', async () => {
    const drawn = mount(TieOrder)
    await drawn.findAll('g[role=button]')[2]!.trigger('pointerenter')
    expect(shown(drawn)).toBe(tie.tiedGames[2]!.name)
    expect(drawn.findAll(`${BINS}:not([data-off])`)).toHaveLength(1)
    await drawn.findAll('path[data-k]')[1]!.trigger('pointerenter')
    expect(shown(drawn)).toBe('One rating, by that rating')
    expect(drawn.findAll('g[role=button][data-off]')).toHaveLength(3)
  })
})
