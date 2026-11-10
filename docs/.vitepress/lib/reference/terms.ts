import rendered from '../rendered/terms.json' with { type: 'json' }

export type Term = (typeof TERMS)[number]

/**
 * The words the pages define, as `scotch render docs` writes them from their one
 * declaration, read by the terms page, the link on each term's first use on a
 * page, and the slip that link opens.
 */
export const TERMS = rendered
/**
 * The page defining the terms, under `docs/pages/`.
 */
export const PAGE = 'reference/terms.md'

/**
 * Writes the address of a term's definition on the terms page.
 */
export function addressOf(term: Term): string {
  return `/reference/terms#${term.anchor}`
}

/**
 * Finds the term whose heading a fragment names.
 */
export function termOf(anchor?: string): Term | undefined {
  return TERMS.find(term => term.anchor === anchor)
}
