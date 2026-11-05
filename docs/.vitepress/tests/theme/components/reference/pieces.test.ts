// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, vi } from 'vitest'

import * as lib     from '../../../../lib/reference/pieces.ts'
import { Pieces }   from '../../../../theme/components/reference/pieces.ts'
import { test }     from '../../../common/clock.ts'
import { reduceMotion } from '../../../common/motion.ts'
import { onScreen } from '../../../common/unfold.ts'

function settled(clock: typeof vi): ReturnType<typeof mount> {
  onScreen()
  reduceMotion()
  const drawn = mount(Pieces)
  clock.runAllTimers()
  return drawn
}

function lit(drawn: ReturnType<typeof mount>): number {
  return drawn.findAll('.sc-ref-tile[data-lit]').length
}

describe('Pieces', () => {
  test('stands the white queen on d4 and lights what she reaches', ({ clock }) => {
    const drawn = settled(clock)
    expect(drawn.find('h4').text()).toBe('White queen')
    expect(drawn.find('.sc-ref-specimen p').text()).toBe('27 squares from d4 on an empty board')
    expect(lit(drawn)).toBe(27)
    expect(drawn.find('.sc-ref-stander').attributes('style')).toContain('translate(300%, 400%)')
  })

  test('sets a tray of every piece and stands the piece a reader picks on its home', async ({ clock }) => {
    const drawn = settled(clock)
    const tray  = drawn.findAll('.sc-ref-tray button')
    expect(tray.length).toBe(lib.TYPES.length)
    await tray[lib.TYPES.indexOf('p')]!.trigger('click')
    expect(drawn.find('h4').text()).toBe('Black pawn')
    expect(drawn.find('.sc-ref-specimen p').text()).toBe('2 squares from d7 on an empty board')
    expect(tray[lib.TYPES.indexOf('p')]!.attributes('aria-pressed')).toBe('true')
  })

  test('stands the piece on the square a reader presses', async ({ clock }) => {
    const drawn = settled(clock)
    const board = drawn.find('.sc-ref-board')
    vi.spyOn(board.element, 'getBoundingClientRect').mockReturnValue({ height: 800, left: 0, top: 0, width: 800 } as DOMRect)
    await board.trigger('click', { clientX: 50, clientY: 750 })
    expect(drawn.find('.sc-ref-specimen p').text()).toContain('from a1')
    await board.trigger('click', { clientX: 900, clientY: -10 })
    expect(drawn.find('.sc-ref-specimen p').text()).toContain('from h8')
  })
})

describe('Pieces, moved by a reader', () => {
  test('walks the piece under the arrow keys, held on the board', async ({ clock }) => {
    const drawn = settled(clock)
    const board = drawn.find('.sc-ref-board')
    await board.trigger('keydown', { key: 'ArrowUp' })
    expect(drawn.find('.sc-ref-specimen p').text()).toContain('from d5')
    await board.trigger('keydown', { key: 'ArrowRight' })
    expect(drawn.find('.sc-ref-specimen p').text()).toContain('from e5')
    await Promise.all(Array.from({ length: 9 }, () => board.trigger('keydown', { key: 'ArrowLeft' })))
    expect(drawn.find('.sc-ref-specimen p').text()).toContain('from a5')
    await board.trigger('keydown', { key: 'a' })
    expect(drawn.find('.sc-ref-specimen p').text()).toContain('from a5')
  })

  test('delays each lit square by how far it stands from the piece', ({ clock }) => {
    const drawn = settled(clock)
    const tile  = drawn.findAll('.sc-ref-tile')
    expect(tile[27 + 1]!.attributes('style')).toContain('--sc-ref-lag: 55ms')
    expect(tile[0]!.attributes('style')).toContain('--sc-ref-lag: 165ms')
    expect(tile[1]!.attributes('style')).toContain('--sc-ref-lag: 0ms')
  })

  test('walks through a piece of each kind as it unfolds and closes on the queen', async ({ clock }) => {
    const show  = onScreen()
    const drawn = mount(Pieces)
    await show()
    await flushPromises()
    clock.advanceTimersByTime(300 + 1650 + 100)
    await flushPromises()
    expect(drawn.find('h4').text()).toBe('White knight')
    clock.advanceTimersByTime(800)
    await flushPromises()
    expect(drawn.find('.sc-ref-specimen p').text()).toContain('from c6')
    clock.advanceTimersByTime(11_000)
    await flushPromises()
    expect(drawn.find('h4').text()).toBe('White queen')
  })
})
