// @vitest-environment happy-dom
import { mount }                                from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick }                             from 'vue'

import { RUN_TUNING, exampleOf, timelineAt } from '../../../../lib/methods/example.ts'
import { METHODS_WIDGETS }                   from '../../../../theme/components/methods/index.ts'
import { Run }                               from '../../../../theme/components/methods/run.ts'
import { test }                              from '../../../common/clock.ts'
import { reduceMotion }                      from '../../../common/motion.ts'

/**
 * Mounts the widget into the document, so the list it scrolls has a layout.
 */
function mounted(): ReturnType<typeof mount<typeof Run>> {
  return mount(Run, { attachTo: document.body })
}

beforeEach(() => {
  const finished = { cancel: vi.fn<() => void>(), playState: 'finished' } as unknown as Animation
  vi.spyOn(Element.prototype, 'animate').mockImplementation(() => finished)
})

describe('METHODS_WIDGETS', () => {
  it('places the widget under the name the Methods page gives it', () => {
    expect(METHODS_WIDGETS).toEqual({ run: Run })
  })
})

describe('Run as drawn', () => {
  it('opens on the ply before the two games meet', () => {
    const wrapper = mounted()
    expect(wrapper.find('[role=status]').text()).toBe('Ply 6 · the positions differ')
    expect(wrapper.find('[aria-selected=true]').text()).toContain('Bg7')
  })

  it('draws the timeline in lanes that join through the run, a column per ply', () => {
    const drawn = mounted().findAll('.sc-run-cell').map(cell => cell.element as HTMLElement)
    const cells = drawn.map(cell => `${cell.dataset.cell} ${cell.style.gridRow}`)
    expect(cells.filter(cell => cell === 'run 1 / -1')).toHaveLength(11)
    expect(cells.filter(cell => cell === 'stored 2')).toHaveLength(7)
    expect(new Set(cells)).toEqual(new Set(['start 1 / -1', 'submitted 1', 'stored 2', 'run 1 / -1']))
    expect(new Set(drawn.map(cell => cell.style.gridColumn)))
      .toEqual(new Set(Array.from({ length: 19 }, (_, ply) => String(ply + 1))))
  })

  it('labels the ruler where the two games start, meet, and part, the last ending at its column', () => {
    const marks = mounted().findAll('.sc-run-ruler span')
    expect(marks.map(mark => [mark.text(), mark.attributes('style'), mark.attributes('data-end')])).toEqual([
      ['Start', 'grid-column: 1;', undefined],
      ['Meets', 'grid-column: 8;', undefined],
      ['Parts', 'grid-column: 19;', '']
    ])
  })

  test('takes an example and tuning of its own', async ({ clock }) => {
    const full    = exampleOf()
    const example = {
      ...full,
      run       : { length: 2, start: 7 },
      stored    : full.stored.slice(0, 9),
      submitted : full.submitted.slice(0, 9)
    }
    const wrapper = mount(Run, { props: { example, tuning: { gap: 1, interval: 100 } } })
    expect(wrapper.find('.sc-run').attributes('style')).toBe('--sc-run-cells: 9; --sc-run-gap: 1px;')
    await wrapper.findAll('.sc-run-button')[2]!.trigger('click')
    clock.advanceTimersByTime(100)
    await nextTick()
    expect(wrapper.find('.sc-run-status').text()).toBe('Ply 1 · the positions differ')
  })

  it('sets the note next to the key as prose', () => {
    expect(mounted().find('.sc-run-note').text()).toReadAsProse()
  })
})

describe('Run to a screen reader', () => {
  it('hides the board, its key, and the timeline from a screen reader, which reads the list', () => {
    const wrapper = mounted()
    const parts   = [
      '.sc-run-board', '.sc-run-cells', '.sc-run-heads', '.sc-run-key', '.sc-run-lanes', '.sc-run-ruler'
    ]
    expect(parts.map(part => wrapper.get(part).attributes('aria-hidden'))).toAllEqual('true')
  })
})

