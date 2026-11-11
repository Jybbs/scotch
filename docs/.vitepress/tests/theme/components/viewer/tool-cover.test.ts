// @vitest-environment happy-dom
import { type VueWrapper, enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, vi }                   from 'vitest'
import { shallowRef }                                        from 'vue'

import { EXAMPLES }    from '../../../../lib/viewer/examples.ts'
import { Loaded }      from '../../../../lib/viewer/loaded.ts'
import { test }        from '../../../common/clock.ts'
import { pressed }     from '../../../common/keys.ts'
import { last, meet }  from '../../../common/matches.ts'
import { mountedTool } from '../../../common/tool.ts'

vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: shallowRef({ stats: [{ label: 'Games', value: '435,321' }] }) })
}))

const parting = new Loaded(EXAMPLES.match).parting!
const stored  = EXAMPLES.match.stored!

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.replaceChildren()
  history.replaceState(null, '', location.pathname)
})

/**
 * Reads, at the last position the two games share, whether the live region
 * names the stored game's next move, how many boards draw each game's arrow,
 * and the band's stored move as a reader hears it and as it is marked.
 */
function parted(wrapper: VueWrapper): unknown[] {
  const named = wrapper.get('.sc-viewer-details [data-game="stored"]')
  const drawn = (party: string): number =>
    wrapper.findAll(`.sc-viewer-arrow[data-game="${party}"][data-on]`).length
  return [
    said(wrapper)[1]!.includes(`the stored game played ${parting} next`),
    drawn('stored'),
    drawn('submitted'),
    named.find('.sc-viewer-hidden').exists() ? named.get('.sc-viewer-hidden').text() : named.text(),
    named.find('[aria-hidden="true"]').exists(),
    named.attributes('data-covered')
  ]
}

/**
 * Presses or releases the pointer on a square of the stored board as it faces
 * White, or right of the board for a negative square, the board's own units
 * standing in for the page's.
 */
function point(wrapper: VueWrapper, square: number, type: 'pointerdown' | 'pointerup'): void {
  const board  = wrapper.find('[data-game="stored"] .sc-viewer-board').element
  const [x, y] = square < 0 ? [400, 20] : [(square % 8) * 45 + 20, (7 - (square >> 3)) * 45 + 20]
  board.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1 }))
}

/**
 * Types text into the field taking a move and offers it.
 */
async function typed(wrapper: VueWrapper, text: string): Promise<void> {
  await wrapper.find('.sc-viewer-guess-field').setValue(text)
  await wrapper.find('.sc-viewer-guess').trigger('submit')
  await flushPromises()
}

/**
 * Reads the status line, the line the live region reads, and the count of the
 * moves offered that match.
 */
function said(wrapper: VueWrapper): string[] {
  return ['.sc-viewer-status', 'p[aria-live]', '.sc-viewer-guess-note'].map(name => wrapper.get(name).text())
}

describe('Tool covering the stored game', () => {
  test('covers the stored moves past the cursor on C, the entry kept in place, then shows them', async ({
    clock
  }) => {
    const { root, wrapper } = mountedTool()
    const covered           = (): number => wrapper.findAll('.sc-viewer-move[data-covered]').length
    const entry             = wrapper.find('.sc-viewer-guess').element as HTMLFormElement
    expect([covered(), entry.inert]).toEqual([0, true])
    expect(await pressed(root, 'c')).toBe(true)
    await flushPromises()
    expect([covered(), entry.inert, wrapper.find('[data-control="cover"]').attributes('aria-pressed')])
      .toEqual([stored.moves.length - meet, false, 'true'])
    expect(wrapper.find('.sc-viewer-move[data-covered]').attributes('aria-label')).toBe('A covered move')
    expect(wrapper.find('.sc-viewer-details [data-covered]').exists()).toBe(true)
    await pressed(root, 'C')
    await flushPromises()
    expect([covered(), entry.inert, wrapper.find('.sc-viewer-details [data-covered]').exists()])
      .toEqual([0, true, false])
    clock.advanceTimersByTime(5000)
  })

  test('covers the stored game from the control and writes it into the address', async ({ clock }) => {
    const { wrapper } = mountedTool()
    await wrapper.find('[data-control="cover"]').trigger('click')
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe(`#sample=match&ply=${meet}&cover=1`)
  })

  test('opens covered from a link that carries the cover', async ({ clock }) => {
    history.replaceState(null, '', `#sample=match&ply=${meet}&cover=1`)
    const { wrapper } = mountedTool()
    await flushPromises()
    expect(wrapper.find('[data-control="cover"]').attributes('aria-pressed')).toBe('true')
    clock.advanceTimersByTime(5000)
  })

  test('takes no cover from the control or its key where no game is stored', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await wrapper.findAll('.sc-viewer-examples button')[1]!.trigger('click')
    await pressed(root, 'c')
    await flushPromises()
    const control = wrapper.find('[data-control="cover"]')
    expect([control.attributes('disabled'), control.attributes('aria-pressed')]).toEqual(['', 'false'])
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool covering where the two games part', () => {
  test('leaves the stored game’s next move out of the status, the boards, and the band', async ({
    clock
  }) => {
    history.replaceState(null, '', `#sample=match&ply=${last}&cover=1`)
    const { wrapper } = mountedTool()
    await flushPromises()
    clock.advanceTimersByTime(5000)
    expect(parted(wrapper)).toEqual([false, 0, 2, 'A covered move', true, ''])
  })

  test('names the stored game’s next move again once the cover lifts', async ({ clock }) => {
    history.replaceState(null, '', `#sample=match&ply=${last}&cover=1`)
    const { root, wrapper } = mountedTool()
    await flushPromises()
    await pressed(root, 'C')
    await flushPromises()
    clock.advanceTimersByTime(5000)
    expect(parted(wrapper)).toEqual([true, 2, 2, parting, false, undefined])
  })

  test('clears the moves offered once a match loads while covered', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await typed(wrapper, 'Bb4')
    await wrapper.findAll('.sc-viewer-examples button')[0]!.trigger('click')
    await flushPromises()
    expect([said(wrapper)[2], wrapper.find('[data-control="cover"]').attributes('aria-pressed')])
      .toEqual(['0 of 0 offered match', 'true'])
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool taking a move while covered', () => {
  test('shows the stored move once a typed one is offered, naming the match and counting it', async ({
    clock
  }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await typed(wrapper, 'Bb4')
    expect(said(wrapper)).toEqual([
      '4...Bb4 · matches',
      'The stored game played 4...Bb4, matching yours. Ply 8, one position, 2 of the 36 the two share.',
      '1 of 1 offered match'
    ])
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe(String(meet + 1))
    clock.advanceTimersByTime(5000)
  })
})

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
    const mark              = (): boolean => wrapper.find('.sc-viewer-picked').exists()
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
    expect([wrapper.find('.sc-viewer-picked').exists(), said(wrapper)[2]])
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
    expect(wrapper.find('.sc-viewer-picked').exists()).toBe(false)
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
    const input             = wrapper.find('.sc-viewer-guess-field').element as HTMLInputElement
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
    expect([wrapper.find('.sc-viewer-guess-field').attributes('aria-invalid'), said(wrapper)[2]])
      .toEqual(['true', 'Not a move in SAN'])
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe(String(meet))
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
    expect(wrapper.find('.sc-viewer-guess-field').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-game="stored"] .sc-viewer-board').attributes('data-taking')).toBeUndefined()
    clock.advanceTimersByTime(5000)
  })
})
