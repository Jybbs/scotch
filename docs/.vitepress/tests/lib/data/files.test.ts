import { describe, expect, it } from 'vitest'

import * as files        from '../../../lib/data/files.ts'
import { SAMPLE_LISTED } from './fixtures/listed.ts'
import { SAMPLE_STORE }  from './fixtures/store.ts'

const entries = files.entriesOf(SAMPLE_LISTED)
const decades = files.decadesOf(files.sectionOf(entries, 'Players'))

/**
 * Finds the entry listed under `path`.
 */
function at(path: string): files.Entry {
  return entries.find(entry => entry.listed.file === path)!
}

describe('entriesOf', () => {
  it('files each listed file under its section by its file name without the extension', () => {
    expect(entries.map(entry => `${entry.section}:${entry.stem}`).slice(3, 6))
      .toEqual(['Players:Undated', 'Events:Candidates1950', 'Events:Linares1994'])
  })

  it('reads every file `scotch render docs` wrote by default', () => {
    expect(files.entriesOf()).toHaveLength(files.LISTED.length)
  })
})

describe('twinOf', () => {
  it('finds the file filed under one name in another section', () => {
    expect(files.twinOf(entries, at('players/Bird.zip'))).toBe(at('openings/Bird.zip'))
    expect(files.twinOf(entries, at('openings/Bird.zip'))).toBe(at('players/Bird.zip'))
  })

  it('finds none for a file whose name no other section holds', () => {
    expect(files.twinOf(entries, at('players/Morphy.zip'))).toBeNull()
  })
})

describe('matches', () => {
  it.each([
    { file: 'players/Morphy.zip', matched: true, query: 'morph' },
    { file: 'players/Morphy.zip', matched: true, query: 'paul' },
    { file: 'players/Morphy.zip', matched: false, query: 'tal' },
    { file: 'players/Morphy.zip', matched: true, query: '' }
  ])('reads $query against $file as $matched', ({ file, matched, query }) => {
    expect(files.matches(at(file), query)).toBe(matched)
  })
})

describe('decades and years', () => {
  it('spans every decade from the earliest Players games to the latest', () => {
    expect(decades).toEqual([1850, 1860, 1870, 1880, 1890, 1900, 1910, 1920, 1930, 1940, 1950, 1960,
      1970, 1980, 1990, 2000, 2010])
    expect(files.yearsOf(decades)).toEqual([1845, 2020])
  })

  it('spans no decade where no file is dated, and the years fall back to the store’s', () => {
    expect(files.decadesOf([at('players/Undated.zip')])).toEqual([])
    expect(files.yearsOf([])).toEqual([1845, 2030])
  })

  it('finds the mean year of a file’s games at each decade’s middle, and none for an undated one', () => {
    expect(files.meanYear(at('players/Bird.zip').listed)).toBeCloseTo((1855 * 3 + 1885 * 5) / 8)
    expect(files.meanYear(at('players/Undated.zip').listed)).toBeNull()
  })
})

describe('movesOf', () => {
  it('reads the moves an opening opens with, without move numbers or commas', () => {
    expect(files.movesOf(at('openings/Dragon.zip').listed)).toEqual(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4'])
    expect(files.movesOf(at('players/Bird.zip').listed)).toEqual([])
  })
})

describe('opening', () => {
  it.each([
    { file: 'players/Bird.zip', section: 'Players' },
    { file: 'events/WorldChamp2018.pgn', section: 'Events' },
    { file: 'openings/Bird.zip', section: 'Openings' }
  ] as const)('opens $section on $file', ({ file, section }) => {
    expect(files.opening(entries, section)).toBe(at(file))
  })

  it('opens a section with no twin on its busiest file, and Events with no title match on its first', () => {
    const lone = files.entriesOf(SAMPLE_LISTED.filter(file => !/Bird|WorldChamp/u.test(file.file)))
    expect(files.opening(lone, 'Players')?.stem).toBe('Carlsen')
    expect(files.opening(lone, 'Events')?.stem).toBe('Candidates1950')
  })
})

describe('cardOf', () => {
  it('shades a player’s decades against its busiest and names its first and last', () => {
    const card = files.cardOf(decades, entries, at('players/Bird.zip'))
    expect(card.cells.filter(Boolean)).toEqual([0.18 + 0.82 * 3 / 5, 1])
    expect(card.scale).toEqual([['1850s', 0], ['1880s', 3]])
    expect([card.games, card.rank, card.of, card.moves]).toEqual([8, 2, 4, []])
  })

  it('names one decade once where a player’s games fall in one', () => {
    expect(files.cardOf(decades, entries, at('players/Morphy.zip')).scale).toEqual([['1850s', 0]])
  })

  it('lights an event’s one decade and names its year', () => {
    const card = files.cardOf(decades, entries, at('events/WorldChamp1886.pgn'))
    expect(card.cells.filter(Boolean)).toEqual([1])
    expect(card.scale).toEqual([['1886', 3]])
  })

  it('names no decade for an undated file', () => {
    expect(files.cardOf(decades, entries, at('events/Nameless.pgn')).scale).toEqual([])
  })

  it('reads an opening’s moves as they are listed and its place among the Openings', () => {
    const card = files.cardOf(decades, entries, at('openings/Najdorf.zip'))
    expect([card.moves, card.rank, card.scale]).toEqual([['1.e4', 'c5', '2.Nf3', 'd6'], 0, []])
  })
})

describe('heading', () => {
  it.each([
    { file: 'players/Bird.zip', heading: '1850s–1880s' },
    { file: 'players/Morphy.zip', heading: '1850s' },
    { file: 'players/Undated.zip', heading: 'Undated' },
    { file: 'events/Linares1994.pgn', heading: 'Tournaments' },
    { file: 'openings/QGD.zip', heading: 'Closed' }
  ])('names $file under $heading', ({ file, heading }) => {
    expect(files.heading(at(file))).toBe(heading)
  })

  it('names a file with no heading by its section', () => {
    const nameless = at('events/Nameless.pgn')
    expect(files.heading({ ...nameless, listed: { ...nameless.listed, group: null } })).toBe('Events')
  })
})

describe('LEGENDS', () => {
  it.each(files.SECTIONS)('reads the %s legend as prose', section => {
    expect(files.LEGENDS[section]).toReadAsProse()
  })
})

describe('largestReading and largestSummary', () => {
  it.each([
    { picked: null, reading: 'Read from 4 files · 18 games indexed' },
    { picked: 0, reading: 'Kasparov · 8 games · 44.4% of the store' }
  ])('reads row $picked as $reading', ({ picked, reading }) => {
    expect(files.largestReading(4, picked, SAMPLE_STORE.largest)).toBe(reading)
  })

  it('names no share held where the store holds no file', () => {
    const summary = files.largestSummary(0, [])
    expect(summary).toBe('Games indexed from 0 files, the top 0 holding 0.0% of them '
                       + 'and every other file the rest.')
  })

  it('names the files and the share the top ones hold', () => {
    const summary = files.largestSummary(4, SAMPLE_STORE.largest)
    expect(summary).toBe('Games indexed from 4 files, the top 2 holding 72.2% of them '
                       + 'and every other file the rest.')
    expect(summary).toReadAsProse()
  })
})
