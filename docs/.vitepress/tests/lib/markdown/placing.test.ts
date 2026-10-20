import { createMarkdownRenderer } from 'vitepress'
import { describe, expect, it }   from 'vitest'

import { FIGURE }       from '../../../lib/markdown/placements.ts'
import { placeFigures } from '../../../lib/markdown/placing.ts'

const PLACEMENTS = {
  'broken/end.md'     : [{ draw: 'lost', region: 'missing-end' }],
  'broken/region.md'  : [{ draw: 'lost', region: 'missing' }],
  'broken/section.md' : [{ after: 'Missing', draw: 'lost' }],
  'page.md'           : [
    { after: 'First', draw: 'chart' }, { after: 'Second', draw: 'closing' }, { draw: 'table', region: 'rows' }
  ]
}
const md   = await createMarkdownRenderer('/tmp', { config: renderer => placeFigures(renderer, PLACEMENTS) })
const PAGE = [
  '# Page',
  '',
  '<!-- missing-end -->',
  '',
  '## First',
  '',
  'What the chart shows.',
  '',
  '<!-- rows -->',
  '| **A** |',
  '|---|',
  '| 1 |',
  '<!-- /rows -->',
  '',
  '## Second',
  '',
  'More.[^edwards1994]',
  '',
  '[^edwards1994]: Edwards.',
  ''
].join('\n')

describe('placeFigures', () => {
  const html = md.render(PAGE, { relativePath: 'page.md' })

  it('closes the section a widget sits in on the widget, ahead of the next heading', () => {
    expect(html).toMatch(new RegExp(`<!-- /rows -->\\n<${FIGURE} name="chart" />\\n<h2 id="second"`, 'u'))
  })

  it("sets a widget over a region around what the region's markers enclose", () => {
    const wrapped = `<!-- rows -->\\n<${FIGURE} name="table">\\n<table[^]*</table>\\n`
                  + `</${FIGURE}>\\n<!-- /rows -->`
    expect(html).toMatch(new RegExp(wrapped, 'u'))
  })

  it('closes the last section on its widget ahead of the footnotes that follow every section', () => {
    const closing = `More\\.<sup[^]*</p>\\n<${FIGURE} name="closing" />\\n<hr class="footnotes-sep">`
    expect(html).toMatch(new RegExp(closing, 'u'))
  })

  it('leaves a page with no placements as it stands', () => {
    expect(md.render(PAGE, { relativePath: 'other.md' })).not.toContain(FIGURE)
  })

  it.each(['broken/end.md', 'broken/section.md', 'broken/region.md'])(
    'fails where %s names what it no longer holds',
    page => {
      expect(() => md.render(PAGE, { relativePath: page })).toThrow(/^no (section|region) named [Mm]issing/u)
    }
  )
})
