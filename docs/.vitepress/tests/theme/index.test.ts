import { describe, expect, it, vi } from 'vitest'

import { FIGURE } from '../../lib/markdown/placements.ts'
import { Figure } from '../../theme/components/figure.ts'
import theme      from '../../theme/index.ts'

vi.mock('vitepress/theme-without-fonts', () => ({ default: { Layout: 'DefaultLayout' } }))
vi.mock('../../theme/layout.ts', () => ({ Layout: 'ScotchLayout' }))
vi.mock('../../theme/components/figure.ts', () => ({ Figure: {} }))

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
})
