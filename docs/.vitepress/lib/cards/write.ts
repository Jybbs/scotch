import fs   from 'node:fs'
import path from 'node:path'

import { Resvg } from '@resvg/resvg-js'
import satori    from 'satori'

import { titleOf }             from '../site/pages.ts'
import { cardOf }              from '../site/routes.ts'
import { SECTIONS, sectionOf } from '../site/sections.ts'
import * as draw               from './draw.ts'
import { editionOf }           from './edition.ts'
import { facesOf }             from './faces.ts'

/**
 * What the build hands `buildEnd` that the cards read: the folder the built
 * site is written to, the folder the pages are read from, and each page's path
 * under it.
 */
interface Built {
  outDir : string
  pages  : readonly string[]
  srcDir : string
}

/**
 * Plans one card per address a page's `og:image` names, the front page and the
 * not-found page sharing the site's card and every other page taking its own in
 * its section's color, keyed by the card's path under the built site.
 *
 * Args:
 *   built   : What the build hands `buildEnd`.
 *   metaUrl : The `import.meta.url` of the module calling, which the repository
 *     root is found from.
 */
export function planCards(built: Built, metaUrl: string): Map<string, draw.Tree> {
  const edition = editionOf(metaUrl)

  return new Map(['404.md', ...built.pages].map(page => {
    const section = sectionOf(page)
    return [cardOf(page), section
      ? draw.pageCard(edition, { section, title: titleOf(path.join(built.srcDir, page)) }, SECTIONS)
      : draw.siteCard(edition)]
  }))
}

/**
 * Draws every card `planCards` plans as a PNG at the card's size into the built
 * site, once every page is written, through satori, which lays the card out as
 * an SVG with its text set as outlines, and resvg, which rasterizes it.
 *
 * Returns:
 *   The path of each card written, under the built site.
 */
export async function writeCards(built: Built, metaUrl: string): Promise<string[]> {
  const fonts = facesOf(metaUrl)
  const cards = [...planCards(built, metaUrl)]

  await Promise.all(cards.map(async ([card, tree]) => {
    const svg  = await satori(tree, { fonts, height: draw.CARD.height, width: draw.CARD.width })
    const file = path.join(built.outDir, card)
    const png  = new Resvg(svg).render().asPng()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, png)
  }))

  return cards.map(([card]) => card)
}
