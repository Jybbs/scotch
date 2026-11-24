// @vitest-environment happy-dom
import { type VueWrapper, flushPromises } from '@vue/test-utils'
import { describe, expect, vi }           from 'vitest'
import { shallowRef }                     from 'vue'

import { pressed }                                  from '../../../../common/keys.ts'
import * as matches                                 from '../../../../common/matches.ts'
import { said, test as base, typed } from '../../../../common/tool.ts'

vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: shallowRef({ stats: [{ label: 'Games', value: '435,321' }] }) })
}))

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

/**
 * Extends the Viewer's `test` with a `covered` fixture, the Viewer mounted and
 * the stored game covered.
 */
const test = base.extend('covered', async ({ tool }) => {
  const mounted = tool()
  await pressed(mounted.root, 'c')
  await flushPromises()
  return mounted
})

describe('Tool taking a move made on the stored board', () => {
  test('names the stored move beside a dragged one that differs', async ({ covered }) => {
    const { wrapper } = covered
    point(wrapper, 61, 'pointerdown')
    point(wrapper, 34, 'pointerup')
    await flushPromises()
    expect(said(wrapper)[0]).toBe('4...Bb4 · you offered Bf8-c5')
    expect(said(wrapper)[2]).toBe('0 of 1 offered match')
  })

  test('outlines a piece tapped on the stored board until a second tap lets it go', async ({ covered }) => {
    const { wrapper } = covered
    const mark              = (): boolean => wrapper.find('[data-picked]').exists()
    point(wrapper, 61, 'pointerdown')
    point(wrapper, 61, 'pointerup')
    await flushPromises()
    expect(mark()).toBe(true)
    point(wrapper, 61, 'pointerdown')
    await flushPromises()
    expect(mark()).toBe(false)
  })

  test('offers nothing for a press right of the board and a release on it', async ({ covered }) => {
    const { wrapper } = covered
    point(wrapper, -1, 'pointerdown')
    point(wrapper, 34, 'pointerup')
    await flushPromises()
    expect([wrapper.find('[data-picked]').exists(), said(wrapper)[2]])
      .toEqual([false, '0 of 0 offered match'])
  })
})

describe('Tool stepping on with a piece picked', () => {
  test('lets a picked piece go once the cursor steps on', async ({ covered }) => {
    const { root, wrapper } = covered
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
  })
})

describe('Tool taking a move while covered at the edges of the stored game', () => {
  test('clears the field once it takes a move, keeping text it cannot take', async ({ covered }) => {
    const { wrapper } = covered
    const input             = wrapper.find('#sc-viewer-guess-field').element as HTMLInputElement
    const field             = (): string => input.value
    await typed(wrapper, 'hello')
    const kept = field()
    await typed(wrapper, 'Bb4')
    expect([kept, field()]).toEqual(['hello', ''])
  })

  test('marks text that is no move in SAN and stays at the cursor', async ({ covered }) => {
    const { wrapper } = covered
    await typed(wrapper, 'hello')
    expect([wrapper.find('#sc-viewer-guess-field').attributes('aria-invalid'), said(wrapper)[2]])
      .toEqual(['true', 'Not a move in SAN'])
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe(String(matches.meet))
  })

  test('counts no offer for a move stepped past and says nothing of it', async ({ covered }) => {
    const { root, wrapper } = covered
    await pressed(root, 'ArrowRight')
    await flushPromises()
    expect(said(wrapper)[0]).toBe('Same position · 2 of 36')
    expect(said(wrapper)[2]).toBe('0 of 0 offered match')
  })

  test('takes no move where the stored game plays none from the cursor', async ({ covered }) => {
    const { root, wrapper } = covered
    await pressed(root, 'ArrowDown')
    await flushPromises()
    expect(wrapper.find('#sc-viewer-guess-field').attributes('disabled')).toBeDefined()
    expect(wrapper.find('figure[data-game="stored"] svg').attributes('data-taking')).toBeUndefined()
  })
})
