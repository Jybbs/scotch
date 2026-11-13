// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import * as tie             from '../../../../lib/data/tie.ts'
import { TieOrder }         from '../../../../theme/components/data/tie.ts'
import { resized, unsized } from '../../../common/size.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

const shown = (drawn: ReturnType<typeof mount>): string =>
  drawn.find('.sc-data-tie-panel.sc-data-on strong').text()

describe('TieOrder', () => {
  it('draws nothing until the chart has a width', () => {
    unsized()
    expect(mount(TieOrder).find('svg').exists()).toBe(false)
  })

  it('opens on the first tied game, its path shown and its branch current', () => {
    const drawn = mount(TieOrder)
    expect(shown(drawn)).toBe(tie.tiedGames[0]!.name)
    expect(drawn.find('.sc-data-say').text()).toBe(tie.kindLead(tie.ratingKinds[0]!))
    expect(drawn.findAll('.sc-data-tie-path.sc-data-on')).toHaveLength(1)
    expect(drawn.findAll('.sc-data-tie-leaf')[0]!.classes()).toContain('sc-data-on')
    expect(drawn.findAll('.sc-data-tie-panel')).toHaveLength(
      tie.tiedGames.length + tie.ratingKinds.length + tie.meanBins.length
    )
    expect(drawn.find('.sc-data-line').exists()).toBe(false)
  })


  it('sets the places beside the flow, or beneath it where the figure is narrow', () => {
    expect(mount(TieOrder).find('.sc-data-tie-leaves').classes()).toContain('sc-data-tie-beside')
    resized(390)
    const narrow = mount(TieOrder)
    expect(narrow.find('.sc-data-tie-leaves').classes()).not.toContain('sc-data-tie-beside')
    expect(narrow.find('svg').text()).toContain('2 · One rating?')
  })
})

describe('TieOrder’s controls', () => {
  it('lights a place on a press, dimming the other branches and every other place', async () => {
    const drawn = mount(TieOrder)
    await drawn.findAll('button.sc-data-tie-place')[4]!.trigger('click')
    expect(shown(drawn)).toBe(tie.tiedGames[4]!.name)
    expect(drawn.findAll('.sc-data-tie-ribbon').map(ribbon => ribbon.classes('sc-data-off'))).toEqual([
      true, false, true
    ])
    expect(drawn.find('.sc-data-tie-band').classes()).toContain('sc-data-off')
    expect(drawn.findAll('button.sc-data-tie-place.sc-data-off')).toHaveLength(tie.tiedGames.length - 1)
    expect(drawn.findAll('button.sc-data-tie-place')[4]!.attributes('aria-pressed')).toBe('true')
  })

  it('lights a branch’s places on its head’s focus, ringing each', async () => {
    const drawn = mount(TieOrder)
    await drawn.findAll('.sc-data-tie-head')[2]!.trigger('focus')
    expect(shown(drawn)).toBe('Neither, in the order the index stores them')
    const ringed = drawn.findAll('button.sc-data-tie-place.sc-data-on')
    expect(ringed.map(place => place.text())).toEqual(['6', '7'])
    expect(drawn.findAll('.sc-data-tie-path.sc-data-on')).toHaveLength(2)
  })

  it('reads out a bin on a pointer, dimming every other bin and the meter at its share', async () => {
    const drawn = mount(TieOrder)
    const at    = tie.binOf(tie.tiedGames[1]!)
    await drawn.findAll('.sc-data-tie-bin')[at]!.trigger('pointerenter')
    expect(shown(drawn)).toBe(tie.panelOf({ at, by: 'bin' }).title)
    expect(drawn.findAll('.sc-data-tie-bin:not(.sc-data-off)')).toHaveLength(1)
    const share = String(tie.litBy({ at, by: 'bin' }).share)
    expect(drawn.find('.sc-data-tie-gauge i').attributes('style')).toContain(share)
    expect(drawn.findAll('.sc-data-tie-leaf.sc-data-on')).toHaveLength(0)
  })

  it('lights a pinned game from its pin and a branch from its ribbon', async () => {
    const drawn = mount(TieOrder)
    await drawn.findAll('.sc-data-tie-pin')[2]!.trigger('pointerenter')
    expect(shown(drawn)).toBe(tie.tiedGames[2]!.name)
    expect(drawn.findAll('.sc-data-tie-bin:not(.sc-data-off)')).toHaveLength(1)
    await drawn.findAll('.sc-data-tie-ribbon')[1]!.trigger('pointerenter')
    expect(shown(drawn)).toBe('One rating, by that rating')
    expect(drawn.findAll('.sc-data-tie-pin.sc-data-off')).toHaveLength(3)
  })
})
