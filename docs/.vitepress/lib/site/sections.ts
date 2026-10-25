import type { Token } from '../identity/tokens.ts'

export type Section = (typeof SECTIONS)[number]

/**
 * Each section the site carries, its label the one word that is also its
 * folder, its address, its entry in the navigation bar, and its overview's
 * heading, beside the palette token its pages' preview cards are accented in.
 */
export const SECTIONS = [
  { color: 'series_1', label: 'Data',    slug: 'data'    },
  { color: 'series_4', label: 'Guide',   slug: 'guide'   },
  { color: 'series_5', label: 'Methods', slug: 'methods' },
  { color: 'series_6', label: 'Viewer',  slug: 'viewer'  }
] as const satisfies readonly { color: Token, label: string, slug: string }[]

/**
 * Finds the section a page under `docs/pages/` sits in from its path relative
 * to that folder, or `undefined` for the front page and the not-found page.
 */
export function sectionOf(relativePath: string): Section | undefined {
  return SECTIONS.find(section => relativePath.startsWith(`${section.slug}/`))
}
