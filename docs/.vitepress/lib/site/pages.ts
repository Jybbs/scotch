import fs   from 'node:fs'
import path from 'node:path'

import { routeOf } from './routes.ts'

interface SectionPage {
  link  : string
  title : string
}

/**
 * Reads the pages of one section, its overview first, then each page `order`
 * names in that order, and every other page after them in the order of their
 * titles, each linked by its clean address.
 *
 * Args:
 *   pagesDir : The folder the site's pages sit in.
 *   slug     : The section's folder under it.
 *   order    : The file names, without `.md`, of the pages leading the rest.
 */
export function sectionPages(pagesDir: string, slug: string, order: readonly string[] = []): SectionPage[] {
  const folder = path.join(pagesDir, slug)
  const rank   = (file: string) => {
    const stem = path.basename(file, '.md')
    return stem === 'index' ? -1 : order.includes(stem) ? order.indexOf(stem) : order.length
  }

  return fs.globSync('*.md', { cwd: folder })
    .map(file => ({ file, link: routeOf(`${slug}/${file}`), title: titleOf(path.join(folder, file)) }))
    .toSorted((a, b) => rank(a.file) - rank(b.file) || a.title.localeCompare(b.title))
    .map(({ link, title }) => ({ link, title }))
}

/**
 * Reads a page's title from its first heading, the `#` line a page opens on,
 * which is also the title VitePress gives the page.
 */
export function titleOf(file: string): string {
  const heading = /^# (.+)$/mu.exec(fs.readFileSync(file, 'utf8'))
  if (!heading?.[1]) throw new Error(`no first heading in ${file}`)
  return heading[1].trim()
}
