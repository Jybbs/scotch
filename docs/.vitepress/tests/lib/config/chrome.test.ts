import { describe, expect, it } from 'vitest'

import * as chrome       from '../../../lib/config/chrome.ts'
import { textOf }        from '../../common/colophon.ts'
import { pageAt }        from '../../common/pages.ts'
import { FACTS, MENTOR } from '../../common/repo.ts'

function linksOf(colophon: chrome.Colophon): string[] {
  return [colophon.rest, ...colophon.credits.map(credit => credit.full)]
    .flat()
    .flatMap(run => typeof run === 'string' || run.href === undefined ? [] : [run.href])
}

describe('colophonOf', () => {
  const colophon = chrome.colophonOf('0123456', FACTS, [MENTOR])

  it('sets a white piece over each fact, from the King over the commit to the Pawn over the pieces', () => {
    expect(colophon.credits.map(credit => [credit.piece, credit.part, credit.short])).toEqual([
      ['K', 'Built from', '0123456'],
      ['Q', 'Code', 'Owner/game'],
      ['R', 'Games', 'PGN Mentor'],
      ['N', 'Faces', 'SIL OFL 1.1'],
      ['P', 'Pieces', 'Cburnett, BSD']
    ])
  })

  it('spells each fact out in full as prose', () => {
    expect(colophon.credits.map(credit => textOf(credit.full))).toEqual([
      'Built from 0123456 of Owner/game.',
      'The code at Owner/game, under the GPL-3.0-or-later.',
      'Every game from the grandmaster files of PGN Mentor.',
      'Petrona, JetBrains Mono, and Hedvig Letters Serif, under the SIL Open Font License 1.1.',
      'Pieces drawn by Cburnett, under the 3-clause BSD license.'
    ])
  })

  it('reads the version and the license until a piece is chosen', () => {
    expect(textOf(colophon.rest)).toBe('Scotch 1.2.3, under the GPL-3.0-or-later.')
  })
})

describe('colophonOf, its links and its edges', () => {
  const colophon = chrome.colophonOf('0123456', FACTS, [MENTOR])

  it.each([
    'https://github.com/Owner/game/commit/0123456',
    'https://github.com/Owner/game',
    'https://www.gnu.org/licenses/gpl-3.0.html',
    'https://www.pgnmentor.com/',
    'https://openfontlicense.org',
    'https://commons.wikimedia.org/wiki/File:Chess_klt45.svg'
  ])('links %s', address => {
    expect(linksOf(colophon)).toContain(address)
  })

  it('links no file or folder on GitHub, which moves with the branch', () => {
    expect(linksOf(colophon).join(' ')).not.toMatch(/\/(?:tree|blob)\//u)
  })

  it('leaves the King out where the build knows no commit', () => {
    const pieces = chrome.colophonOf(undefined, FACTS, [MENTOR]).credits.map(credit => credit.piece)
    expect(pieces).toEqual(['Q', 'R', 'N', 'P'])
  })

  const b = { home: 'https://b.org/', name: 'B' }
  const c = { home: 'https://c.org/', name: 'C' }

  it.each([
    [[MENTOR, b], 'PGN Mentor and B'],
    [[MENTOR, b, c], 'PGN Mentor, B, and C']
  ])('lists every provider the sources name', (providers, short) => {
    const games = chrome.colophonOf('0123456', FACTS, providers).credits[2]!
    expect(games.short).toBe(short)
    expect(textOf(games.full)).toBe(`Every game from the grandmaster files of ${short}.`)
  })

  it('fails by name on a license the site knows no page for', () => {
    expect(() => chrome.colophonOf('0123456', { ...FACTS, license: 'MIT' }, [MENTOR])).toThrow(/MIT/u)
  })

  const lines = [colophon.rest, ...colophon.credits.map(credit => credit.full)]

  it.each(lines.map(line => textOf(line)))('reads %s as prose', line => {
    expect(line).toReadAsProse()
  })
})

describe('NOT_FOUND', () => {
  it('links a page the site builds, which no build check reads', () => {
    expect(pageAt(String(chrome.NOT_FOUND.link))).toBe('index.md')
  })

  const words = Object.entries(chrome.NOT_FOUND).filter(([key]) => key !== 'link')

  it.each(words)('sets its %s as prose', (_, text) => {
    expect(text).toReadAsProse()
  })
})
