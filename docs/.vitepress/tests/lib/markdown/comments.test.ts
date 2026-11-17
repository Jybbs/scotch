import { createMarkdownRenderer } from 'vitepress'
import { describe, expect, it }   from 'vitest'

import { dropComments } from '../../../lib/markdown/comments.ts'

const FIGURE = '<!-- event -->Tilburg<!-- /event --> <!-- year -->1981<!-- /year -->'
const md     = await createMarkdownRenderer('/tmp', { config: dropComments })

describe('dropComments', () => {
  it("drops a figure's markers from a line of prose", () => {
    expect(md.render(`From ${FIGURE}.\n`)).toBe('<p>From Tilburg 1981.</p>\n')
  })

  it.each([
    { block: "a table's cell", rendered: '<td>Tilburg 1981</td>', source: '| **A** |\n|---|\n| FIGURE |\n' },
    { block: 'a heading',      rendered: '>Tilburg 1981 <a ',     source: '## FIGURE\n' }
  ])("drops a figure's markers from $block", ({ rendered, source }) => {
    expect(md.render(source.replace('FIGURE', FIGURE))).toContain(rendered)
  })

  it('keeps an inline element standing in a line of prose', () => {
    expect(md.render('A <kbd>key</kbd> <!-- n -->2<!-- /n -->.\n')).toBe('<p>A <kbd>key</kbd> 2.</p>\n')
  })

  it('keeps a comment written inside a code span', () => {
    expect(md.render('Write `<!-- rows -->` above the table.\n')).toContain('<code>&lt;!-- rows --&gt;</code>')
  })

  it("keeps a region's marker standing on a line of its own", () => {
    expect(md.render('<!-- rows -->\n| **A** |\n|---|\n| 1 |\n<!-- /rows -->\n')).toMatch(/^<!-- rows -->\n/u)
  })
})
