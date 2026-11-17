import type { MarkdownRenderer } from 'vitepress'

import { citeMark }     from './citing.ts'
import { dropComments } from './comments.ts'
import { frontPage }    from './front.ts'
import { placeFigures } from './placing.ts'
import { linkTerms }    from './terms.ts'

/**
 * Adds every rule the site gives VitePress's renderer, meaning the citation
 * marks, the widgets each page places, the front page's entries, which hold the
 * widgets placed after their headings, the link on each term's first use, and
 * the removal of each comment inside a line of prose.
 *
 * Args:
 *   md: The renderer VitePress builds for the site.
 */
export function markdownRules(md: MarkdownRenderer): void {
  citeMark(md)
  placeFigures(md)
  frontPage(md)
  linkTerms(md)
  dropComments(md)
}
