import type { MarkdownRenderer } from 'vitepress'

import { citeMark }     from './citing.ts'
import { frontPage }    from './front.ts'
import { placeFigures } from './placing.ts'

/**
 * Adds every rule the site gives VitePress's renderer, meaning the citation
 * marks, the front page's cards, and the widgets each page places.
 *
 * Args:
 *   md: The renderer VitePress builds for the site.
 */
export function markdownRules(md: MarkdownRenderer): void {
  citeMark(md)
  frontPage(md)
  placeFigures(md)
}
