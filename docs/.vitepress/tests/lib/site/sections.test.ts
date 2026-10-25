import { describe, expect, it } from 'vitest'

import { ROLES }               from '../../../lib/identity/roles.ts'
import { SECTIONS, sectionOf } from '../../../lib/site/sections.ts'
import { pageText }            from '../../common/pages.ts'

describe('SECTIONS', () => {
  it.each(SECTIONS)('opens the $label section on an overview headed $label in $slug/', ({ label, slug }) => {
    expect(pageText(`${slug}/index.md`)).toMatch(new RegExp(`^# ${label}$`, 'mu'))
  })

  it('names each section by the word its folder carries, capitalized', () => {
    expect(SECTIONS.map(({ label }) => label.toLowerCase())).toEqual(SECTIONS.map(({ slug }) => slug))
  })

  it('lists the sections alphabetically', () => {
    expect(SECTIONS.map(({ slug }) => slug)).toEqual(SECTIONS.map(({ slug }) => slug).toSorted())
  })

  it('accents each section in a color of its own, never a game\'s or the run\'s', () => {
    const colors: readonly string[] = SECTIONS.map(({ color }) => color)
    const taken                     = [ROLES.run.light, ROLES.stored.light, ROLES.submitted.light]
    expect(new Set(colors).size).toBe(colors.length)
    expect(taken.filter(color => colors.includes(color))).toEqual([])
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
