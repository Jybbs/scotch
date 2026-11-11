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

  it("sets the front page's sections as entries, each holding its widget", () => {
    const page = ['Data', 'Guide', 'Methods', 'Viewer'].map(label => `## ${label}\n\nText.\n`).join('\n')
    const html = md.render(`# Scotch\n\nTagline.\n\n${page}`, { relativePath: 'index.md' })
    const entry = new RegExp(`<section class="sc-entry"[^]*?<${FIGURE} name="store" />[^]*?</section>`, 'u')
    expect(html).toMatch(entry)
  })

  it('places the widgets the placements name', () => {
    const page = '# Runs\n\n## Stepping Through a Match\n\nThe line.\n'
    expect(md.render(page, { relativePath: 'methods/runs.md' })).toContain(`<${FIGURE} name="run" />`)
  })
})
