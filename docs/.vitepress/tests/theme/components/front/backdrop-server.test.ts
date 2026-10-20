import { describe, expect, it } from 'vitest'
import { createSSRApp }         from 'vue'
import { renderToString }       from 'vue/server-renderer'

import { Backdrop } from '../../../../theme/components/front/backdrop.ts'

describe('Backdrop on the server', () => {
  it('renders its canvas with no window or document to read', async () => {
    expect(typeof globalThis.window).toBe('undefined')
    const html = await renderToString(createSSRApp(Backdrop))
    expect(html).toBe('<div aria-hidden="true" class="sc-backdrop"><canvas></canvas></div>')
  })
})
