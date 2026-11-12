import type { DefaultTheme } from 'vitepress'

import { sectionPages } from '../site/pages.ts'
import { SECTIONS }     from '../site/sections.ts'

interface Named {
  label  : string
  order? : readonly string[]
  slug   : string
}

export function buildNav(sections: readonly Named[] = SECTIONS): DefaultTheme.NavItem[] {
  return sections.map(({ label, slug }) => ({ activeMatch: `^/${slug}/`, link: `/${slug}/`, text: label }))
}

/**
 * Builds one sidebar group per section from its pages' own first headings, the
 * overview leading and the pages a section's `order` names following it.
 *
 * Args:
 *   pagesDir : The folder the site's pages sit in.
 *   sections : The sections to build a group for.
 */
export function buildSidebar(
  pagesDir : string,
  sections : readonly Named[] = SECTIONS
): DefaultTheme.SidebarMulti {
  return Object.fromEntries(sections.map(({ label, order, slug }) => [`/${slug}/`, [{
    items : sectionPages(pagesDir, slug, order).map(({ link, title }) => ({ link, text: title })),
    text  : label
  }]]))
}
