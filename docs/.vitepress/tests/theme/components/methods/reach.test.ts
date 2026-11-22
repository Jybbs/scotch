// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { counted }      from '../../../../lib/data/numbers.ts'
import { REACH }        from '../../../../lib/methods/reach.ts'
import { Reach }        from '../../../../theme/components/methods/reach.ts'
import { prevented }    from '../../../common/keys.ts'
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

/**
 * Mounts the widget and reads whether its bars glide from one fill to the next.
 */
const glides = (): boolean => mount(Reach).find('rect').classes().includes('duration-glide')
const now    = (wrapper: Wrapper): number => Number(wrapper.find('[role=slider]').attributes('aria-valuenow'))
const read   = (wrapper: Wrapper): string => wrapper.find('[aria-live=polite]').text()

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
  })

  it('glides each bar while the drawings move and holds it still under reduced motion', () => {
    expect(glides()).toBe(true)
    reduceMotion()
    expect(glides()).toBe(false)
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
    `Middle half, ${REACH.low} to ${REACH.high}`,
    `counting the ${counted(REACH.games)} sampled games`
  ])('names %s', words => {
    expect(still().text()).toContain(words)
  })
})

describe('Reach as marked', () => {
  it('stands every bar on the axis', () => {
    const feet = still().findAll('rect')
      .map(bar => Number(bar.attributes('y')) + Number(bar.attributes('height')))
    expect(new Set(feet)).toEqual(new Set([REACH.tallest]))
  })

  it('runs a hairline from the top down to the bar of the median and of the longest', () => {
    const lines = still().findAll('[role=slider] > i').map(line => (line.element as HTMLElement).style)
    expect(lines.map(({ height, left }) => [left, height])).toEqual([REACH.median, REACH.longest].map(at => [
      `${(at - 0.5) / REACH.longest * 100}%`,
      `${(1 - REACH.counts[at - 1]! / REACH.tallest) * 100}%`
    ]))
  })

  it('names the median over its bar and every tenth length short of the longest under the bars', () => {
    const wrapper = still()
    const median  = wrapper.findAll('span').find(span => span.text() === `Median ${REACH.median}`)!
    const tens    = Math.floor((REACH.longest - 1) / 10)
    const ticks   = [...wrapper.find('[role=slider]').element.nextElementSibling!.children]
    expect((median.element as HTMLElement).style.left).toBe(`${(REACH.median - 0.5) / REACH.longest * 100}%`)
    expect(ticks.map(tick => tick.textContent))
      .toEqual(['1', ...Array.from({ length: tens }, (_, at) => `${(at + 1) * 10}`)])
  })
})

describe('Reach as read aloud', () => {
  const once = REACH.counts.indexOf(1) + 1
  const many = REACH.counts.findIndex(count => count > 1) + 1

  it.each([
    [once, `1 game with a longest run of ${once}`],
    [many, `${REACH.counts[many - 1]} games with a longest run of ${many}`]
  ])('tells a screen reader the count at length %i', async (length, text) => {
    const wrapper = still()
    await point(wrapper, 'pointermove', 10 * length - 5)
    expect(wrapper.find('[role=slider]').attributes('aria-valuetext')).toBe(text)
  })

  it('names one game and one position in the singular', async () => {
    const wrapper = still()
    await point(wrapper, 'pointermove', 10 * once - 5)
    expect(read(wrapper)).toBe(`1game holds a longest run of ${once} positions`)
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

  it('steps as a slider across every length from the tab order', () => {
    expect(still().find('[role=slider]').attributes()).toMatchObject({
      'aria-label'    : 'Length of the longest run',
      'aria-valuemax' : String(REACH.longest),
      'aria-valuemin' : '1',
      'tabindex'      : '0'
    })
  })

  it('keeps the page from scrolling on a key it answers and lets any other key through', () => {
    const slider = still().find('[role=slider]').element
    expect([prevented(slider, 'Home'), prevented(slider, 'a')]).toEqual([true, false])
  })
})
