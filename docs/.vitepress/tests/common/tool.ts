import { mount } from '@vue/test-utils'

import { Tool } from '../../theme/components/viewer/tool.ts'

/**
 * Mounts the Viewer into the document, as its page does.
 */
export function mountedTool(): { root: HTMLElement, wrapper: ReturnType<typeof mount<typeof Tool>> } {
  const wrapper = mount(Tool, { attachTo: document.body })
  return { root: wrapper.find('.sc-viewer').element as HTMLElement, wrapper }
}
