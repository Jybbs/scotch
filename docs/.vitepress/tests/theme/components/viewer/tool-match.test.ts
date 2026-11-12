// @vitest-environment happy-dom
import { enableAutoUnmount, flushPromises }    from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { shallowRef }                          from 'vue'

import { EXAMPLES }    from '../../../../lib/viewer/examples.ts'
import { Matcher }     from '../../../../lib/viewer/matcher.ts'
import { oneApart }    from '../../../common/matches.ts'
import { mountedTool } from '../../../common/tool.ts'

vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: shallowRef({ stats: [{ label: 'Games', value: '435,321' }] }) })
}))

const length = EXAMPLES.match.span!.length

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.replaceChildren()
})

describe('Tool matching a pasted game', () => {
  it('loads the match the game makes and steps to another of the tied games from the tally', async () => {
    const tied        = [{ ...EXAMPLES.match, ties: 1 }, { ...oneApart(), ties: 1 }]
    const submitted   = vi.spyOn(Matcher.prototype, 'submit').mockResolvedValue({ matches: tied })
    const { wrapper } = mountedTool()
    const field       = wrapper.find('.sc-viewer-pgn-field')
    await field.setValue('1. Nf3 *')
    await field.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(submitted).toHaveBeenCalledWith('the pasted game', '1. Nf3 *')
    expect([wrapper.find('.sc-viewer-source').text(), wrapper.find('.sc-viewer-count').text()])
      .toEqual(['the pasted game', String(length)])
    await wrapper.find('.sc-viewer-rank-chip').trigger('click')
    await flushPromises()
    expect([wrapper.find('.sc-viewer-source').text(), wrapper.find('.sc-viewer-count').text()])
      .toEqual(['the pasted game', '2'])
  })

  it('names the problem a pasted game carries under the intake', async () => {
    vi.spyOn(Matcher.prototype, 'submit').mockResolvedValue({ problem: 'Found no game in the pasted game' })
    const { wrapper } = mountedTool()
    const field       = wrapper.find('.sc-viewer-pgn-field')
    await field.setValue('nothing')
    await field.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('.sc-viewer-problem').text()).toBe('Found no game in the pasted game')
  })
})
