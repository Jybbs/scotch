import type { MarkdownRenderer } from 'vitepress'

import { PAGE, TERMS, type Term, addressOf } from '../reference/terms.ts'
import type * as stream                      from './stream.ts'

/**
 * The tokens opening a block whose words stay as they stand, since a term in a
 * heading or a column's header names the section rather than using the word.
 */
const BARRED = new Set(['heading_open', 'th_open'])

function firstOf(text: string, terms: ReadonlySet<Term>): { at: number, term: Term, word: string } | undefined {
  return [...terms].flatMap(term => {
    const found = new RegExp(term.pattern, 'iu').exec(text)
    return found ? [{ at: found.index, term: term, word: found[0] }] : []
  }).toSorted((first, second) => first.at - second.at)[0]
}

function words(state: stream.Core, text: string): stream.MarkdownToken[] {
  return text ? [Object.assign(new state.Token('text', '', 0), { content: text })] : []
}

function linked(state: stream.Core, text: string, terms: Set<Term>): stream.MarkdownToken[] {
  const first = firstOf(text, terms)
  if (first === undefined) return words(state, text)

  terms.delete(first.term)
  const open = new state.Token('link_open', 'a', 1)
  open.attrSet('href', addressOf(first.term))
  open.attrSet('class', 'sc-term')
  open.attrSet('data-term', first.term.anchor)

  return [
    ...words(state, text.slice(0, first.at)),
    open,
    ...words(state, first.word),
    new state.Token('link_close', 'a', -1),
    ...linked(state, text.slice(first.at + first.word.length), terms)
  ]
}

function inlineOf(state: stream.Core, children: stream.MarkdownToken[], terms: Set<Term>): stream.MarkdownToken[] {
  let depth = 0
  return children.flatMap(child => {
    if (child.type === 'link_open') depth += 1
    if (child.type === 'link_close') depth -= 1
    return child.type === 'text' && depth === 0 ? linked(state, child.content, terms) : [child]
  })
}

/**
 * Links each term's first use on a page to its definition, so a page's Markdown
 * holds the plain word and reads as it stands on GitHub. The terms page, which
 * holds the definitions, is left as it stands, as is a term inside a link, a
 * heading, or a column's header.
 *
 * Args:
 *   md    : The renderer VitePress builds for the site.
 *   terms : The terms a page's text is matched against.
 */
export function linkTerms(md: MarkdownRenderer, terms: readonly Term[] = TERMS): void {
  md.core.ruler.push('scotch-terms', state => {
    if (state.env?.relativePath === PAGE) return
    const unmet = new Set(terms)
    state.tokens.forEach((token, index) => {
      if (token.type !== 'inline' || !token.children || BARRED.has(state.tokens[index - 1]!.type)) return
      token.children = inlineOf(state, token.children, unmet)
    })
  })
}
