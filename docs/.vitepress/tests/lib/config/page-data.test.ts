import { describe, expect, it } from 'vitest'

import { ACTIONS, leadOf, pageData } from '../../../lib/config/page-data.ts'
import { pageAt }                    from '../../common/pages.ts'
import { test }                      from '../../common/repo.ts'

const built = (srcDir: string): { siteConfig: { srcDir: string } } => ({ siteConfig: { srcDir } })

describe('pageData', () => {
  test("lays the front page out on the home layout with the hero's buttons", ({ repo }) => {
    expect(pageData({ frontmatter: { kept: true }, relativePath: 'index.md' }, built(repo.root)))
      .toEqual({ frontmatter: { hero: { actions: ACTIONS }, kept: true, layout: 'home' } })
  })

  test('describes every other page by the first sentence of its prose', ({ repo }) => {
    repo.write('guide/store.md', '# The Store\n\nThe store holds games. It reads archives.\n')
    expect(pageData({ frontmatter: {}, relativePath: 'guide/store.md' }, built(repo.root)))
      .toEqual({ description: 'The store holds games.' })
  })

  test('leaves a page opening on no paragraph as it stands', ({ repo }) => {
    repo.write('guide/empty.md', '# Empty\n')
    expect(pageData({ frontmatter: {}, relativePath: 'guide/empty.md' }, built(repo.root))).toBeUndefined()
  })
})

describe('ACTIONS', () => {
  it.each(ACTIONS)('links $text to a page the site builds, which no build check reads', ({ link }) => {
    expect(pageAt(link)).toBeDefined()
  })
})

describe('leadOf', () => {
  it.each([
    ['# T\n\nOne sentence. Two sentences.', 'One sentence.'],
    ['# T\n\n*Scotch* reads `scotch.fyi` files.', 'Scotch reads scotch.fyi files.'],
    ['# T\n\nThe store holds <!-- games -->435,321<!-- /games --> games.', 'The store holds 435,321 games.'],
    ['# T\n\nA [link](other.md) and a citation.[^zobrist1970]', 'A link and a citation.'],
    ['# T\n\nNo closing stop', 'No closing stop'],
    ['# T\n\n```bash\ncode\n```\n\nAfter the code.', 'After the code.'],
    ['# T\n\nThe line\nwraps here.', 'The line wraps here.']
  ])('reads %j as %j', (markdown, lead) => {
    expect(leadOf(markdown)).toBe(lead)
  })

  it('finds no lead on a page opening on no paragraph', () => {
    expect(leadOf('# T\n\n<!-- region -->\n')).toBeUndefined()
  })
})
