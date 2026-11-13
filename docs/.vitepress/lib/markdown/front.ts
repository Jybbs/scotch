import type { MarkdownRenderer } from 'vitepress'

import { propertyOf } from '../identity/tokens.ts'
import { SECTIONS }   from '../site/sections.ts'
import * as stream    from './stream.ts'

/**
 * A section the front page opens, its entry naming the question it answers.
 */
type Entered = Extract<(typeof SECTIONS)[number], { question: string }>

/**
 * The front page's path under `docs/pages/`.
 */
export const FRONT = 'index.md'
/**
 * The numeral each entry opens on, in the order the page sets them.
 */
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const

/**
 * Writes the head an entry opens on, its numeral beside its section's name as a
 * link to the section, ahead of the heading naming its question.
 */
function headOf(numeral: string, section: Entered): string {
  return '<header class="sc-entry-head">\n'
       + `<span aria-hidden="true" class="sc-entry-numeral">${numeral}</span>\n`
       + `<a class="sc-entry-kicker" href="/${section.slug}/"><span>${section.label}</span></a>\n`
}

/**
 * Sets each section of the front page as the entry of the site's section its
 * heading names, writing the section's question into the heading, so the page
 * names each section by its one word and the registry holds its question.
 *
 * Raises:
 *   Error: Where a heading names no section the front page opens.
 */
function entries(state: stream.Core): void {
  const tokens = state.tokens
  const opens  = tokens.flatMap((token, index) =>
    token.type === 'heading_open' && token.tag === 'h2' ? [index] : [])

  for (const [place, start] of [...opens.entries()].toReversed()) {
    const inline  = tokens[start + 1]!
    const label   = inline.content.trim()
    const section = SECTIONS.find((each): each is Entered => 'question' in each && each.label === label)
    if (!section) throw new Error(`the front page's heading ${label} names no section it opens`)

    const text = inline.children?.find(child => child.type === 'text')
    if (text) text.content = section.question
    inline.content = section.question

    const end   = opens[place + 1] ?? tokens.length
    const style = `--sc-entry: var(${propertyOf(section.color)})`
    tokens.splice(end, 0, stream.html(state, '</section>\n'))
    tokens.splice(start + 3, 0, stream.html(state, '</header>\n'))
    tokens.splice(start, 0, stream.html(state, headOf(NUMERALS[place]!, section)))
    tokens.splice(start, 0, stream.html(state, `<section class="sc-entry" style="${style}">\n`))
  }
}

/**
 * Lays out the front page, whose heading and tagline become the hero the theme
 * draws, so the rule drops the first heading and the block after it from the
 * page's body and sets each section after them as the entry of the section it
 * opens. The rule runs after the widgets are placed, so each entry holds the
 * widget placed after its heading's own words.
 *
 * Args:
 *   md: The renderer VitePress builds for the site.
 */
export function frontPage(md: MarkdownRenderer): void {
  md.core.ruler.push('scotch-front', state => {
    if (state.env?.relativePath !== FRONT) return
    const tokens  = state.tokens
    const heading = tokens.findIndex(token => token.type === 'heading_open' && token.tag === 'h1')
    if (heading !== -1) {
      // Finds the block after the tagline's, which is a paragraph's three tokens or an HTML block's one.
      const next = tokens.findIndex((token, index) =>
        index > heading + 3 && token.level === 0 && token.nesting !== -1)
      tokens.splice(heading, next === -1 ? tokens.length : next - heading)
    }
    entries(state)
  })
}
