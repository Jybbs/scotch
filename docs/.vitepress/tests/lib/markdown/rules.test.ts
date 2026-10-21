import { createMarkdownRenderer } from 'vitepress'
import { describe, expect, it }   from 'vitest'

import { FIGURE }        from '../../../lib/markdown/placements.ts'
import { markdownRules } from '../../../lib/markdown/rules.ts'

const md = await createMarkdownRenderer('/tmp', { config: markdownRules })

describe('markdownRules', () => {
  it('numbers a citation by its source', () => {
    expect(md.render('A claim.[^fide2023]\n\n[^fide2023]: FIDE.\n', { relativePath: 'methods/keys.md' }))
      .toContain('<li id="footnote-fide2023"')
  })

  it("sets the front page's sections as cards", () => {
    expect(md.render('# Scotch\n\nTagline.\n\n## One\n\nText.\n', { relativePath: 'index.md' }))
      .toContain('<article class="sc-card"')
  })

  it('places the widgets the placements name', () => {
    const page = '# Runs\n\n## Stepping Through a Match\n\nThe line.\n'
    expect(md.render(page, { relativePath: 'methods/runs.md' })).toContain(`<${FIGURE} name="run" />`)
  })
})
