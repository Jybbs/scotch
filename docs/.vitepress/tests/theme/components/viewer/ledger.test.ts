// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Painted }   from '../../../../lib/viewer/drive.ts'
import { EXAMPLES }       from '../../../../lib/viewer/examples.ts'
import { Loaded }         from '../../../../lib/viewer/loaded.ts'
import { rowAt, sheetOf } from '../../../../lib/viewer/sheet.ts'
import { Ledger }         from '../../../../theme/components/viewer/ledger.ts'
import { observeResizes } from '../../../common/observer.ts'

const loaded         = new Loaded(EXAMPLES.match)
const { last, meet } = loaded.shared!

/**
 * Reads the moves marked as the step the cursor stands on.
 */
function current(wrapper: ReturnType<typeof mount<typeof Ledger>>): string[] {
  return wrapper.findAll('[aria-current="step"] .sc-viewer-san').map(san => san.text())
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
    .map(move => `${move.attributes('data-party')} ${move.find('.sc-viewer-san').text()}`)
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
  it('binds a row for every two plies, marking the moves reaching the cursor it opens on', () => {
    const { wrapper } = mounted()
    expect(wrapper.findAll('[role="row"]')).toHaveLength(sheetOf(loaded).rows.length)
    expect(current(wrapper))
      .toEqual([EXAMPLES.match.submitted.moves[meet - 1], EXAMPLES.match.stored!.moves[meet - 1]])
    expect(wrapper.find('[data-at]').element).toBe(wrapper.findAll('[role="row"]')[rowAt(meet, 0)]!.element)
  })

  it('moves the cursor to a move pressed', async () => {
    const { wrapper } = mounted()
    await wrapper.findAll('.sc-viewer-move[data-party="stored"]')[3]!.trigger('click')
    expect(wrapper.emitted('go')).toEqual([[4]])
  })

  it('paints nothing before a match loads', () => {
    const { painted, wrapper } = mounted()
    painted.paint(meet + 3, false)
    expect(current(wrapper)).toHaveLength(2)
    expect(wrapper.find('[aria-current] .sc-viewer-san').text())
      .toBe(EXAMPLES.match.submitted.moves[meet - 1])
  })
})

describe('Ledger painting the cursor', () => {
  it('moves the marks to the moves reaching the cursor and lights their row', () => {
    const { painted, wrapper } = mounted()
    painted.load()
    painted.paint(meet + 3, false)
    const was = wrapper.findAll('.sc-viewer-move[data-party="submitted"]')[meet - 1]!.element as HTMLElement
    expect(current(wrapper))
      .toEqual([EXAMPLES.match.submitted.moves[meet + 2], EXAMPLES.match.stored!.moves[meet + 2]])
    expect([was.hasAttribute('aria-current'), was.tabIndex]).toEqual([false, -1])
    expect(wrapper.findAll('[data-at]').map(row => row.element))
      .toEqual([wrapper.findAll('[role="row"]')[rowAt(meet + 3, 0)]!.element])
  })

  it('draws no rows and lights none for a game that plays no move', () => {
    const { submitted }        = EXAMPLES.alone
    const { painted, wrapper } = mounted(new Loaded({
      ...EXAMPLES.alone,
      submitted: { ...submitted, moves: [], placements: [submitted.placements[0]!] }
    }))
    painted.load()
    painted.paint(0, false)
    expect([wrapper.findAll('[role="row"]'), wrapper.findAll('[data-at]')].map(found => found.length))
      .toEqual([0, 0])
  })

  it('leaves the submitted game’s first move the one tab stop at the starting position', () => {
    const { painted, wrapper } = mounted()
    painted.load()
    painted.paint(0, false)
    const moves = wrapper.findAll('.sc-viewer-move').map(move => (move.element as HTMLElement).tabIndex)
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
    const moves                = wrapper.findAll('.sc-viewer-move[data-party="submitted"]')
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
    await wrapper.find('.sc-viewer-row').trigger('pointerover')
    expect(twinned(wrapper)).toEqual(['stored d4', 'submitted d4'])
  })
})

describe('Ledger’s threads', () => {
  it('draws both threads and the run’s band over the gutter once the sheets are laid out', () => {
    const { painted, resize, wrapper } = mounted()
    resize()
    painted.load()
    const svg = wrapper.find('svg.sc-viewer-threads')
    expect(svg.attributes('viewBox')).toBe('0 0 400 24')
    expect(wrapper.findAll('.sc-viewer-thread').map(thread => thread.attributes('d')?.startsWith('M')))
      .toEqual([true, true])
    expect(wrapper.find('.sc-viewer-bar').attributes('opacity')).toBe('1')
  })

  it('moves each game’s ring along its thread, hiding the ring of a game holding no position', () => {
    const { painted, wrapper } = mounted()
    painted.load()
    painted.paint(last + 40, true)
    const rings = wrapper.findAll('.sc-viewer-ring-at').map(ring => (ring.element as HTMLElement).style)
    expect(rings.map(({ opacity }) => opacity)).toEqual(['', '0'])
    expect(rings[0]!.transform).toMatch(/^translate\(/u)
    expect(wrapper.find('.sc-viewer-rings').classes()).toContain('sc-viewer-gliding')
  })

  it('says nothing matched and hides the band where no stored game shares a position', () => {
    const { painted, wrapper } = mounted(new Loaded(EXAMPLES.alone))
    painted.load()
    expect(wrapper.find('.sc-viewer-none').exists()).toBe(true)
    expect(wrapper.find('.sc-viewer-bar').attributes('opacity')).toBe('0')
  })
})

describe('Ledger’s scroll', () => {
  it('scrolls the cursor’s row a third of the way down its box once measured', () => {
    const { painted, resize } = mounted()
    painted.load()
    resize()
    painted.paint(60, false)
    expect(Element.prototype.scrollTo)
      .toHaveBeenLastCalledWith({ behavior: 'auto', top: 24 * Math.round((rowAt(60, 0) * 24 - 80) / 24) })
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

  it('holds the last rows at the foot of its box', () => {
    const { painted, resize } = mounted()
    painted.load()
    resize()
    painted.paint(loaded.last, false)
    expect(Element.prototype.scrollTo).toHaveBeenLastCalledWith({ behavior: 'auto', top: 1200 - 240 })
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
