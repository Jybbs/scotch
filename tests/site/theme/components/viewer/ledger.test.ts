// @vitest-environment happy-dom
import { mount }                                           from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Painted }   from '../../../../../docs/.vitepress/lib/viewer/drive.ts'
import { EXAMPLES }       from '../../../../../docs/.vitepress/lib/viewer/examples.ts'
import { Loaded }         from '../../../../../docs/.vitepress/lib/viewer/loaded.ts'
import { rowAt, sheetOf } from '../../../../../docs/.vitepress/lib/viewer/sheet.ts'
import { Ledger }         from '../../../../../docs/.vitepress/theme/components/viewer/ledger.ts'
import { observeResizes } from '../../../common/observer.ts'

const loaded         = new Loaded(EXAMPLES.match)
const { last, meet } = loaded.shared!

/**
 * Reads the moves marked as the step the cursor stands on.
 */
function current(wrapper: ReturnType<typeof mount<typeof Ledger>>): string[] {
  return wrapper.findAll('[aria-current="step"] > span:first-child').map(san => san.text())
}

/**
 * Mounts the sheets for a match into the document, measured as a browser lays
 * them out.
 */
function mounted(match = loaded): {
  painted : Painted
  resize  : (width?: number) => void
  wrapper : ReturnType<typeof mount<typeof Ledger>>
} {
  const { resize } = observeResizes()
  const wrapper    = mount(Ledger, { attachTo: document.body, props: { loaded: match } })
  return { painted: wrapper.vm as unknown as Painted, resize, wrapper }
}

/**
 * Reads the moves outlined as a pair, each as its game and its move.
 */
function twinned(wrapper: ReturnType<typeof mount<typeof Ledger>>): string[] {
  return wrapper.findAll('[data-twin]')
    .map(move => `${move.attributes('data-party')} ${move.find('span:first-child').text()}`)
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(24)
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockReturnValue(180)
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(400)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(240)
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(1200)
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 400, 24))
  vi.spyOn(Element.prototype, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  document.body.replaceChildren()
})

describe('Ledger as drawn', () => {
  it('binds a row for every two plies beneath the start, marking the moves reaching the cursor it opens on', () => {
    const { wrapper } = mounted()
    expect(wrapper.findAll('[role="row"]')).toHaveLength(sheetOf(loaded).rows.length + 1)
    expect(current(wrapper))
      .toEqual([EXAMPLES.match.submitted.moves[meet - 1], EXAMPLES.match.stored!.moves[meet - 1]])
    expect(wrapper.find('[data-at]').element).toBe(wrapper.findAll('[role="row"]')[rowAt(meet, 0) + 1]!.element)
  })

  it('draws the lit row’s number and each start word in their own roles', () => {
    const { wrapper } = mounted()
    expect(wrapper.find('[data-at] [role="rowheader"]').classes()).toContain('in-data-at:text-(--sc-lit-number)')
    expect(wrapper.find('[role="row"]').findAll('[role="gridcell"][data-game]').map(half => half.classes()))
      .toEqual([expect.arrayContaining(['[&_[data-start]>span]:text-(--sc-viewer-word)']), expect.arrayContaining(['[&_[data-start]>span]:text-(--sc-viewer-word)'])])
  })

  it('opens on a row setting the start mark in each game’s half', () => {
    const start = mounted().wrapper.find('[role="row"]')
    expect(start.findAll('[role="gridcell"][data-game]')
      .map(half => [half.attributes('data-game'), half.text()]))
      .toEqual([['submitted', 'Start'], ['stored', 'Start']])
  })

  it('leaves the stored half of the start row empty where no stored game matched', () => {
    const start = mounted(new Loaded(EXAMPLES.alone)).wrapper.find('[role="row"]')
    expect(start.findAll('[role="gridcell"][data-game]').map(half => half.text())).toEqual(['Start', ''])
  })

  it('moves the cursor to a move pressed', async () => {
    const { wrapper } = mounted()
    await wrapper.findAll('button[data-party="stored"]')[3]!.trigger('click')
    expect(wrapper.emitted('go')).toEqual([[4]])
  })

  it('paints nothing before a match loads', () => {
    const { painted, wrapper } = mounted()
    painted.paint(meet + 3, false)
    expect(current(wrapper)).toHaveLength(2)
    expect(wrapper.find('[aria-current] > span:first-child').text())
      .toBe(EXAMPLES.match.submitted.moves[meet - 1])
  })
})

describe('Ledger painting the cursor', () => {
  it('moves the marks to the moves reaching the cursor and lights their row', () => {
    const { painted, wrapper } = mounted()
    painted.load()
    painted.paint(meet + 3, false)
    const was = wrapper.findAll('button[data-party="submitted"]')[meet - 1]!.element as HTMLElement
    expect(current(wrapper))
      .toEqual([EXAMPLES.match.submitted.moves[meet + 2], EXAMPLES.match.stored!.moves[meet + 2]])
    expect([was.hasAttribute('aria-current'), was.tabIndex]).toEqual([false, -1])
    expect(wrapper.findAll('[data-at]').map(row => row.element))
      .toEqual([wrapper.findAll('[role="row"]')[rowAt(meet + 3, 0) + 1]!.element])
  })

  it('draws the start row alone and lights it for a game that plays no move', () => {
    const { submitted }        = EXAMPLES.alone
    const { painted, wrapper } = mounted(new Loaded({
      ...EXAMPLES.alone,
      submitted: { ...submitted, moves: [], placements: [submitted.placements[0]!] }
    }))
    painted.load()
    painted.paint(0, false)
    expect([wrapper.findAll('[role="row"]'), wrapper.findAll('[data-at]')].map(found => found.length))
      .toEqual([1, 1])
  })

  it('lights the start row at the starting position', () => {
    const { painted, wrapper } = mounted()
    painted.load()
    painted.paint(0, false)
    expect(wrapper.findAll('[data-at]').map(row => row.element)).toEqual([wrapper.find('[role="row"]').element])
  })

  it('leaves the submitted game’s first move the one tab stop at the starting position', () => {
    const { painted, wrapper } = mounted()
    painted.load()
    painted.paint(0, false)
    const moves = wrapper.findAll('button[data-party]').map(move => (move.element as HTMLElement).tabIndex)
    expect([current(wrapper), moves.indexOf(0), moves.filter(index => index === 0)]).toEqual([[], 0, [0]])
  })
})

