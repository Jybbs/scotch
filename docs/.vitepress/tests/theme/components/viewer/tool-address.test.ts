// @vitest-environment happy-dom
import { enableAutoUnmount, flushPromises }    from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { shallowRef }                          from 'vue'

import { EXAMPLES }       from '../../../../lib/viewer/examples.ts'
import { encodedOf }      from '../../../../lib/viewer/link.ts'
import { test }           from '../../../common/clock.ts'
import { fileOf, picked } from '../../../common/files.ts'
import { pressed }        from '../../../common/keys.ts'
import { meet }           from '../../../common/matches.ts'
import { mountedTool }    from '../../../common/tool.ts'

vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: shallowRef({ stats: [{ label: 'Games', value: '435,321' }] }) })
}))

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.replaceChildren()
  history.replaceState(null, '', location.pathname)
})

describe('Tool and the page’s address', () => {
  test('writes the example, the ply, and the side into the address once moves land', async ({ clock }) => {
    const { root } = mountedTool()
    await pressed(root, 'ArrowRight')
    expect(location.hash).toBe('')
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe(`#sample=match&ply=${meet + 1}`)
    await pressed(root, 'f')
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe(`#sample=match&ply=${meet + 1}&side=black`)
  })

  test('writes nothing once the Viewer leaves the page before the moves land', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'ArrowRight')
    wrapper.unmount()
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe('')
  })
})

describe('Tool opened from a link', () => {
  test('opens on the example, the ply, and the side a link carries', async ({ clock }) => {
    history.replaceState(null, '', '#sample=alone&ply=3&side=black')
    const { wrapper } = mountedTool()
    await flushPromises()
    expect(wrapper.find('.sc-viewer-status').text()).toBe('Nothing matched')
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe('3')
    expect(wrapper.find('[data-control="flip"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('.sc-viewer-source').text()).toBe('demo.pgn')
    clock.advanceTimersByTime(5000)
  })

  it('opens on a match a link carries as encoded text, then writes it back as it steps', async () => {
    const encoded = await encodedOf(EXAMPLES.alone)
    history.replaceState(null, '', `#match=${encoded}&ply=5`)
    const { root, wrapper } = mountedTool()
    await vi.waitFor(() => {
      expect(wrapper.find('.sc-viewer-source').text()).toBe('A link')
    })
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe('5')
    await pressed(root, 'ArrowRight')
    await vi.waitFor(() => {
      expect(location.hash).toBe(`#match=${encoded}&ply=6`)
    }, { timeout: 3000 })
  })

  it('names a link it cannot read, and clears the line once a match loads', async () => {
    history.replaceState(null, '', '#match=AAAA')
    const { wrapper } = mountedTool()
    await vi.waitFor(() => {
      expect(wrapper.find('[role="alert"]').text())
        .toBe('The link holds no match, or was cut short or altered')
    })
    await wrapper.find('.sc-viewer-examples button').trigger('click')
    expect(wrapper.find('[role="alert"]').text()).toBe('')
  })

  test('names what a picked file lacks under the intake', async () => {
    const { wrapper } = mountedTool()
    await picked(wrapper, [fileOf('[]', 'list.json')])
    expect(wrapper.find('[role="alert"]').text())
      .toBe('list.json: The file holds a list rather than an object')
  })
})

describe('Tool copying the match', () => {
  test('copies a link opening on the match where it stands', async () => {
    const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const { wrapper } = mountedTool()
    await wrapper.find('.sc-viewer-seat button').trigger('click')
    await flushPromises()
    expect(written).toHaveBeenCalledWith(`${location.origin}${location.pathname}#sample=match&ply=${meet}`)
  })

  test('copies the submitted game as PGN, the stored game’s moves as a variation', async () => {
    const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const { wrapper } = mountedTool()
    await wrapper.findAll('.sc-viewer-seat button')[1]!.trigger('click')
    await flushPromises()
    expect(written.mock.calls[0]![0]).toMatch(/^\[Event "The Viewer's example"\][^]+\( \{[^}]+\} /u)
  })

  test('copies a link carrying a loaded file’s match as encoded text', async ({ clock }) => {
    const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const { wrapper } = mountedTool()
    await picked(wrapper, [fileOf(JSON.stringify(EXAMPLES.alone), 'mine.json')])
    await wrapper.find('.sc-viewer-seat button').trigger('click')
    await flushPromises()
    const encoded = await encodedOf(EXAMPLES.alone)
    expect(written).toHaveBeenCalledWith(`${location.origin}${location.pathname}#match=${encoded}&ply=0`)
    clock.advanceTimersByTime(5000)
    await flushPromises()
    expect(location.hash).toBe(`#match=${await encodedOf(EXAMPLES.alone)}&ply=0`)
  })
})
