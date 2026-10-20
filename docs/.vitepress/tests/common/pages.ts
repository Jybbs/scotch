import fs   from 'node:fs'
import path from 'node:path'

import { pagesDir } from '../../lib/site/paths.ts'

/**
 * Lists every page the site builds by its path under `docs/pages/`, which a
 * test holds a link or a card to.
 */
export function builtPages(): string[] {
  return fs.globSync('**/*.md', { cwd: pagesDir(import.meta.url) }).toSorted()
}

/**
 * Finds the page a link inside the site leads to, an overview for an address
 * closing on a slash and a page of the address's own name otherwise, or
 * `undefined` where the site builds none.
 */
export function pageAt(link: string): string | undefined {
  const page = link.endsWith('/') ? `${link.slice(1)}index.md` : `${link.slice(1)}.md`
  return builtPages().includes(page) ? page : undefined
}

/**
 * Reads the text of a page the site builds from its path under `docs/pages/`.
 */
export function pageText(page: string): string {
  return fs.readFileSync(path.join(pagesDir(import.meta.url), page), 'utf8')
}
