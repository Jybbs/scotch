// @vitest-environment happy-dom
import { flushPromises, mount }     from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { type Component, h }        from 'vue'

import { FIGURE } from '../../lib/markdown/placements.ts'
import { VIEWER } from '../../lib/viewer/page.ts'
import { Figure } from '../../theme/components/figure.ts'
import theme      from '../../theme/index.ts'

vi.mock('vitepress/theme-without-fonts', () => ({ default: { Layout: 'DefaultLayout' } }))
vi.mock('../../theme/layout.ts', () => ({ Layout: 'ScotchLayout' }))
vi.mock('../../theme/components/figure.ts', () => ({ Figure: {} }))
vi.mock('../../theme/components/viewer/tool.ts', () => ({ Tool: { render: () => 'The Viewer' } }))

describe('the theme', () => {
  it('extends the default theme without its bundled faces', async () => {
    expect(theme.extends).toBe((await import('vitepress/theme-without-fonts')).default)
  })

  it("lays every page out through the site's own layout", () => {
    expect(theme.Layout).toBe('ScotchLayout')
  })

  it("registers the figure a page's widgets are placed through under its own name", () => {
    const component = vi.fn<(name: string, definition: unknown) => void>()
    theme.enhanceApp({ app: { component } } as never)
    expect(component).toHaveBeenCalledWith(FIGURE, Figure)
  })

  it('registers the Viewer as its page’s layout, loading the tool once the page needs it', async () => {
    const component = vi.fn<(name: string, definition: Component) => void>()
    theme.enhanceApp({ app: { component } } as never)
    const [, tool] = component.mock.calls.find(([name]) => name === VIEWER.layout)!
    const wrapper  = mount({ render: () => h(tool) })
    await flushPromises()
    expect(wrapper.text()).toBe('The Viewer')
  })
})
