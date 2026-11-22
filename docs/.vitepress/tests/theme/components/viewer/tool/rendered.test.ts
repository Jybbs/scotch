// @vitest-environment happy-dom
import { flushPromises }            from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, shallowRef } from 'vue'
import { renderToString }           from 'vue/server-renderer'

import { EXAMPLES }                    from '../../../../../lib/viewer/examples.ts'
import { Tool }                        from '../../../../../theme/components/viewer/tool.ts'
import * as matches                    from '../../../../common/matches.ts'
import { clearAfterEach, mountedTool } from '../../../../common/tool.ts'

vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: shallowRef({ stats: [{ label: 'Games', value: '435,321' }] }) })
}))

const stored = EXAMPLES.match.stored!

clearAfterEach()

describe('Tool as the build renders it', () => {
  it('draws both boards, the sheets, and the band at the first position the two share', async () => {
    const html = await renderToString(createSSRApp(Tool))
    const host = Object.assign(document.createElement('div'), { innerHTML: html })
    expect(host.querySelectorAll('[data-piece]')).toHaveLength(64)
    expect([...host.querySelectorAll('[aria-current="step"] > span:first-child')]
      .map(move => move.textContent))
      .toEqual([EXAMPLES.match.submitted.moves[matches.meet - 1], stored.moves[matches.meet - 1]])
    expect(host.querySelector('b')?.textContent).toBe(String(matches.shared))
    expect(host.querySelector('p:has(> button[title])')?.textContent).toBe(`Same position · 1 of ${matches.shared}`)
    expect(host.querySelector('dl')?.textContent).toBe('Games435,321')
  })

  it('hydrates the rendered markup at that position with nothing moved', async () => {
    const html     = await renderToString(createSSRApp(Tool))
    const host     = Object.assign(document.createElement('div'), { innerHTML: html })
    const rendered = host.innerHTML
    document.body.append(host)
    createSSRApp(Tool).mount(host)
    await flushPromises()
    expect(host.innerHTML).toBe(rendered)
  })
})

describe('Tool, its legend', () => {
  it('names each game in its color in the corner, the submitted game first', async () => {
    const { wrapper } = mountedTool()
    const marks       = wrapper.findAll('[role=listitem]')
    expect(marks.map(mark => [mark.attributes('aria-label'), mark.attributes('style')])).toEqual([
      ['Your game', '--sc-data-tone: var(--sc-submitted);'],
      ['The stored game', '--sc-data-tone: var(--sc-stored);']
    ])
    await marks[1]!.trigger('pointerenter')
    expect(wrapper.find('[role=list] + p').text()).toBe('The stored game')
  })

  it('opens the line beneath the boards', () => {
    const { wrapper } = mountedTool()
    const legend      = wrapper.get('[role=list]').element.parentElement!.parentElement!
    const under       = legend.parentElement!
    expect([under.firstElementChild === legend, under.querySelector('canvas') !== null])
      .toEqual([true, true])
  })
})
