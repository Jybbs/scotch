// @vitest-environment happy-dom
import { type VueWrapper, flushPromises } from '@vue/test-utils'
import { describe, expect, vi }           from 'vitest'
import { shallowRef }                     from 'vue'

import { EXAMPLES } from '../../../../../../docs/.vitepress/lib/viewer/examples.ts'
import { test }     from '../../../../common/clock.ts'
import { pressed }  from '../../../../common/keys.ts'
import * as matches from '../../../../common/matches.ts'
import { clearAfterEach, mountedTool, said, typed } from '../../../../common/tool.ts'

vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: shallowRef({ stats: [{ label: 'Games', value: '435,321' }] }) })
}))

const parting = matches.loaded.parting!
const stored  = EXAMPLES.match.stored!

clearAfterEach()

/**
 * Reads, at the last position the two games share, whether the live region
 * names the stored game's next move, how many boards draw each game's arrow,
 * and the band's stored move as a reader hears it and as it is marked.
 */
function parted(wrapper: VueWrapper): unknown[] {
  const named = wrapper.get('[aria-label="The match and your game"] p + p [data-game="stored"]')
  const drawn = (party: string): number =>
    wrapper.findAll(`svg g[data-game="${party}"][data-on]`).length
  return [
    said(wrapper)[1]!.includes(`the stored game played ${parting} next`),
    drawn('stored'),
    drawn('submitted'),
    named.find('.sr-only').exists() ? named.get('.sr-only').text() : named.text(),
    named.find('[aria-hidden="true"]').exists(),
    named.attributes('data-covered')
  ]
}

describe('Tool covering the stored game', () => {
  test('covers the stored moves past the cursor on C, the entry kept in place, then shows them', async ({
    clock
  }) => {
    const { root, wrapper } = mountedTool()
    const covered           = (): number => wrapper.findAll('button[data-party][data-covered]').length
    const entry             = wrapper.find('form').element as HTMLFormElement
    expect([covered(), entry.inert]).toEqual([0, true])
    expect(await pressed(root, 'c')).toBe(true)
    await flushPromises()
    expect([covered(), entry.inert, wrapper.find('[data-control="cover"]').attributes('aria-pressed')])
      .toEqual([stored.moves.length - matches.meet, false, 'true'])
    expect(wrapper.find('button[data-party][data-covered]').attributes('aria-label')).toBe('A covered move')
    expect(wrapper.find('[aria-label="The match and your game"] p + p [data-covered]').exists()).toBe(true)
    await pressed(root, 'C')
    await flushPromises()
    const marked = wrapper.find('[aria-label="The match and your game"] p + p [data-covered]')
    expect([covered(), entry.inert, marked.exists()]).toEqual([0, true, false])
    clock.advanceTimersByTime(5000)
  })

  test('covers the stored game from the control and writes it into the address', async ({ clock }) => {
    const { wrapper } = mountedTool()
    await wrapper.find('[data-control="cover"]').trigger('click')
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe(`#sample=match&ply=${matches.meet}&cover=1`)
  })

  test('opens covered from a link that carries the cover', async ({ clock }) => {
    history.replaceState(null, '', `#sample=match&ply=${matches.meet}&cover=1`)
    const { wrapper } = mountedTool()
    await flushPromises()
    expect(wrapper.find('[data-control="cover"]').attributes('aria-pressed')).toBe('true')
    clock.advanceTimersByTime(5000)
  })

  test('takes no cover from the control or its key where no game is stored', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await wrapper.findAll('[aria-label="Examples"] button')[1]!.trigger('click')
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
    history.replaceState(null, '', `#sample=match&ply=${matches.last}&cover=1`)
    const { wrapper } = mountedTool()
    await flushPromises()
    clock.advanceTimersByTime(5000)
    expect(parted(wrapper)).toEqual([false, 0, 2, 'A covered move', true, ''])
  })

  test('names the stored game’s next move again once the cover lifts', async ({ clock }) => {
    history.replaceState(null, '', `#sample=match&ply=${matches.last}&cover=1`)
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
    await wrapper.findAll('[aria-label="Examples"] button')[0]!.trigger('click')
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
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe(String(matches.meet + 1))
    clock.advanceTimersByTime(5000)
  })
})
