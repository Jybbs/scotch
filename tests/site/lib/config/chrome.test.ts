import fs   from 'node:fs'
import path from 'node:path'

import { parse }                from 'smol-toml'
import { describe, expect, it } from 'vitest'

import * as chrome       from '../../../../docs/.vitepress/lib/config/chrome.ts'
import { repoRoot }      from '../../../../docs/.vitepress/lib/site/paths.ts'
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

  it('sets a white piece over each fact, from the King over the commit through the Bishop over the crate to the Pawn over the pieces', () => {
    expect(colophon.credits.map(credit => [credit.piece, credit.part, credit.short])).toEqual([
      ['K', 'Built from', '0123456'],
      ['Q', 'Code', 'Owner/game'],
      ['R', 'Games', 'PGN Mentor'],
      ['B', 'Crate', 'shakmaty, GPL'],
      ['N', 'Faces', 'SIL OFL 1.1'],
      ['P', 'Pieces', 'Cburnett, BSD']
    ])
  })

  it('spells each fact out in full as prose', () => {
    expect(colophon.credits.map(credit => textOf(credit.full))).toEqual([
      'Built from 0123456 of Owner/game.',
      'The code at Owner/game, under the GPL-3.0-or-later.',
      'Every game from the grandmaster files of PGN Mentor.',
      'Each key computed through the shakmaty crate, under the GPL-3.0-or-later.',
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
    'https://docs.rs/shakmaty',
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
    expect(pieces).toEqual(['Q', 'R', 'B', 'N', 'P'])
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

  it('reads each line as prose', () => {
    const lines = [colophon.rest, ...colophon.credits.map(credit => credit.full)]
    expect(lines.map(line => textOf(line)).join('\n')).toReadAsProse()
  })
})

describe('colophonOf, its crate', () => {
  it('credits a crate the manifest under rust/ depends on', () => {
    const file     = path.join(repoRoot(import.meta.url), 'rust', 'Cargo.toml')
    const manifest = parse(fs.readFileSync(file, 'utf8')) as { dependencies: Record<string, unknown> }
    const crate    = chrome.colophonOf(undefined, FACTS, [MENTOR]).credits.find(credit => credit.piece === 'B')!
    expect(Object.keys(manifest.dependencies)).toContain(crate.short.split(',')[0])
  })
})

describe('NOT_FOUND', () => {
  it('links a page the site builds, which no build check reads', () => {
    expect(pageAt(String(chrome.NOT_FOUND.link))).toBe('index.md')
  })

  it('sets its words as prose', () => {
    const { link: _, ...words } = chrome.NOT_FOUND
    expect(Object.values(words).join('\n')).toReadAsProse()
  })
})
