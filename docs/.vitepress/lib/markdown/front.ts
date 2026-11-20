import type { MarkdownRenderer } from 'vitepress'

import { propertyOf } from '../identity/tokens.ts'
import { SECTIONS }   from '../site/sections.ts'
import * as stream    from './stream.ts'

/**
 * A section the front page opens, its entry naming the question it answers.
 */
type Entered = Extract<(typeof SECTIONS)[number], { question: string }>

/**
 * The utilities each entry of the front page draws through: a column over a
 * veil that blurs the layer behind it, an opaque card where the reader asks
 * for less transparency, and its heading and paragraphs set free of the
 * document's own margins.
 */
export const ENTRY = [
  '[--sc-data-link:var(--sc-entry)] relative isolate mx-auto grid max-w-[760px] px-0 pt-16 pb-8',
  "before:pointer-events-none before:absolute before:inset-[0_-64px] before:-z-1 before:content-['']",
  'before:bg-[color-mix(in_srgb,var(--sc-page)_85%,transparent)] before:[backdrop-filter:blur(2px)]',
  'before:veil',
  'opaque:before:inset-[0_-24px] opaque:before:bg-page opaque:before:[mask-image:none]',
  'opaque:before:[backdrop-filter:none]',
  '[&_h2]:m-0! [&_h2]:[border:0]! [&_h2]:p-0! [&_h2]:text-balance',
  '[&_h2]:text-[length:clamp(2.75rem,4vw+1rem,3rem)]/[1.1]! max-lg:[&_h2]:col-span-full',
  '[&_p]:m-0! [&_p]:text-[1.0625rem] [&_p]:text-ink'
].join(' ')
/**
 * The front page's path under `docs/pages/`.
 */
export const FRONT = 'index.md'
/**
 * The head an entry opens on, its numeral beside its heading on a narrow
 * screen and out in the margin on a wide one.
 */
const HEAD = 'relative grid gap-1.5 max-lg:grid-cols-[auto_minmax(0,1fr)] max-lg:items-baseline '
           + 'max-lg:gap-x-3'
/**
 * The section's name over its heading, a link to the section ending on a bar
 * in the section's color, which keeps the document's link color on hover.
 */
const KICKER = [
  'mb-1.5 flex items-center gap-2.5 font-code text-xs/none font-semibold! tracking-[0.16em] uppercase',
  'no-underline! [&:not(:hover)]:text-ink! *:[text-box:trim-both_cap_alphabetic]',
  "after:h-0.5 after:w-10 after:bg-(--sc-entry) after:content-['']"
].join(' ')
/**
 * The numeral an entry opens on, in the section's color.
 */
const NUMERAL = [
  'absolute top-0 right-[calc(100%+26px)] font-display text-[3.6rem]/none font-normal text-(--sc-entry)',
  'lining-nums [text-box:trim-both_cap_alphabetic]',
  'max-lg:static max-lg:text-[1.35rem] max-lg:[text-box:normal]'
].join(' ')
/**
 * The numeral each entry opens on, in the order the page sets them.
 */
export const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const

/**
 * Writes the head an entry opens on, its numeral beside its section's name as a
 * link to the section, ahead of the heading naming its question.
 */
function headOf(numeral: string, section: Entered): string {
  return `<header class="${HEAD}">\n`
       + `<span aria-hidden="true" class="${NUMERAL}">${numeral}</span>\n`
       + `<a class="${KICKER}" href="/${section.slug}/"><span>${section.label}</span></a>\n`
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
    const open = `<section class="${ENTRY} gap-[18px]" data-entry style="${style}">\n`
    tokens.splice(start, 0, stream.html(state, open))
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
