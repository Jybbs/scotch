// @vitest-environment happy-dom
import { flushPromises }        from '@vue/test-utils'
import { describe, expect, vi } from 'vitest'
import { shallowRef }           from 'vue'

import { EXAMPLES }     from '../../../../../../docs/.vitepress/lib/viewer/examples.ts'
import { Matcher }      from '../../../../../../docs/.vitepress/lib/viewer/matcher.ts'
import { pressed }      from '../../../../common/keys.ts'
import * as matches     from '../../../../common/matches.ts'
import { reduceMotion } from '../../../../common/motion.ts'
import { test }         from '../../../../common/tool.ts'

vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: shallowRef({ stats: [{ label: 'Games', value: '435,321' }] }) })
}))

const stored = EXAMPLES.match.stored!

describe('Tool as a reader moves through it', () => {
  test('moves the cursor to a move pressed in the sheets and to a control pressed', async ({ tool }) => {
    const { wrapper } = tool()
    await wrapper.findAll('button[data-party][data-party="submitted"]')[19]!.trigger('click')
    expect(wrapper.find('p:has(> button[title])').text())
      .toBe(`Same position · ${20 - matches.meet + 1} of ${matches.shared}`)
    await wrapper.find('[data-control="end"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow'))
      .toBe(String(EXAMPLES.match.submitted.moves.length))
  })

  test('turns the boards from the flip, boards and track drawn from Black’s side', async ({ tool }) => {
    const { wrapper } = tool()
    await wrapper.find('[data-control="flip"]').trigger('click')
    await flushPromises()
    const king = wrapper.find('figure[data-game="submitted"] [data-piece="K"]').element
    expect(wrapper.find('[data-control="flip"]').attributes('aria-pressed')).toBe('true')
    expect(king.getAttribute('transform')).toMatch(/^matrix\(1 0 0 1 \d+ 0\)$/u)
  })

  test('marks the root as matched or not with each example loaded', async ({ tool }) => {
    const { root, wrapper } = tool()
    const [match, alone]    = wrapper.findAll('[aria-label="Examples"] button')
    await alone!.trigger('click')
    await flushPromises()
    expect(root.dataset.matched).toBe('no')
    await match!.trigger('click')
    await flushPromises()
    expect(root.dataset.matched).toBe('yes')
  })

  test('steps with no motion for a reader who prefers reduced motion', async ({ tool }) => {
    reduceMotion()
    const { root } = tool()
    await pressed(root, 'ArrowRight')
    expect(root.style.getPropertyValue('--sc-viewer-step')).toBe('0ms')
  })
})

describe('Tool showing the squares the boards differ on', () => {
  test('washes the squares once the games part while their count holds the pointer', async ({
    clock, tool
  }) => {
    const { wrapper } = tool()
    const count       = wrapper.find('p > button[title]').element as HTMLButtonElement
    const washed      = (): number => wrapper.findAll('rect[data-differ]').length
    expect(count.hidden).toBe(true)
    await wrapper.find('[data-control="part"]').trigger('click')
    await wrapper.find('[data-control="next"]').trigger('click')
    await flushPromises()
    expect([wrapper.find('p:has(> button[title])').text(), count.hidden])
      .toEqual([`Parted at ply ${matches.meet + matches.shared} · 4 squares differ`, false])
    count.dispatchEvent(new PointerEvent('pointerenter'))
    await flushPromises()
    clock.advanceTimersByTime(10)
    expect(washed()).toBe(8)
    count.dispatchEvent(new PointerEvent('pointerleave'))
    await flushPromises()
    clock.advanceTimersByTime(10)
    expect(washed()).toBe(0)
  })

  test('moves the wash with each step while the count holds focus', async ({ clock, tool }) => {
    const { root, wrapper } = tool()
    const washed            = (): number => wrapper.findAll('[data-game="submitted"] [data-differ]').length
    await wrapper.findAll('button[data-party][data-party="submitted"]')[stored.moves.length]!.trigger('click')
    await flushPromises()
    clock.advanceTimersByTime(5000)
    const count = wrapper.find('p > button[title]')
    await count.trigger('focus')
    clock.advanceTimersByTime(10)
    expect(washed()).toBe(0)
    await pressed(root, 'ArrowLeft')
    clock.advanceTimersByTime(5000)
    expect([washed(), count.text()]).toEqual([19, '19 squares differ'])
    await count.trigger('blur')
    clock.advanceTimersByTime(10)
    expect(wrapper.findAll('rect[data-differ]')).toHaveLength(0)
  })
})

describe('Tool matching a pasted game', () => {
  test('loads the match the game makes and steps to another of the tied games from the tally', async ({
    tool
  }) => {
    const tied        = [{ ...EXAMPLES.match, ties: 1 }, { ...matches.oneApart(), ties: 1 }]
    const submitted   = vi.spyOn(Matcher.prototype, 'submit')
      .mockResolvedValue({ matches: matches.answered(...tied) })
    const { wrapper } = tool()
    const field       = wrapper.find('textarea[placeholder]')
    await field.setValue('1. Nf3 *')
    await field.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(submitted).toHaveBeenCalledWith('the pasted game', '1. Nf3 *')
    expect([wrapper.find('[aria-label="The two games"] > span').text(), wrapper.find('b').text()])
      .toEqual(['the pasted game', String(matches.shared)])
    await wrapper.find('button[aria-pressed][title]:not([data-control])').trigger('click')
    await flushPromises()
    expect([wrapper.find('[aria-label="The two games"] > span').text(), wrapper.find('b').text()])
      .toEqual(['the pasted game', '2'])
  })

  test('names the problem a pasted game carries under the intake', async ({ tool }) => {
    vi.spyOn(Matcher.prototype, 'submit').mockResolvedValue({ problem: 'Found no game in the pasted game' })
    const { wrapper } = tool()
    const field       = wrapper.find('textarea[placeholder]')
    await field.setValue('nothing')
    await field.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toBe('Found no game in the pasted game')
  })
})
