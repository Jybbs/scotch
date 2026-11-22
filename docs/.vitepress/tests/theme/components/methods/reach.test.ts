// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { REACH }        from '../../../../lib/methods/reach.ts'
import { Reach }        from '../../../../theme/components/methods/reach.ts'
import { reduceMotion } from '../../../common/motion.ts'

type Wrapper = ReturnType<typeof mount<typeof Reach>>

/**
 * Mounts the widget holding still, as a reader preferring reduced motion meets
 * it.
 */
function still(): Wrapper {
  reduceMotion()
  return mount(Reach, { attachTo: document.body })
}

/**
 * Sends a pointer event of `kind` at `x` pixels across a slider ten pixels to
 * each length.
 */
async function point(wrapper: Wrapper, type: string, x: number, kind = 'mouse'): Promise<void> {
  vi.spyOn(Element.prototype, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(0, 0, 10 * REACH.longest, 160))
  wrapper.find('[role=slider]').element
    .dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, pointerType: kind }))
  await wrapper.vm.$nextTick()
}

const now  = (wrapper: Wrapper): number => Number(wrapper.find('[role=slider]').attributes('aria-valuenow'))
const read = (wrapper: Wrapper): string => wrapper.find('[aria-live=polite]').text()

describe('Reach as drawn', () => {
  it('draws a bar for each length, the median filled in the run\'s color', () => {
    const bars = still().findAll('rect')
    expect(bars).toHaveLength(REACH.longest)
    expect(bars.filter(bar => bar.classes().includes('fill-run')).map(bar => bar.attributes('x')))
      .toEqual([String(REACH.median - 1 + 0.12)])
  })

  it('shades the middle half and quiets the lengths outside it', () => {
    const fills = still().findAll('rect').map(bar => bar.classes()[0])
    expect(new Set(fills.slice(REACH.low - 1, REACH.high))).toEqual(new Set(['fill-run', 'fill-run/65']))
    expect(new Set([...fills.slice(0, REACH.low - 1), ...fills.slice(REACH.high)]))
      .toEqual(new Set(['fill-quiet/35']))
  })

  it('draws each bar as tall as its count, none where no game holds the length', () => {
    const heights = still().findAll('rect').map(bar => Number(bar.attributes('height')))
    expect(heights).toEqual(REACH.counts)
    expect(heights[1]).toBe(0)
  })

  it('opens on the median, reading out its count', () => {
    const wrapper = still()
    expect(now(wrapper)).toBe(REACH.median)
    expect(read(wrapper))
      .toBe(`${REACH.counts[REACH.median - 1]}games hold a longest run of ${REACH.median} positions`)
  })

  it.each([
    `Median ${REACH.median}`,
    `Longest ${REACH.longest}`,
    `Middle half, ${REACH.low} to ${REACH.high}`
  ])('names %s', words => {
    expect(still().text()).toContain(words)
  })
})

describe('Reach as read aloud', () => {
  it.each([
    ['Home', `${REACH.counts[0]} games with a longest run of 1`],
    ['End', `1 game with a longest run of ${REACH.longest}`]
  ])('tells a screen reader the count at the length %s steps to', async (key, text) => {
    const wrapper = still()
    await wrapper.find('[role=slider]').trigger('keydown', { key })
    expect(wrapper.find('[role=slider]').attributes('aria-valuetext')).toBe(text)
  })

  it('names one game and one position in the singular', async () => {
    const wrapper = still()
    await wrapper.find('[role=slider]').trigger('keydown', { key: 'End' })
    expect(read(wrapper)).toBe(`1game holds a longest run of ${REACH.longest} positions`)
    await wrapper.find('[role=slider]').trigger('keydown', { key: 'Home' })
    expect(read(wrapper)).toContain('a longest run of 1 position')
  })
})

describe('Reach as pointed at', () => {
  it('reads out the length under the pointer, filling its bar in ink', async () => {
    const wrapper = still()
    await point(wrapper, 'pointermove', 105)
    expect(now(wrapper)).toBe(11)
    expect(wrapper.findAll('rect')[10]!.classes()).toContain('fill-ink')
  })

  it('holds the length inside the lengths at either edge', async () => {
    const wrapper = still()
    await point(wrapper, 'pointermove', 10 * REACH.longest + 40)
    expect(now(wrapper)).toBe(REACH.longest)
    await point(wrapper, 'pointerdown', -20)
    expect(now(wrapper)).toBe(1)
  })

  it('returns to the median when a mouse leaves', async () => {
    const wrapper = still()
    await point(wrapper, 'pointermove', 105)
    await point(wrapper, 'pointerleave', 105)
    expect(now(wrapper)).toBe(REACH.median)
  })

  it('keeps the length a touch picked when the touch ends', async () => {
    const wrapper = still()
    await point(wrapper, 'pointerdown', 105, 'touch')
    await point(wrapper, 'pointerleave', 105, 'touch')
    expect(now(wrapper)).toBe(11)
  })
})

describe('Reach as stepped', () => {
  it.each([
    ['ArrowRight', REACH.median + 1],
    ['ArrowDown', REACH.median - 1],
    ['PageUp', REACH.median + 10],
    ['Home', 1],
    ['End', REACH.longest]
  ])('steps the length with %s', async (key, length) => {
    const wrapper = still()
    await wrapper.find('[role=slider]').trigger('keydown', { key })
    expect(now(wrapper)).toBe(length)
  })

  it('leaves the length where another key is pressed', async () => {
    const wrapper = still()
    await wrapper.find('[role=slider]').trigger('keydown', { key: 'Enter' })
    expect(now(wrapper)).toBe(REACH.median)
  })
})
