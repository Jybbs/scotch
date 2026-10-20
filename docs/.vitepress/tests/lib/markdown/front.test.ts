import { createMarkdownRenderer } from 'vitepress'
import { describe, expect, it }   from 'vitest'

import { FRONT, frontPage } from '../../../lib/markdown/front.ts'

const md   = await createMarkdownRenderer('/tmp', { config: frontPage })
const PAGE = [
  '# Scotch',
  '',
  'Find the grandmaster game closest to yours.',
  '',
  'An opening paragraph.',
  '',
  '## The Store',
  '',
  'The **[Data](data/index.md)** section names each file.',
  '',
  '## The Method',
  '',
  'Read [an aside](https://example.org) first, then **[Methods](methods/index.md)**.',
  '',
  '## No Section',
  '',
  'Nothing links a section.',
  ''
].join('\n')

describe('frontPage', () => {
  const html = md.render(PAGE, { relativePath: FRONT })

  it('drops the heading and the tagline, which the hero draws', () => {
    expect(html).not.toContain('<h1')
    expect(html).not.toContain('Find the grandmaster game')
  })

  it('keeps the paragraph after the tagline outside every card', () => {
    expect(html.indexOf('An opening paragraph.')).toBeLessThan(html.indexOf('<article'))
  })

  it('sets each section whole inside a card of its own, in order', () => {
    const cards = [...html.matchAll(/<article class="sc-card">([^]*?)<\/article>/gu)].map(([, card]) => card!)
    expect(cards.map(card => /<h2[^>]*>([^<]+?) </u.exec(card)?.[1]))
      .toEqual(['The Store', 'The Method', 'No Section'])
  })

  it('keeps a front page opening on no heading whole', () => {
    expect(md.render('Just a line.\n', { relativePath: FRONT })).toBe('<p>Just a line.</p>\n')
  })

  it('leaves every other page as it stands', () => {
    expect(md.render(PAGE, { relativePath: 'guide/index.md' })).toContain('<h1')
  })
})
