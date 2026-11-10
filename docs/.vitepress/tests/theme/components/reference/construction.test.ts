// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, vi } from 'vitest'

import { SUBPATHS }     from '../../../../lib/reference/construction.ts'
import { MARKS }        from '../../../../lib/reference/marks.ts'
import { Construction } from '../../../../theme/components/reference/construction.ts'
import { test }         from '../../../common/clock.ts'
import { reduceMotion } from '../../../common/motion.ts'
import { onScreen }     from '../../../common/unfold.ts'

const LAST = MARKS.guides.length - 1

function settled(clock: typeof vi): ReturnType<typeof mount> {
  onScreen()
  reduceMotion()
  const drawn = mount(Construction)
  clock.runAllTimers()
  return drawn
}

describe('Construction', () => {
  test('rests on the last length, with each before it seen', ({ clock }) => {
    const drawn = settled(clock)
    const state = drawn.findAll('.sc-ref-guide').map(guide => guide.attributes('data-state'))
    expect(state.at(-1)).toBe('now')
    expect(state.slice(0, -1).every(item => item === 'seen')).toBe(true)
    expect(drawn.find('.sc-ref-figure > b').text()).toBe(String(MARKS.guides[LAST]!.length))
  })

  test('reserves the digits of the longest length beside its figure', ({ clock }) => {
    const digits = Math.max(...MARKS.guides.map(item => String(item.length).length))
    expect(settled(clock).find('.sc-ref-figure > b').attributes('style')).toContain(`min-width: ${digits}ch`)
  })

  test('draws each subpath as an outline of its own', ({ clock }) => {
    expect(settled(clock).findAll('.sc-ref-out').length).toBe(SUBPATHS.length)
  })

  test('draws the length a reader presses, naming it, and lights the subpaths it measures', async ({ clock }) => {
    const drawn = settled(clock)
    await drawn.findAll('.sc-ref-list button')[0]!.trigger('click')
    expect(drawn.find('.sc-ref-figure > b').text()).toBe(String(MARKS.guides[0]!.length))
    expect(drawn.find('.sc-ref-stack > [data-at] h4').text()).toBe(MARKS.guides[0]!.name)
    expect(drawn.findAll('.sc-ref-guide')[0]!.attributes('data-state')).toBe('now')
    expect(drawn.findAll('.sc-ref-guide')[1]!.attributes('data-state')).toBe('next')
    expect(drawn.findAll('.sc-ref-out')[0]!.attributes('style')).toContain('stroke-width: 7px')
    expect(drawn.findAll('.sc-ref-out')[1]!.attributes('style')).toContain('stroke-width: 3px')
  })

  test('steps through the lengths, naming each by its units', async ({ clock }) => {
    const drawn = settled(clock)
    expect(drawn.find('output [data-at]').text()).toContain(`${MARKS.guides[LAST]!.length} units`)
    await drawn.find('.sc-ref-button').trigger('click')
    expect(drawn.find('output [data-at]').text()).toContain(`${MARKS.guides[LAST - 1]!.length} units`)
  })
})

describe('Construction, as it unfolds', () => {
  test('traces the outline with its nib and then draws each length as it unfolds', async ({ clock }) => {
    const show = onScreen()
    Object.assign(SVGElement.prototype, {
      getPointAtLength : vi.fn<() => { x: number, y: number }>(() => ({ x: 1, y: 2 })),
      getTotalLength   : vi.fn<() => number>(() => 100)
    })
    const drawn = mount(Construction, { attachTo: document.body })
    await show()
    await flushPromises()
    expect(drawn.find('.sc-ref-stack > [data-at] h4').text()).toBe('The outline')
    expect(drawn.find('.sc-ref-figure > b').text()).toBe('0')
    expect(drawn.findAll('.sc-ref-guide').every(guide => guide.attributes('data-state') === 'next')).toBe(true)
    clock.advanceTimersByTime(2900)
    await flushPromises()
    expect(drawn.find('.sc-ref-stack > [data-at] h4').text()).toBe(MARKS.guides[0]!.name)
    clock.advanceTimersByTime(12_000)
    await flushPromises()
    expect(drawn.findAll('.sc-ref-guide').at(-1)!.attributes('data-state')).toBe('now')
    drawn.unmount()
  })
})
