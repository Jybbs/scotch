import { describe, expect, it } from 'vitest'

import { ROLES }               from '../../../../docs/.vitepress/lib/identity/roles.ts'
import { SECTIONS, sectionOf } from '../../../../docs/.vitepress/lib/site/sections.ts'
import { pageText }            from '../../common/pages.ts'

const ordered = SECTIONS.flatMap(({ slug, ...section }) =>
  ('order' in section ? section.order : []).map(stem => ({ page: `${slug}/${stem}.md` })))

describe('SECTIONS', () => {
  it.each(SECTIONS)('opens the $label section on an overview headed $label in $slug/', ({ label, slug }) => {
    expect(pageText(`${slug}/index.md`)).toMatch(new RegExp(`^# ${label}$`, 'mu'))
  })

  it('names each section by the word its folder carries, capitalized', () => {
    expect(SECTIONS.map(({ label }) => label.toLowerCase())).toEqual(SECTIONS.map(({ slug }) => slug))
  })

  it('lists the sections in the order a reader takes them', () => {
    expect(SECTIONS.map(({ slug }) => slug)).toEqual(['identity', 'data', 'guide', 'methods', 'viewer', 'reference', 'develop'])
  })

  it.each(ordered)('orders a page its section carries, $page', ({ page }) => {
    expect(pageText(page)).toMatch(/^# /mu)
  })

  it('accents each section in a color of its own, never the run\'s', () => {
    const colors: readonly unknown[] = SECTIONS.map(({ color }) => color)
    expect(new Set(colors).size).toBe(colors.length)
    expect(colors).not.toContain(ROLES.run.light)
  })
})

describe('sectionOf', () => {
  it.each(SECTIONS)('finds the $label section for a page in its folder', section => {
    expect(sectionOf(`${section.slug}/page.md`)).toBe(section)
  })

  it.each(['index.md', '404.md', 'database/index.md'])('finds no section for %s', page => {
    expect(sectionOf(page)).toBeUndefined()
  })
})
