import fs   from 'node:fs'
import path from 'node:path'

import { routeOf } from './routes.ts'

interface SectionPage {
  link  : string
  title : string
}

/**
 * Reads the pages of one section, its overview first and every other page after
 * it in the order of their titles, each linked by its clean address.
 *
 * Args:
 *   pagesDir : The folder the site's pages sit in.
 *   slug     : The section's folder under it.
 */
export function sectionPages(pagesDir: string, slug: string): SectionPage[] {
  const folder = path.join(pagesDir, slug)
  const pages  = fs.globSync('*.md', { cwd: folder })
    .map(file => ({ link: routeOf(`${slug}/${file}`), title: titleOf(path.join(folder, file)) }))

  return pages.toSorted((a, b) =>
    Number(b.link.endsWith('/')) - Number(a.link.endsWith('/')) || a.title.localeCompare(b.title))
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
