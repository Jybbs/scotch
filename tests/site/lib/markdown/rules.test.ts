import { createMarkdownRenderer } from 'vitepress'
import { describe, expect, it }   from 'vitest'
import { compileTemplate }        from 'vue/compiler-sfc'

import { FIGURE }               from '../../../../docs/.vitepress/lib/markdown/placements.ts'
import { markdownRules }        from '../../../../docs/.vitepress/lib/markdown/rules.ts'
import { builtPages, pageText } from '../../common/pages.ts'

const md      = await createMarkdownRenderer('/tmp', { config: markdownRules })
const COMMENT = /<!--[^]*?-->/gu

/**
 * Compiles a page's HTML as VitePress hands it to Vue, its comments kept or
 * dropped, and returns the render code with every comment taken out, so the two
 * differ only where Vue condenses whitespace differently beside a comment.
 */
function compiled(html: string, comments: boolean): string {
  const { code } = compileTemplate({
    compilerOptions : { comments },
    filename        : 'page.md',
    id              : 'page',
    source          : `<div>${html}</div>`,
    ssr             : true,
    ssrCssVars      : []
  })
  return code.replaceAll(COMMENT, '')
}

describe('markdownRules', () => {
  it('numbers a citation by its source', () => {
    expect(md.render('A claim.[^fide2023]\n\n[^fide2023]: FIDE.\n', { relativePath: 'methods/indexing.md' }))
      .toContain('<li id="footnote-fide2023"')
  })

  it('adds its rules once to a renderer it is handed twice', () => {
    markdownRules(md)
    expect(md.render('A claim.[^fide2023]\n\n[^fide2023]: FIDE.\n', { relativePath: 'methods/indexing.md' }))
      .toContain('<li id="footnote-fide2023" class="footnote-item" data-shade="light" tabindex="-1">')
  })

  it("sets the front page's sections as entries, each holding its widget", () => {
    const page = ['Data', 'Guide', 'Methods', 'Viewer'].map(label => `## ${label}\n\nText.\n`).join('\n')
    const html = md.render(`# Scotch\n\nTagline.\n\n${page}`, { relativePath: 'index.md' })
    const entry = new RegExp(`<section class="[^"]+" data-entry[^]*?<${FIGURE} name="store" />[^]*?</section>`, 'u')
    expect(html).toMatch(entry)
  })

  it('places the widgets the placements name', () => {
    const page = '# Runs\n\n## Stepping Through a Match\n\nThe line.\n'
    expect(md.render(page, { relativePath: 'methods/runs.md' })).toContain(`<${FIGURE} name="run" />`)
  })

  it.each(builtPages())('reads %s the same with its comments kept as with them dropped', { timeout: 30_000 }, page => {
    const html = md.render(pageText(page), { cleanUrls: true, relativePath: page })
    expect(compiled(html, true)).toBe(compiled(html, false))
  })
})
