import { describe, expect, it } from 'vitest'

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
})

describe('sectionOf', () => {
  it.each(SECTIONS)('finds the $label section for a page in its folder', section => {
    expect(sectionOf(`${section.slug}/page.md`)).toBe(section)
  })

  it.each(['index.md', '404.md', 'database/index.md'])('finds no section for %s', page => {
    expect(sectionOf(page)).toBeUndefined()
  })
})
