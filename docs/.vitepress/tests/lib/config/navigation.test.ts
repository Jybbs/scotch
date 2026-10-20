import { describe, expect, it } from 'vitest'

import { buildNav, buildSidebar } from '../../../lib/config/navigation.ts'
import { SECTIONS }               from '../../../lib/site/sections.ts'
import { test }                   from '../../common/repo.ts'

describe('buildNav', () => {
  it('lists every section the registry declares under its own word, active on every page inside it', () => {
    const items = SECTIONS.map(({ label, slug }) => ({
      activeMatch : `^/${slug}/`,
      link        : `/${slug}/`,
      text        : label
    }))
    expect(buildNav()).toEqual(items)
  })
})

describe('buildSidebar', () => {
  test("groups each section's pages under it by their headings, the overview leading", ({ repo }) => {
    repo.write('pages/data/index.md', '# Data\n')
    repo.write('pages/data/lengths.md', '# Game Lengths\n')
    expect(buildSidebar(`${repo.root}/pages`, [{ label: 'Data', slug: 'data' }])).toEqual({
      '/data/': [{
        items : [{ link: '/data/', text: 'Data' }, { link: '/data/lengths', text: 'Game Lengths' }],
        text  : 'Data'
      }]
    })
  })
})
