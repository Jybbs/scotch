import { createMarkdownRenderer } from 'vitepress'
import { describe, expect, it }   from 'vitest'

import { FRONT, frontPage } from '../../../lib/markdown/front.ts'
import { SECTIONS }         from '../../../lib/site/sections.ts'

const md   = await createMarkdownRenderer('/tmp', { config: frontPage })
const PAGE = [
  '# Scotch',
  '',
  '<!-- tagline -->Find the grandmaster game closest to yours.<!-- /tagline -->',
  '',
  'An opening paragraph.',
  '',
  '## Data',
  '',
  'The **[Data](data/index.md)** section names each file.',
  '',
  '## Methods',
  '',
  'Read [an aside](https://example.org) first, then **[Methods](methods/index.md)**.',
  ''
].join('\n')

describe('frontPage', () => {
  const html    = md.render(PAGE, { relativePath: FRONT })
  const entries = [...html.matchAll(/<section class="sc-entry" style="([^"]+)">([^]*?)<\/section>/gu)]

  it('drops the heading and the tagline, which the hero draws', () => {
    expect(html).not.toContain('<h1')
    expect(html).not.toContain('Find the grandmaster game')
  })

  it('keeps the paragraph after the tagline outside every entry', () => {
    expect(html).toMatch(/^<p>An opening paragraph\.<\/p>\n<section /u)
  })

  it.each([
    [
      'drops a tagline written as a paragraph as well',
      '# Scotch\n\nFind it.\n\nAn opening paragraph.\n',
      '<p>An opening paragraph.</p>\n'
    ],
    [
      'leaves nothing of a page ending on its tagline',
      '# Scotch\n\n<!-- tagline -->Find it.<!-- /tagline -->\n',
      ''
    ],
    ['keeps a front page opening on no heading whole', 'Just a line.\n', '<p>Just a line.</p>\n']
  ])('%s', (_, page, rendered) => {
    expect(md.render(page, { relativePath: FRONT })).toBe(rendered)
  })

  it("sets each section whole inside an entry in its section's color, in order", () => {
    expect(entries.map(([, style]) => style))
      .toEqual(['--sc-entry: var(--sc-series-1)', '--sc-entry: var(--sc-series-5)'])
    expect(entries[1]![2]).toContain('href="https://example.org"')
  })

  const opened = [[0, 'I', 'Data'], [1, 'II', 'Methods']] as const

  it.each(opened)('opens entry %i on %s beside %s, under its question', (index, numeral, label) => {
    const section = SECTIONS.find(each => each.label === label) as { question: string, slug: string }
    const entry   = entries[index]![2]!
    const asked   = section.question
    expect(entry).toContain(`<span aria-hidden="true" class="sc-entry-numeral">${numeral}</span>`)
    expect(entry).toContain(`<a class="sc-entry-kicker" href="/${section.slug}/"><span>${label}</span></a>`)
    expect(entry).toMatch(new RegExp(`<h2[^>]*>${RegExp.escape(asked)}`, 'u'))
  })

})

describe('frontPage on other pages', () => {
  it('raises on a heading naming no section the front page opens', () => {
    expect(() => md.render('## Reference\n\nText.\n', { relativePath: FRONT }))
      .toThrow("the front page's heading Reference names no section it opens")
  })

  it('leaves every other page as it stands', () => {
    expect(md.render(PAGE, { relativePath: 'guide/index.md' })).toContain('<h1')
  })
})
