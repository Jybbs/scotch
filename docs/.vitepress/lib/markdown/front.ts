import type { MarkdownRenderer } from 'vitepress'

import * as stream from './stream.ts'

/**
 * The front page's path under `docs/pages/`.
 */
export const FRONT = 'index.md'

function cards(state: stream.Core): void {
  const tokens = state.tokens
  const opens  = tokens.flatMap((token, index) =>
    token.type === 'heading_open' && token.tag === 'h2' ? [index] : [])

  for (const [place, start] of [...opens.entries()].toReversed()) {
    const end = opens[place + 1] ?? tokens.length
    tokens.splice(end, 0, stream.html(state, '</article>\n'))
    tokens.splice(start, 0, stream.html(state, '<article class="sc-card">\n'))
  }
}

/**
 * Lays out the front page, whose heading and tagline become the hero the theme
 * draws, so the rule drops the first heading and the paragraph after it from
 * the page's body and sets each section after them as a card.
 *
 * Args:
 *   md: The renderer VitePress builds for the site.
 */
export function frontPage(md: MarkdownRenderer): void {
  md.core.ruler.push('scotch-front', state => {
    if (state.env?.relativePath !== FRONT) return
    const heading = state.tokens.findIndex(token => token.type === 'heading_open' && token.tag === 'h1')
    // Removes the heading's open, inline, and close tokens and the tagline paragraph's three.
    if (heading !== -1) state.tokens.splice(heading, 6)
    cards(state)
  })
}
