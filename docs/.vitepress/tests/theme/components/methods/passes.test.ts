// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { PASSED }       from '../../../../lib/methods/passes.ts'
import { Passes }       from '../../../../theme/components/methods/passes.ts'
import { reduceMotion } from '../../../common/motion.ts'

type Wrapper = ReturnType<typeof mount<typeof Passes>>

/**
 * Mounts the widget holding still, as a reader preferring reduced motion meets
 * it.
 */
function still(): Wrapper {
  reduceMotion()
  return mount(Passes, { attachTo: document.body })
}

const picked = (wrapper: Wrapper): string => wrapper.find('[role=tab][aria-selected=true]').attributes('aria-label')!

/**
 * Reads the share a screen reader hears for the measure picked.
 */
const live = (wrapper: Wrapper): string => wrapper.find('[aria-live=polite]').text()

describe('Passes as drawn', () => {
  it('opens on the ties, the measure meeting the most games but one', () => {
    const wrapper = still()
    expect(picked(wrapper)).toBe('Ties')
    expect(live(wrapper)).toBe(`${PASSED[1]!.share}%`)
  })

  it('draws a segment for each measure, its bar as long as its share', () => {
    const bars = still().findAll('[role=tab] span.rounded-full > span')
    expect(bars.map(bar => (bar.element as HTMLElement).style.width)).toEqual(PASSED.map(({ share }) => `${share}%`))
  })

  it('fills as many of the hundred squares as the share', () => {
    const squares = still().findAll('i.aspect-square')
    expect(squares).toHaveLength(100 * PASSED.length)
    expect(squares.slice(100, 200).filter(square => square.classes().includes('bg-run'))).toHaveLength(PASSED[1]!.share)
  })

  it('draws every measure in one cell, so the widget keeps one height', () => {
    const layers = still().findAll('[aria-hidden=true].invisible')
    expect(layers).toHaveLength(2 * (PASSED.length - 1))
  })

  it('boxes the positions a measure passes over on its track', () => {
    expect(still().findAll('rect.stroke-ink[class*=stroke-dasharray]')).toHaveLength(3)
  })
})

describe('Passes as switched', () => {
  it('picks a measure from its segment', async () => {
    const wrapper = still()
    await wrapper.findAll('[role=tab]')[2]!.trigger('click')
    expect(picked(wrapper)).toBe('Crowded positions')
    expect(live(wrapper)).toBe(`${PASSED[2]!.share}%`)
  })

  it.each([
    ['ArrowRight', 'Crowded positions'],
    ['ArrowLeft', 'Runs starting later'],
    ['Home', 'Runs starting later'],
    ['End', 'Rarer by another order']
  ])('steps the measure with %s, moving the focus with it', async (key, name) => {
    const wrapper = still()
    await wrapper.find('[role=tablist]').trigger('keydown', { key })
    expect(picked(wrapper)).toBe(name)
    expect(document.activeElement?.getAttribute('aria-label')).toBe(name)
  })

  it('wraps from the last measure to the first', async () => {
    const wrapper = still()
    await wrapper.find('[role=tablist]').trigger('keydown', { key: 'End' })
    await wrapper.find('[role=tablist]').trigger('keydown', { key: 'ArrowDown' })
    expect(picked(wrapper)).toBe('Runs starting later')
  })

  it('leaves the measure where another key is pressed', async () => {
    const wrapper = still()
    await wrapper.find('[role=tablist]').trigger('keydown', { key: 'Enter' })
    expect(picked(wrapper)).toBe('Ties')
  })
})
