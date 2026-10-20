import type { HeadConfig, PageData } from 'vitepress'

import { CARD }              from '../cards/draw.ts'
import type { ProjectFacts } from '../site/manifest.ts'
import { cardOf, routeOf }   from '../site/routes.ts'
import { sectionOf }         from '../site/sections.ts'

type HeadedPage = Pick<PageData, 'description' | 'relativePath' | 'title'>

/**
 * Writes the tags a link preview reads for one page, its canonical link, and
 * its structured data, every address built from the homepage the manifest
 * declares and the page's clean address. The front page and the not-found page
 * take the site's own address, title, and description, since Cloudflare Pages
 * serves the not-found page at every address the site holds no page for, and
 * every other page its own address, its first heading, and the description
 * VitePress read for it.
 *
 * Args:
 *   facts     : What the manifest declares about the project.
 *   page      : The page VitePress is writing.
 *   siteTitle : The site's own title.
 */
export function pageHead(facts: ProjectFacts, page: HeadedPage, siteTitle: string): HeadConfig[] {
  const section     = sectionOf(page.relativePath)
  const front       = section === undefined
  const address     = new URL(front ? '/' : routeOf(page.relativePath), facts.homepage).href
  const card        = new URL(cardOf(page.relativePath), facts.homepage).href
  const title       = front ? siteTitle : page.title
  const description = front || !page.description ? facts.description : page.description
  const alt         = `${title}, ${section ? `from the ${section.label} section of ` : ''}${facts.host}`
  const data        = {
    '@context'  : 'https://schema.org',
    '@type'     : front ? 'WebSite' : 'TechArticle',
    description : description,
    name        : title,
    url         : address
  }

  return [
    ['link', { href: address, rel: 'canonical' }],
    ['meta', { content: title, property: 'og:title' }],
    ['meta', { content: description, property: 'og:description' }],
    ['meta', { content: front ? 'website' : 'article', property: 'og:type' }],
    ['meta', { content: 'en_US', property: 'og:locale' }],
    ['meta', { content: address, property: 'og:url' }],
    ['meta', { content: card, property: 'og:image' }],
    ['meta', { content: String(CARD.width), property: 'og:image:width' }],
    ['meta', { content: String(CARD.height), property: 'og:image:height' }],
    ['meta', { content: 'image/png', property: 'og:image:type' }],
    ['meta', { content: alt, property: 'og:image:alt' }],
    ['meta', { content: 'summary_large_image', name: 'twitter:card' }],
    ['meta', { content: card, name: 'twitter:image' }],
    ['meta', { content: alt, name: 'twitter:image:alt' }],
    ['script', { type: 'application/ld+json' }, JSON.stringify(data)]
  ]
}

/**
 * Writes the head the configuration gives every page, meaning the site's name a
 * link preview shows and the mark as the favicon.
 */
export function siteHead(title: string): HeadConfig[] {
  return [
    ['link', { href: '/favicon.svg', rel: 'icon', type: 'image/svg+xml' }],
    ['meta', { content: title, property: 'og:site_name' }]
  ]
}
