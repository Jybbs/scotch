// @vitest-environment happy-dom
import { flushPromises }                               from '@vue/test-utils'
import { type MockInstance, describe, expect, it, vi } from 'vitest'
import { shallowRef }                                  from 'vue'

import { EXAMPLES }                    from '../../../../../lib/viewer/examples.ts'
import * as links                      from '../../../../../lib/viewer/link.ts'
import { test }                        from '../../../../common/clock.ts'
import { fileOf, picked }              from '../../../../common/files.ts'
import { pressed }                     from '../../../../common/keys.ts'
import * as matches                    from '../../../../common/matches.ts'
import { clearAfterEach, mountedTool } from '../../../../common/tool.ts'

vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: shallowRef({ stats: [{ label: 'Games', value: '435,321' }] }) })
}))

clearAfterEach()

/**
 * Waits for each call made through `spy` to settle, and for what each sets off to run.
 */
async function settled(spy: MockInstance): Promise<void> {
  await Promise.all(spy.mock.results.map(({ value }) => value))
  await flushPromises()
}

describe('Tool and the page’s address', () => {
  test('writes the example, the ply, and the side into the address once moves land', async ({ clock }) => {
    const { root } = mountedTool()
    await pressed(root, 'ArrowRight')
    expect(location.hash).toBe('')
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe(`#sample=match&ply=${matches.meet + 1}`)
    await pressed(root, 'f')
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe(`#sample=match&ply=${matches.meet + 1}&side=black`)
  })

  test('writes nothing once the Viewer leaves the page before the moves land', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'ArrowRight')
    wrapper.unmount()
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe('')
  })

  test('writes a loaded file’s match into the address once it is encoded', async ({ clock }) => {
    const encoded     = await links.encodedOf(EXAMPLES.alone)
    const encoding    = vi.spyOn(links, 'encodedOf')
    const { wrapper } = mountedTool()
    await picked(wrapper, [fileOf(JSON.stringify(EXAMPLES.alone), 'mine.json')])
    await settled(encoding)
    expect(location.hash).toBe(`#match=${encoded}&ply=0`)
    clock.advanceTimersByTime(5000)
  })

  it('writes nothing once the Viewer leaves the page before a loaded file’s match is encoded', async () => {
    const encoded = await links.encodedOf(EXAMPLES.alone)
    const held    = Promise.withResolvers<string>()
    vi.spyOn(links, 'encodedOf').mockReturnValue(held.promise)
    const { wrapper } = mountedTool()
    await picked(wrapper, [fileOf(JSON.stringify(EXAMPLES.alone), 'mine.json')])
    wrapper.unmount()
    held.resolve(encoded)
    await flushPromises()
    expect(location.hash).toBe('')
  })
})

describe('Tool opened from a link', () => {
  test('opens on the example, the ply, and the side a link carries', async ({ clock }) => {
    history.replaceState(null, '', '#sample=alone&ply=3&side=black')
    const { wrapper } = mountedTool()
    await flushPromises()
    expect(wrapper.find('p:has(> button[title])').text()).toBe('Nothing matched')
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe('3')
    expect(wrapper.find('[data-control="flip"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[aria-label="The two games"] > span').text()).toBe('demo.pgn')
    clock.advanceTimersByTime(5000)
  })

  test('opens on a match a link carries as encoded text, then writes it back as it steps', async ({ clock }) => {
    const encoded = await links.encodedOf(EXAMPLES.alone)
    history.replaceState(null, '', `#match=${encoded}&ply=5`)
    const read     = vi.spyOn(links, 'fromLink')
    const encoding = vi.spyOn(links, 'encodedOf')
    const { root, wrapper } = mountedTool()
    await settled(read)
    expect(wrapper.find('[aria-label="The two games"] > span').text()).toBe('A link')
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe('5')
    await settled(encoding)
    await pressed(root, 'ArrowRight')
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe(`#match=${encoded}&ply=6`)
  })

  it('names a link it cannot read, and clears the line once a match loads', async () => {
    history.replaceState(null, '', '#match=AAAA')
    const read        = vi.spyOn(links, 'fromLink')
    const { wrapper } = mountedTool()
    await settled(read)
    expect(wrapper.find('[role="alert"]').text()).toBe('The link holds no match, or was cut short or altered')
    await wrapper.find('[aria-label="Examples"] button').trigger('click')
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
    await wrapper.find('div:has(> [popover]) > button').trigger('click')
    await flushPromises()
    expect(written)
      .toHaveBeenCalledWith(`${location.origin}${location.pathname}#sample=match&ply=${matches.meet}`)
  })

  test('copies the submitted game as PGN, the stored game’s moves as a variation', async () => {
    const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const { wrapper } = mountedTool()
    await wrapper.findAll('div:has(> [popover]) > button')[1]!.trigger('click')
    await flushPromises()
    expect(written.mock.calls[0]![0]).toMatch(/^\[Event "The Viewer's example"\][^]+\( \{[^}]+\} /u)
  })

  test('copies a link carrying a loaded file’s match as encoded text', async ({ clock }) => {
    const encoded  = await links.encodedOf(EXAMPLES.alone)
    const copied   = Promise.withResolvers<string>()
    const encoding = vi.spyOn(links, 'encodedOf')
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(text => {
      copied.resolve(text)
      return Promise.resolve()
    })
    const { wrapper } = mountedTool()
    await picked(wrapper, [fileOf(JSON.stringify(EXAMPLES.alone), 'mine.json')])
    await wrapper.find('div:has(> [popover]) > button').trigger('click')
    expect(await copied.promise).toBe(`${location.origin}${location.pathname}#match=${encoded}&ply=0`)
    await settled(encoding)
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe(`#match=${encoded}&ply=0`)
  })
})
