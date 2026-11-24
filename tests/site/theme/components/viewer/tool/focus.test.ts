// @vitest-environment happy-dom
import { type VueWrapper, flushPromises } from '@vue/test-utils'
import { describe, expect, vi }           from 'vitest'
import { shallowRef }                     from 'vue'

import { EXAMPLES }                    from '../../../../../../docs/.vitepress/lib/viewer/examples.ts'
import { Matcher }                     from '../../../../../../docs/.vitepress/lib/viewer/matcher.ts'
import { test }                        from '../../../../common/clock.ts'
import { pressed }                     from '../../../../common/keys.ts'
import * as matches                    from '../../../../common/matches.ts'
import { clearAfterEach, mountedTool } from '../../../../common/tool.ts'

vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: shallowRef({ stats: [{ label: 'Games', value: '435,321' }] }) })
}))

const last = EXAMPLES.match.submitted.moves.length

clearAfterEach()

/**
 * Reads the element the next key reaches, the body where the focused one is
 * disabled, hidden, inert, or removed, as a browser leaves such an element
 * unfocused.
 */
function focused(): Element {
  const active = document.activeElement!
  return !active.isConnected || active.closest(':disabled, [hidden], [inert]') ? document.body : active
}

/**
 * Focuses the element `selector` names and presses it.
 */
async function taken(wrapper: VueWrapper, selector: string): Promise<void> {
  const control = wrapper.get<HTMLElement>(selector)
  control.element.focus()
  await control.trigger('click')
  await flushPromises()
}

describe('Tool losing the control a reader focused', () => {
  test.for([
    ['start', 'ArrowRight', 1],
    ['meet', 'ArrowRight', matches.meet + 1],
    ['end', 'ArrowLeft', last - 1]
  ] as const)('steps on once %s goes nowhere', async ([control, key, at], { clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'p')
    await taken(wrapper, `[data-control="${control}"]`)
    expect(await pressed(focused(), key)).toBe(true)
    expect(wrapper.get('[role="slider"]').attributes('aria-valuenow')).toBe(String(at))
    clock.advanceTimersByTime(5000)
  })

  test('steps on once no square differs', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'p')
    await pressed(root, 'ArrowRight')
    wrapper.get<HTMLElement>('p > button[title]').element.focus()
    await pressed(focused(), 'ArrowLeft')
    expect(await pressed(focused(), 'ArrowLeft')).toBe(true)
    expect(wrapper.get('[role="slider"]').attributes('aria-valuenow')).toBe(String(matches.last - 1))
    clock.advanceTimersByTime(5000)
  })

  test.for([
    ['takes no move', 'ArrowLeft'],
    ['is put away with the cover', 'c']
  ] as const)('steps on once the field taking a move %s', async ([, key], { clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await pressed(root, 'ArrowRight')
    wrapper.get<HTMLElement>('#sc-viewer-guess-field').element.focus()
    await pressed(root, key)
    expect(await pressed(focused(), 'End')).toBe(true)
    expect(wrapper.get('[role="slider"]').attributes('aria-valuenow')).toBe(String(last))
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool drawing again the control a reader focused', () => {
  test('steps on once the tally draws another tied game in place of the one pressed', async ({ clock }) => {
    const other = matches.oneApart()
    vi.spyOn(Matcher.prototype, 'submit').mockResolvedValue({
      matches: matches.answered({ ...EXAMPLES.match, ties: 1 }, { ...other, ties: 1 })
    })
    const { wrapper } = mountedTool()
    const field       = wrapper.find('textarea[placeholder]')
    await field.setValue('1. Nf3 *')
    await field.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await taken(wrapper, 'button[aria-pressed][title]:not([data-control])')
    expect(await pressed(focused(), 'End')).toBe(true)
    expect(wrapper.get('[role="slider"]').attributes('aria-valuenow'))
      .toBe(String(other.submitted.moves.length))
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool keeping the control a reader focused', () => {
  test('leaves focus on a control that still steps', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'p')
    await taken(wrapper, '[data-control="next"]')
    expect(document.activeElement).toBe(wrapper.get('[data-control="next"]').element)
    clock.advanceTimersByTime(5000)
  })
})
