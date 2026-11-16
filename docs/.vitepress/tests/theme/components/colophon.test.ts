// @vitest-environment happy-dom
import { type VueWrapper, enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi }      from 'vitest'
import { ref }                                      from 'vue'

import { colophonOf }    from '../../../lib/config/chrome.ts'
import { Colophon }      from '../../../theme/components/colophon.ts'
import { textOf }        from '../../common/colophon.ts'
import { FACTS, MENTOR } from '../../common/repo.ts'

const COLOPHON = colophonOf('0123456', FACTS, [MENTOR])
const REST     = textOf(COLOPHON.rest)

vi.mock('vitepress', () => ({ useData: () => ({ theme: ref({ colophon: COLOPHON }) }) }))

enableAutoUnmount(afterEach)

const lineOf  = (wrapper: VueWrapper): string => wrapper.find('.sc-colophon-line').text()
const mounted = (): VueWrapper => mount(Colophon, { attachTo: document.body })
const pieceAt = (wrapper: VueWrapper, index: number): HTMLButtonElement =>
  wrapper.findAll('button').at(index)!.element as HTMLButtonElement

describe('Colophon', () => {
  it('reads the version and the license until a piece is chosen', () => {
    expect(lineOf(mounted())).toBe(REST)
  })

  it('sets each piece over its label and its fact in short, named for a screen reader', () => {
    const wells = mounted().findAll('.sc-colophon-well')
    expect(wells.map(well => well.find('button').attributes('aria-label'))).toEqual([
      'King, built from, 0123456', 'Queen, code, Owner/game', 'Rook, games, PGN Mentor',
      'Bishop, crate, shakmaty, GPL', 'Knight, faces, SIL OFL 1.1', 'Pawn, pieces, Cburnett, BSD'
    ])
    expect(wells[1]!.find('.sc-colophon-short').html()).toContain('Owner/<wbr>game')
    expect(wells[1]!.find('svg').attributes('aria-hidden')).toBe('true')
  })

  it('spells out the fact of the well a pointer rests on and lifts its piece', async () => {
    const wrapper = mounted()
    const well    = wrapper.findAll('.sc-colophon-well')[2]!
    await well.trigger('pointerenter')
    expect(lineOf(wrapper)).toBe(textOf(COLOPHON.credits[2]!.full))
    expect(well.classes()).toContain('is-shown')
    await well.trigger('pointerleave')
    expect(lineOf(wrapper)).toBe(REST)
  })

  it('spells out the fact of a pressed piece and links each address it names', async () => {
    const wrapper = mounted()
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(lineOf(wrapper)).toBe('Built from 0123456 of Owner/game.')
    expect(wrapper.findAll('.sc-colophon-line a').map(link => link.attributes('href'))).toEqual([
      'https://github.com/Owner/game/commit/0123456', 'https://github.com/Owner/game'
    ])
    expect(wrapper.find('.sc-colophon-line code').text()).toBe('0123456')
  })

  it('sets the name in italics on the line it reads until a piece is chosen', () => {
    expect(mounted().find('.sc-colophon-line i').text()).toBe('Scotch')
  })
})

describe('Colophon under the keyboard', () => {
  it('lets a pointer outrank the keyboard while it rests on a well', async () => {
    const wrapper = mounted()
    await wrapper.findAll('button')[0]!.trigger('focus')
    await wrapper.findAll('.sc-colophon-well')[4]!.trigger('pointerenter')
    expect(lineOf(wrapper)).toBe(textOf(COLOPHON.credits[4]!.full))
  })

  const last = COLOPHON.credits.length - 1
  const KEYS = [
    ['ArrowRight', 1], ['ArrowDown', 1], ['ArrowLeft', last], ['ArrowUp', last], ['End', last], ['Home', 0]
  ] as const

  it.each(KEYS)('moves the focus from the first piece on %s to piece %i', async (key, to) => {
    const wrapper = mounted()
    pieceAt(wrapper, 0).focus()
    await wrapper.find('.sc-colophon-tray').trigger('keydown', { key })
    expect(document.activeElement).toBe(pieceAt(wrapper, to))
    const stops = wrapper.findAll("button[tabindex='0']").map(button => button.element)
    expect(stops).toEqual([pieceAt(wrapper, to)])
    expect(lineOf(wrapper)).toBe(textOf(COLOPHON.credits[to]!.full))
  })

  it('leaves the focus where it is on any other key', async () => {
    const wrapper = mounted()
    pieceAt(wrapper, 2).focus()
    await wrapper.find('.sc-colophon-tray').trigger('keydown', { key: 'a' })
    expect(document.activeElement).toBe(pieceAt(wrapper, 2))
  })

  it("holds the fact while the focus moves into the line's links and clears it once it leaves", async () => {
    const wrapper = mounted()
    pieceAt(wrapper, 1).focus()
    await wrapper.vm.$nextTick()
    const link = wrapper.find('.sc-colophon-line a').element as HTMLAnchorElement
    await wrapper.find('footer').trigger('focusout', { relatedTarget: link })
    expect(lineOf(wrapper)).toBe(textOf(COLOPHON.credits[1]!.full))
    await wrapper.find('footer').trigger('focusout', { relatedTarget: null })
    expect(lineOf(wrapper)).toBe(REST)
  })
})
