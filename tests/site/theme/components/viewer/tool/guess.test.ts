// @vitest-environment happy-dom
import { type VueWrapper, flushPromises } from '@vue/test-utils'
import { describe, expect, vi }           from 'vitest'
import { shallowRef }                     from 'vue'

import { test }                                     from '../../../../common/clock.ts'
import { pressed }                                  from '../../../../common/keys.ts'
import * as matches                                 from '../../../../common/matches.ts'
import { clearAfterEach, mountedTool, said, typed } from '../../../../common/tool.ts'

vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: shallowRef({ stats: [{ label: 'Games', value: '435,321' }] }) })
}))

clearAfterEach()

/**
 * Presses or releases the pointer on a square of the stored board as it faces
 * White, or right of the board for a negative square, the board's own units
 * standing in for the page's.
 */
function point(wrapper: VueWrapper, square: number, type: 'pointerdown' | 'pointerup'): void {
  const board  = wrapper.find('figure[data-game="stored"] svg').element
  const [x, y] = square < 0 ? [400, 20] : [(square % 8) * 45 + 20, (7 - (square >> 3)) * 45 + 20]
  board.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1 }))
}

describe('Tool taking a move made on the stored board', () => {
  test('names the stored move beside a dragged one that differs', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await flushPromises()
    point(wrapper, 61, 'pointerdown')
    point(wrapper, 34, 'pointerup')
    await flushPromises()
    expect(said(wrapper)[0]).toBe('4...Bb4 · you offered Bf8-c5')
    expect(said(wrapper)[2]).toBe('0 of 1 offered match')
    clock.advanceTimersByTime(5000)
  })

  test('outlines a piece tapped on the stored board until a second tap lets it go', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    const mark              = (): boolean => wrapper.find('[data-picked]').exists()
    await pressed(root, 'c')
    await flushPromises()
    point(wrapper, 61, 'pointerdown')
    point(wrapper, 61, 'pointerup')
    await flushPromises()
    expect(mark()).toBe(true)
    point(wrapper, 61, 'pointerdown')
    await flushPromises()
    expect(mark()).toBe(false)
    clock.advanceTimersByTime(5000)
  })

  test('offers nothing for a press right of the board and a release on it', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await flushPromises()
    point(wrapper, -1, 'pointerdown')
    point(wrapper, 34, 'pointerup')
    await flushPromises()
    expect([wrapper.find('[data-picked]').exists(), said(wrapper)[2]])
      .toEqual([false, '0 of 0 offered match'])
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool stepping on with a piece picked', () => {
  test('lets a picked piece go once the cursor steps on', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await flushPromises()
    point(wrapper, 61, 'pointerdown')
    point(wrapper, 61, 'pointerup')
    await flushPromises()
    await pressed(root, 'ArrowRight')
    await flushPromises()
    expect(wrapper.find('[data-picked]').exists()).toBe(false)
    point(wrapper, 34, 'pointerdown')
    point(wrapper, 34, 'pointerup')
    await flushPromises()
    expect(said(wrapper)[2]).toBe('0 of 0 offered match')
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool taking a move while covered at the edges of the stored game', () => {
  test('clears the field once it takes a move, keeping text it cannot take', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    const input             = wrapper.find('#sc-viewer-guess-field').element as HTMLInputElement
    const field             = (): string => input.value
    await pressed(root, 'c')
    await typed(wrapper, 'hello')
    const kept = field()
    await typed(wrapper, 'Bb4')
    expect([kept, field()]).toEqual(['hello', ''])
    clock.advanceTimersByTime(5000)
  })

  test('marks text that is no move in SAN and stays at the cursor', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await typed(wrapper, 'hello')
    expect([wrapper.find('#sc-viewer-guess-field').attributes('aria-invalid'), said(wrapper)[2]])
      .toEqual(['true', 'Not a move in SAN'])
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe(String(matches.meet))
    clock.advanceTimersByTime(5000)
  })

  test('counts no offer for a move stepped past and says nothing of it', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await pressed(root, 'ArrowRight')
    await flushPromises()
    expect(said(wrapper)[0]).toBe('Same position · 2 of 36')
    expect(said(wrapper)[2]).toBe('0 of 0 offered match')
    clock.advanceTimersByTime(5000)
  })

  test('takes no move where the stored game plays none from the cursor', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await pressed(root, 'ArrowDown')
    await flushPromises()
    expect(wrapper.find('#sc-viewer-guess-field').attributes('disabled')).toBeDefined()
    expect(wrapper.find('figure[data-game="stored"] svg').attributes('data-taking')).toBeUndefined()
    clock.advanceTimersByTime(5000)
  })
})
