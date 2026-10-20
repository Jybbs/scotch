import { describe, expect } from 'vitest'

import { sectionPages, titleOf } from '../../../lib/site/pages.ts'
import { test }                  from '../../common/repo.ts'

describe('titleOf', () => {
  test('reads the first heading a page opens on', ({ repo }) => {
    expect(titleOf(repo.write('page.md', 'Intro\n\n# The Title  \n\n## Later\n'))).toBe('The Title')
  })

  test('fails where a page carries no first heading', ({ repo }) => {
    const file = repo.write('page.md', '## Only Later\n')
    expect(() => titleOf(file)).toThrow(`no first heading in ${file}`)
  })
})

describe('sectionPages', () => {
  test('leads on the overview and orders the rest by title, each at its clean address', ({ repo }) => {
    repo.write('pages/guide/index.md', '# Guide\n')
    repo.write('pages/guide/zeta.md', '# Adding a Source\n')
    repo.write('pages/guide/alpha.md', '# The Store\n')
    expect(sectionPages(`${repo.root}/pages`, 'guide')).toEqual([
      { link: '/guide/', title: 'Guide' },
      { link: '/guide/zeta', title: 'Adding a Source' },
      { link: '/guide/alpha', title: 'The Store' }
    ])
  })
})
