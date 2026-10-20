import type { DefaultTheme } from 'vitepress'

import { sectionPages }           from '../site/pages.ts'
import { SECTIONS, type Section } from '../site/sections.ts'

type Named = Pick<Section, 'label' | 'slug'>

export function buildNav(sections: readonly Named[] = SECTIONS): DefaultTheme.NavItem[] {
  return sections.map(({ label, slug }) => ({ activeMatch: `^/${slug}/`, link: `/${slug}/`, text: label }))
}

/**
 * Builds one sidebar group per section from its pages' own first headings, the
 * overview leading.
 *
 * Args:
 *   pagesDir : The folder the site's pages sit in.
 *   sections : The sections to build a group for.
 */
export function buildSidebar(
  pagesDir : string,
  sections : readonly Named[] = SECTIONS
): DefaultTheme.SidebarMulti {
  return Object.fromEntries(sections.map(({ label, slug }) => [`/${slug}/`, [{
    items : sectionPages(pagesDir, slug).map(({ link, title }) => ({ link, text: title })),
    text  : label
  }]]))
}
