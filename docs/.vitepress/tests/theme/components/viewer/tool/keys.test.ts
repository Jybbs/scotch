// @vitest-environment happy-dom
import { describe, expect, vi } from 'vitest'
import { shallowRef }           from 'vue'

import { EXAMPLES }                    from '../../../../../lib/viewer/examples.ts'
import { test }                        from '../../../../common/clock.ts'
import { pressed }                     from '../../../../common/keys.ts'
import * as matches                    from '../../../../common/matches.ts'
import { clearAfterEach, mountedTool } from '../../../../common/tool.ts'

vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: shallowRef({ stats: [{ label: 'Games', value: '435,321' }] }) })
}))

const stored = EXAMPLES.match.stored!

clearAfterEach()

describe('Tool as a reader steps it', () => {
  test('steps on the controls’ keys, marking whether the boards share a position', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    expect(await pressed(root, 'ArrowRight')).toBe(true)
    expect(wrapper.find('p:has(> button[title])').text()).toBe(`Same position · 2 of ${matches.shared}`)
    expect(root.style.getPropertyValue('--sc-viewer-step')).not.toBe('0ms')
    expect(await pressed(root, 'Home')).toBe(true)
    expect([wrapper.find('p:has(> button[title])').text(), root.dataset.shared])
      .toEqual([`Different · meet at ply ${matches.meet}`, 'no'])
    expect(await pressed(root, 'Home')).toBe(false)
    clock.advanceTimersByTime(5000)
  })

  test('captions each board with the start mark at the starting position and with a move after it', async () => {
    const { root, wrapper } = mountedTool()
    const captions          = (): string[] => wrapper.findAll('figcaption > span:last-child')
      .map(move => move.text())
    expect(captions().every(move => /^\d+\./u.test(move))).toBe(true)
    await pressed(root, 'Home')
    expect(captions()).toEqual(['Start', 'Start'])
    expect(wrapper.findAll('figcaption > span:last-child [data-start] svg')).toHaveLength(2)
  })

  test('turns both boards on F, pressing the flip', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'f')
    expect(wrapper.find('[data-control="flip"]').attributes('aria-pressed')).toBe('true')
    await pressed(root, 'F')
    expect(wrapper.find('[data-control="flip"]').attributes('aria-pressed')).toBe('false')
    clock.advanceTimersByTime(5000)
  })

  test.for([
    ['with a modifier held', 'ArrowRight', { metaKey: true }],
    ['that no control takes', 'x', {}]
  ] as const)('leaves a key pressed %s to the page', async ([, key, held]) => {
    const { root, wrapper } = mountedTool()
    expect(await pressed(root, key, held)).toBe(false)
    expect(wrapper.find('p:has(> button[title])').text()).toBe(`Same position · 1 of ${matches.shared}`)
  })

  test('leaves a key pressed inside a field to the field', async () => {
    const { wrapper } = mountedTool()
    expect(await pressed(wrapper.find('textarea').element, 'ArrowRight')).toBe(false)
  })
})

describe('Tool answering Up and Down', () => {
  test('goes to either end on Up and Down outside the sheets and the track', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    const slider            = wrapper.find('[role="slider"]')
    expect(await pressed(root, 'ArrowDown')).toBe(true)
    expect(slider.attributes('aria-valuenow')).toBe(String(EXAMPLES.match.submitted.moves.length))
    expect(await pressed(root, 'ArrowUp')).toBe(true)
    expect(wrapper.find('p:has(> button[title])').text()).toBe(`Different · meet at ply ${matches.meet}`)
    clock.advanceTimersByTime(5000)
  })

  test('steps one ply on Up while focus sits on the track', async ({ clock }) => {
    const { wrapper } = mountedTool()
    const slider      = wrapper.find('[role="slider"]')
    expect(await pressed(slider.element, 'ArrowUp')).toBe(true)
    expect(slider.attributes('aria-valuenow')).toBe(String(matches.meet + 1))
    clock.advanceTimersByTime(5000)
  })

  test('walks the sheets a row at a time on Up and Down, focus following', async ({ clock }) => {
    const { wrapper } = mountedTool()
    const move        = wrapper.find('[data-party="stored"][aria-current="step"]').element as HTMLElement
    move.focus()
    expect(await pressed(move, 'ArrowDown')).toBe(true)
    expect(document.activeElement?.textContent).toContain(stored.moves[matches.meet + 1])
    expect((document.activeElement as HTMLElement).dataset.party).toBe('stored')
    clock.advanceTimersByTime(5000)
  })
})
