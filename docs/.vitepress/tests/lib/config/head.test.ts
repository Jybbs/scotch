import type { HeadConfig }      from 'vitepress'
import { describe, expect, it } from 'vitest'

import { CARD }               from '../../../lib/cards/draw.ts'
import { pageHead, siteHead } from '../../../lib/config/head.ts'
import type { ProjectFacts }  from '../../../lib/site/manifest.ts'
import { builtPages }         from '../../common/pages.ts'

const FACTS: ProjectFacts = {
  description : 'Finds the closest game.',
  gate        : 95,
  homepage    : 'https://scotch.fyi',
  host        : 'scotch.fyi',
  version     : '0.1.0'
}

const headOf = (relativePath: string, description = 'Keys.', title = 'Position Keys'): HeadConfig[] =>
  pageHead(FACTS, { description, relativePath, title }, 'Scotch')

const read = (head: HeadConfig[], key: string): string | undefined => {
  const tag = head.find(([, attributes]) =>
    [attributes.property, attributes.name, attributes.rel].includes(key))
  return tag?.[1][key === 'canonical' ? 'href' : 'content']
}

describe('siteHead', () => {
  it("sets the mark as the favicon and the site's name every preview shows", () => {
    expect(siteHead('Scotch')).toEqual([
      ['link', { href: '/favicon.svg', rel: 'icon', type: 'image/svg+xml' }],
      ['meta', { content: 'Scotch', property: 'og:site_name' }]
    ])
  })
})

describe('pageHead', () => {
  it.each([
    ['canonical', 'https://scotch.fyi/methods/keys'],
    ['og:description', 'Keys.'],
    ['og:image', 'https://scotch.fyi/cards/methods-keys.png'],
    ['og:image:alt', 'Position Keys, from the Methods section of scotch.fyi'],
    ['og:image:height', String(CARD.height)],
    ['og:image:type', 'image/png'],
    ['og:image:width', String(CARD.width)],
    ['og:locale', 'en_US'],
    ['og:title', 'Position Keys'],
    ['og:type', 'article'],
    ['og:url', 'https://scotch.fyi/methods/keys'],
    ['twitter:card', 'summary_large_image'],
    ['twitter:image', 'https://scotch.fyi/cards/methods-keys.png'],
    ['twitter:image:alt', 'Position Keys, from the Methods section of scotch.fyi']
  ])('gives a section page its %s', (key, value) => {
    expect(read(headOf('methods/keys.md'), key)).toBe(value)
  })

  it.each([
    ['canonical', 'https://scotch.fyi/'],
    ['og:description', FACTS.description],
    ['og:image', 'https://scotch.fyi/cards/site.png'],
    ['og:image:alt', 'Scotch, scotch.fyi'],
    ['og:title', 'Scotch'],
    ['og:type', 'website']
  ])("gives the front page and the not-found page the site's own %s", (key, value) => {
    const heads = ['index.md', '404.md'].map(page => read(headOf(page, 'Ignored.', 'Ignored'), key))
    expect(heads).toEqual([value, value])
  })
})

describe('pageHead on any page', () => {
  it("falls back on the site's description for a page carrying none", () => {
    expect(read(headOf('guide/store.md', '', 'The Store'), 'og:description')).toBe(FACTS.description)
  })

  it.each([
    ['index.md', 'WebSite'],
    ['methods/keys.md', 'TechArticle']
  ])('describes %s as a schema.org %s naming its title, address, and description', (page, type) => {
    const head   = headOf(page)
    const script = head.find(([tag]) => tag === 'script')
    expect(script?.[1]).toEqual({ type: 'application/ld+json' })
    expect(JSON.parse(String(script?.[2]))).toEqual({
      '@context'  : 'https://schema.org',
      '@type'     : type,
      description : read(head, 'og:description'),
      name        : read(head, 'og:title'),
      url         : read(head, 'og:url')
    })
  })

  it.each(builtPages())('keeps the image text of %s within the 420 characters X reads', page => {
    expect(read(headOf(page), 'twitter:image:alt')?.length).toBeLessThanOrEqual(420)
  })
})
