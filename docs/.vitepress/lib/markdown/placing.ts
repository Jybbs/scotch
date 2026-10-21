import type { MarkdownRenderer } from 'vitepress'

import * as placements from './placements.ts'
import * as stream     from './stream.ts'

/**
 * Where a section's own words end, which is at the next heading or at the
 * footnotes a page closes on, since those follow every section.
 */
const ENDS = new Set(['footnote_block_open', 'heading_open'])

function closes(tokens: stream.MarkdownToken[], opens: number): number {
  const next = tokens.findIndex((token, index) => index > opens && ENDS.has(token.type))
  return next === -1 ? tokens.length : next
}

function place(state: stream.Core, placement: placements.Placement): void {
  const { ends, from } = spanOf(state.tokens, placement)
  if (from === undefined) {
    state.tokens.splice(ends, 0, stream.html(state, `<${placements.FIGURE} name="${placement.draw}" />\n`))
    return
  }
  state.tokens.splice(ends, 0, stream.html(state, `</${placements.FIGURE}>\n`))
  state.tokens.splice(from, 0, stream.html(state, `<${placements.FIGURE} name="${placement.draw}">\n`))
}

/**
 * Finds where a placement's widget goes among `tokens`, as the token it ends
 * before and, over a region, the token it takes in from, since a widget over a
 * region wraps what the region's markers enclose.
 */
function spanOf(
  tokens                  : stream.MarkdownToken[],
  { after, draw, region } : placements.Placement
): { ends: number, from?: number } {
  if (region !== undefined) {
    const marker = (name: string): number =>
      tokens.findIndex(token => token.type === 'html_block' && token.content.trim() === `<!-- ${name} -->`)
    const [opens, ends] = [marker(region), marker(`/${region}`)]
    if (opens === -1 || ends === -1) throw new Error(`no region named ${region} to place ${draw} over`)
    return { ends, from: opens + 1 }
  }
  const heading = tokens.findIndex((token, index) =>
    token.type === 'heading_open' && tokens[index + 1]?.content.trim() === after)
  if (heading === -1) throw new Error(`no section named ${after} to place ${draw} in`)
  return { ends: closes(tokens, heading) }
}

/**
 * Puts each page's widgets at the end of the sections the prose for them sits
 * in, and sets a widget over a region around the region's table, which it then
 * folds shut beneath itself.
 *
 * Args:
 *   md     : The renderer VitePress builds for the site.
 *   placed : Each page's widgets, under the page's path.
 *
 * Raises:
 *   Error: Where a page names a section or a region it no longer holds.
 */
export function placeFigures(md: MarkdownRenderer, placed = placements.PLACED): void {
  md.core.ruler.push('scotch-figures', state => {
    for (const placement of placed[state.env?.relativePath as string] ?? []) place(state, placement)
  })
}
