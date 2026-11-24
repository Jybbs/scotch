import { createMarkdownRenderer } from 'vitepress'
import { describe, expect, it }   from 'vitest'

import { linkTerms } from '../../../../docs/.vitepress/lib/markdown/terms.ts'

const md    = await createMarkdownRenderer('/tmp', { config: linkTerms })
const PAGE  = { cleanUrls: true, relativePath: 'methods/runs.md' }
const LINK  = '<a href="/reference/terms#ply" class="sc-term" data-term="ply">'

describe('linkTerms', () => {
  it.each([
    [
      "links a term's first use on a page alone",
      'One ply, then another ply.\n',
      `One ${LINK}ply</a>, then another ply.`
    ],
    ['keeps the casing and the form of the word it finds', 'Plies add up.\n', `${LINK}Plies</a> add up.`],
    [
      "leaves a term in a heading or a column's header to the next use",
      '## The Ply\n\n| Ply |\n|---|\n| 1 |\n\nA ply.\n',
      `A ${LINK}ply</a>.`
    ],
    ['finds a key where an article opens it', 'The key holds.\n', 'data-term="key"']
  ])('%s', (_, page, link) => {
    expect(md.render(page, PAGE)).toContain(link)
  })

  it('counts a term once across the blocks of a page', () => {
    expect(md.render('One ply.\n\nAnother ply.\n', PAGE).match(/sc-term/gu)?.length).toBe(1)
  })

  it('links two terms of one sentence in the order they stand', () => {
    const page = md.render('A ply on the mainline.\n', PAGE)
    expect(page.indexOf('data-term="ply"')).toBeGreaterThan(-1)
    expect(page.indexOf('data-term="ply"')).toBeLessThan(page.indexOf('data-term="mainline"'))
  })

  it('leaves a term inside a link or a code span as it stands', () => {
    const page = md.render('[a ply](/a) and `ply` and then a ply.\n', PAGE)
    expect(page.match(/sc-term/gu)?.length).toBe(1)
    expect(page).toContain(`then a ${LINK}ply</a>.`)
  })

  it('leaves the terms page as it stands', () => {
    expect(md.render('One ply.\n', { relativePath: 'reference/terms.md' })).not.toContain('sc-term')
  })

  it('leaves a command named like a term as it stands', () => {
    expect(md.render('Key the board, then run the task.\n', PAGE)).not.toContain('sc-term')
  })

  it("links the format's name and leaves the provider's as it stands", () => {
    const page = md.render('The files PGN Mentor publishes, then a Portable Game Notation (PGN) file.\n', PAGE)
    expect(page).toContain('files PGN Mentor publishes')
    expect(page).toContain('(<a href="/reference/terms#pgn" class="sc-term" data-term="pgn">PGN</a>) file')
  })
})
