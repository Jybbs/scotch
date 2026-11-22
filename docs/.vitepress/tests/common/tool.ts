import { type VueWrapper, enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach }                                                from 'vitest'

import { Tool } from '../../theme/components/viewer/tool.ts'

/**
 * Unmounts each Viewer a case mounts once the case ends, and clears the
 * document and the page's address it leaves behind.
 */
export function clearAfterEach(): void {
  enableAutoUnmount(afterEach)
  afterEach(() => {
    document.body.replaceChildren()
    history.replaceState(null, '', location.pathname)
  })
}

/**
 * Mounts the Viewer into the document, as its page does.
 */
export function mountedTool(): { root: HTMLElement, wrapper: ReturnType<typeof mount<typeof Tool>> } {
  const wrapper = mount(Tool, { attachTo: document.body })
  return { root: wrapper.element as HTMLElement, wrapper }
}

/**
 * Reads the status line, the line the live region reads, and the count of the
 * moves offered that match.
 */
export function said(wrapper: VueWrapper): string[] {
  return ['p:has(> button[title])', 'p[role=status]', '#sc-viewer-guess-note']
    .map(name => wrapper.get(name).text())
}

/**
 * Types text into the field taking a move and offers it.
 */
export async function typed(wrapper: VueWrapper, text: string): Promise<void> {
  await wrapper.find('#sc-viewer-guess-field').setValue(text)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}
