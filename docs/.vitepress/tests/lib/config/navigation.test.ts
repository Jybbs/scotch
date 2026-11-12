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

  test("orders a section's pages after its overview as the section's order lists them", ({ repo }) => {
    repo.write('pages/guide/index.md', '# Guide\n')
    repo.write('pages/guide/setup.md', '# Setting Up\n')
    repo.write('pages/guide/matching.md', '# Matching a Game\n')
    expect(buildSidebar(`${repo.root}/pages`, [{ label: 'Guide', order: ['setup', 'matching'], slug: 'guide' }]))
      .toEqual({
        '/guide/': [{
          items : [
            { link: '/guide/', text: 'Guide' },
            { link: '/guide/setup', text: 'Setting Up' },
            { link: '/guide/matching', text: 'Matching a Game' }
          ],
          text  : 'Guide'
        }]
      })
  })
})
