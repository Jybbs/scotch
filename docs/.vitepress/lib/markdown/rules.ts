import type { MarkdownRenderer } from 'vitepress'

import { citeMark }       from './citing.ts'
import { dropComments }   from './comments.ts'
import { frontPage }      from './front.ts'
import { readGitHubMath } from './math.ts'
import { placeFigures }   from './placing.ts'
import { linkTerms }      from './terms.ts'

/**
 * The renderers the rules are already on.
 */
const ruled = new WeakSet<MarkdownRenderer>()

/**
 * Adds every rule the site gives VitePress's renderer, meaning the citation
 * marks, the widgets each page places, the front page's entries, which hold the
 * widgets placed after their headings, the link on each term's first use, the
 * removal of each comment inside a line of prose, and the reading of math
 * written in GitHub's form. The rules go on each renderer once, since VitePress
 * hands one renderer to this call twice where two of its renderers are built at
 * once with math turned on, as the local search's and the pages' are, and a
 * rule wrapping the one before it would otherwise wrap itself.
 *
 * Args:
 *   md: The renderer VitePress builds for the site.
 */
export function markdownRules(md: MarkdownRenderer): void {
  if (ruled.has(md)) return
  ruled.add(md)
  citeMark(md)
  placeFigures(md)
  frontPage(md)
  linkTerms(md)
  dropComments(md)
  readGitHubMath(md)
}