describe('Run as stepped', () => {
  it('steps with the buttons', async () => {
    const wrapper          = mounted()
    const [previous, next] = wrapper.findAll('.sc-run-button')
    await next!.trigger('click')
    expect(wrapper.find('.sc-run-status').text()).toBe('Ply 7 · one position')
    await previous!.trigger('click')
    expect(wrapper.find('.sc-run-status').text()).toBe('Ply 6 · the positions differ')
  })

  it.each([['0', 0], ['18', 1]])('disables the button pointing past ply %s', async (ply, button) => {
    const wrapper = mounted()
    await wrapper.find(`[id$='-ply-${ply}']`).trigger('click')
    expect(wrapper.findAll('.sc-run-button')[button]!.attributes('disabled')).toBe('')
  })

  it('steps to a ply the reader picks from the list and keys through it from the tab order', async () => {
    const wrapper = mounted()
    await wrapper.find("[id$='-ply-12']").trigger('click')
    expect(wrapper.find('[role=listbox]').attributes('tabindex')).toBe('0')
    expect(wrapper.find('[role=listbox]').attributes('aria-activedescendant')).toMatch(/-ply-12$/u)
    await wrapper.find('[role=listbox]').trigger('keydown', { key: 'Home' })
    expect(wrapper.find('.sc-run-status').text()).toBe('Both open on the starting position')
  })

  test('plays the line through from the start', async ({ clock }) => {
    const wrapper = mounted()
    const play    = wrapper.findAll('.sc-run-button')[2]!
    await play.trigger('click')
    expect(play.attributes('aria-pressed')).toBe('true')
    clock.advanceTimersByTime(RUN_TUNING.interval * 19)
    await nextTick()
    expect([wrapper.find('.sc-run-status').text(), play.attributes('aria-pressed')])
      .toEqual(['Ply 18 · parted', 'false'])
  })

  it('moves the board to the ply in view', async () => {
    const wrapper = mounted()
    await wrapper.findAll('.sc-run-button')[1]!.trigger('click')
    expect((wrapper.find('.sc-run-stamp').element as HTMLElement).style.opacity).toBe('1')
  })

  it('moves the timeline marker to the ply in view', async () => {
    const wrapper = mounted()
    await wrapper.findAll('.sc-run-button')[1]!.trigger('click')
    expect((wrapper.find('.sc-run-head').element as HTMLElement).style.transform)
      .toBe('translate(calc(700% + 21px), 0)')
  })
})

describe('Run, its list', () => {
  it('lists every ply of both games, the run marked where it meets and where it parts', () => {
    const wrapper = mounted()
    expect(wrapper.findAll('[role=option]')).toHaveLength(19)
    expect(wrapper.findAll("[role=option][data-cell='run']")).toHaveLength(11)
    const marks = wrapper.findAll('.sc-run-mark')
      .map(mark => [mark.text(), mark.element.closest('[role=option]')?.id.replace(/^.*-ply-/u, '')])
    expect(marks).toEqual([['meets', '7'], ['parts', '18']])
  })

  it.each([
    [0, 'The starting position', 'Start'],
    [7, 'Ply 7, e4 in the line and d4 in the stored game', 'd4']
  ])("names ply %i as %j, the stored game's move in its own column", (ply, label, stored) => {
    const option = mounted().find(`[id$='-ply-${ply}']`)
    expect([option.attributes('aria-label'), option.find("[data-game='stored']").text()])
      .toEqual([label, stored])
  })

  it('centers the row of the ply in view in the list', async () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollTo').mockImplementation(() => {})
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockReturnValue(400)
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(20)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200)
    await mounted().findAll('.sc-run-button')[1]!.trigger('click')
    expect(scrolled).toHaveBeenLastCalledWith(expect.objectContaining({ top: 400 - (200 - 20) / 2 }))
  })
})

describe('Run in motion', () => {
  it('ends the head motion one step left running before the next', async () => {
    vi.spyOn(Element.prototype, 'scrollTo').mockImplementation(() => {})
    const wrapper = mounted()
    const cancel  = vi.fn<() => void>()
    const head    = wrapper.find('.sc-run-head').element as HTMLElement
    head.animate  = vi.fn<() => Animation>(() => ({ cancel, playState: 'finished' }) as unknown as Animation)
    const next    = wrapper.findAll('.sc-run-button')[1]!
    await next.trigger('click')
    expect(cancel).not.toHaveBeenCalled()
    await next.trigger('click')
    expect(cancel).toHaveBeenCalled()
  })

  it('glides the timeline marker from the ply it opens on', async () => {
    vi.spyOn(Element.prototype, 'scrollTo').mockImplementation(() => {})
    const wrapper    = mounted()
    const head       = wrapper.find('.sc-run-head').element
    const animate    = vi.mocked(Element.prototype.animate)
    const [from, to] = [6, 7].map(ply => ({ transform: timelineAt(RUN_TUNING.gap, ply) }))
    await wrapper.findAll('.sc-run-button')[1]!.trigger('click')
    const glides = animate.mock.calls.filter((_, call) => animate.mock.contexts[call] === head)
    expect(glides.map(([frames]) => frames)).toEqual([[from, to]])
  })

  it('writes every step at once for a reader who prefers reduced motion', async () => {
    reduceMotion()
    const scrolled = vi.spyOn(Element.prototype, 'scrollTo').mockImplementation(() => {})
    const wrapper  = mounted()
    vi.mocked(Element.prototype.animate).mockClear()
    await wrapper.find("[id$='-ply-18']").trigger('click')
    expect(Element.prototype.animate).not.toHaveBeenCalled()
    expect(wrapper.find('.sc-run-status').text()).toBe('Ply 18 · parted')
    expect(scrolled).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }))
  })

  it('animates a step for a reader who does not', async () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollTo').mockImplementation(() => {})
    const wrapper  = mounted()
    await wrapper.findAll('.sc-run-button')[1]!.trigger('click')
    expect(Element.prototype.animate).toHaveBeenCalled()
    expect(scrolled).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'smooth' }))
  })
})