describe('Ledger’s pairs', () => {
  it('outlines the pair at the cursor the sheets open on', () => {
    expect(twinned(mounted().wrapper)).toEqual(['stored d4', 'submitted d4'])
  })

  it('outlines the pair at the cursor’s move as the cursor moves, and none at a move with no twin', () => {
    const { painted, wrapper } = mounted()
    painted.load()
    painted.paint(5, false)
    expect(twinned(wrapper)).toEqual(['submitted Nc3', 'stored Nc3'])
    painted.paint(6, false)
    expect(twinned(wrapper)).toEqual([])
  })

  it('outlines the pair under the pointer or focus, and the cursor’s again once it leaves', async () => {
    const { painted, wrapper } = mounted()
    const moves                = wrapper.findAll('button[data-party="submitted"]')
    painted.load()
    painted.paint(meet, false)
    await moves[0]!.trigger('pointerover')
    expect(twinned(wrapper)).toEqual(['submitted Nf3', 'stored Nf3'])
    await moves[1]!.trigger('focusin')
    expect(twinned(wrapper)).toEqual([])
    await wrapper.find('[role="grid"]').trigger('pointerleave')
    expect(twinned(wrapper)).toEqual(['stored d4', 'submitted d4'])
    await moves[4]!.trigger('focusin')
    await moves[4]!.trigger('focusout')
    expect(twinned(wrapper)).toEqual(['stored d4', 'submitted d4'])
  })

  it('keeps the cursor’s pair where the pointer rests between moves', async () => {
    const { painted, wrapper } = mounted()
    painted.load()
    await wrapper.find('[role="row"]').trigger('pointerover')
    expect(twinned(wrapper)).toEqual(['stored d4', 'submitted d4'])
  })
})

describe('Ledger’s threads', () => {
  it('draws both threads and the run’s band over the gutter once the sheets are laid out', () => {
    const { painted, resize, wrapper } = mounted()
    resize()
    painted.load()
    const svg = wrapper.find('svg:has(> [data-bar])')
    expect(svg.attributes('viewBox')).toBe('0 0 400 24')
    expect(wrapper.findAll('path[data-game]').map(thread => thread.attributes('d')?.startsWith('M')))
      .toEqual([true, true])
    expect(wrapper.find('[data-bar]').attributes('opacity')).toBe('1')
  })

  it('draws the run’s band from the row the run meets in, beneath the start row', () => {
    const { painted, wrapper } = mounted()
    painted.load()
    const y = Number(wrapper.find('[data-bar]').attributes('y'))
    expect(Math.floor((y + 3.5) / 24)).toBe(rowAt(meet, 0) + 1)
  })

  it('moves each game’s ring along its thread, hiding the ring of a game holding no position', () => {
    const { painted, wrapper } = mounted()
    painted.load()
    painted.paint(last + 40, true)
    const rings = wrapper.findAll('[data-rings] > g').map(ring => (ring.element as HTMLElement).style)
    expect(rings.map(({ opacity }) => opacity)).toEqual(['', '0'])
    expect(rings[0]!.transform).toMatch(/^translate\(/u)
    expect(wrapper.find('[data-rings]').attributes('data-gliding')).toBe('')
  })

  it('says nothing matched and hides the band where no stored game shares a position', () => {
    const { painted, wrapper } = mounted(new Loaded(EXAMPLES.alone))
    painted.load()
    expect(wrapper.find('p').exists()).toBe(true)
    expect(wrapper.find('[data-bar]').attributes('opacity')).toBe('0')
  })
})

describe('Ledger’s scroll', () => {
  it.each([
    [
      'scrolls the cursor’s row a third of the way down its box once measured',
      60,
      24 * Math.round(((rowAt(60, 0) + 1) * 24 - 80) / 24)
    ],
    ['holds the last rows at the foot of its box', loaded.last, 1200 - 240]
  ])('%s', (_, cursor, top) => {
    const { painted, resize } = mounted()
    painted.load()
    resize()
    painted.paint(cursor, false)
    expect(Element.prototype.scrollTo).toHaveBeenLastCalledWith({ behavior: 'auto', top })
  })

  it('glides the box on a glide, and scrolls it no further for a step keeping the same row', () => {
    const { painted, resize } = mounted()
    painted.load()
    resize()
    painted.paint(61, true)
    painted.paint(62, true)
    expect(Element.prototype.scrollTo).toHaveBeenCalledOnce()
    expect(Element.prototype.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }))
  })

  it('scrolls nothing while its box is hidden, then scrolls to the row last asked for once shown', () => {
    const height              = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(0)
    const { painted, resize } = mounted()
    painted.load()
    resize()
    painted.paint(60, false)
    expect(Element.prototype.scrollTo).not.toHaveBeenCalled()
    height.mockReturnValue(240)
    resize()
    expect(Element.prototype.scrollTo).toHaveBeenCalledOnce()
  })

  it('stops measuring its box once it leaves the page', () => {
    const observer = observeResizes()
    const wrapper  = mount(Ledger, { attachTo: document.body, props: { loaded } })
    wrapper.unmount()
    expect(observer.observed()).toBe(0)
  })
})
