import { describe, expect, it } from 'vitest'

import * as numbers from '../../../lib/data/numbers.ts'
import * as tags    from '../../../lib/data/tags.ts'

const ROUND  = tags.TAGS.names.indexOf('Round')
const EIGHTY = tags.COLUMNS.findIndex(column => column.name === '1980s')
const EVERY  = tags.COLUMNS.length - 1

describe('the grid of tags', () => {
  it('reads a decade’s gap and its files, and every game’s gap from the counts alone', () => {
    const gap = tags.gapOf({ column: EIGHTY, tag: ROUND })
    expect(gap.missing).toBe(tags.COLUMNS[EIGHTY]!.games - tags.COLUMNS[EIGHTY]!.tags.Round!)
    expect(gap.files[0]).toEqual({ count: 472, path: 'players/Hort.zip' })
    expect(tags.gapOf({ column: EVERY, tag: ROUND })).toEqual({
      decade  : 'Every game',
      files   : [],
      missing : tags.TAGS.every.games - tags.TAGS.every.tags.Round!,
      tag     : 'Round'
    })
  })

  it('draws a tag missing from at least half a percent of a column’s games as a gap', () => {
    const cells = tags.COLUMNS.flatMap((_, column) => tags.TAGS.names.map((__, tag) => ({ column, tag })))
    expect(cells.every(cell => tags.isGap(cell) === tags.missingShare(cell) >= 0.005)).toBe(true)
    expect(tags.isGap({ column: EIGHTY, tag: ROUND })).toBe(true)
    expect(tags.isGap({ column: EVERY, tag: tags.TAGS.names.indexOf('White') })).toBe(false)
  })

  it.each([
    ['ArrowRight', { column: 1, tag: 0 }],
    ['ArrowDown', { column: 0, tag: 1 }],
    ['ArrowLeft', { column: 0, tag: 0 }],
    ['ArrowUp', { column: 0, tag: 0 }],
    ['Tab', undefined]
  ])('steps the cell at the corner on %s', (key, to) => {
    expect(tags.carriedStepped({ column: 0, tag: 0 }, key)).toEqual(to)
  })

  it('writes the sentence the grid reads, naming the file holding the most of a gap', () => {
    expect(tags.carriedSentence({ column: EIGHTY, tag: ROUND })).toBe(
      'Of the 48,522 games of the 1980s, 27,292 carry no Round tag with a value, the most of them in '
      + 'players/Hort.zip.'
    )
    expect(tags.carriedSentence({ column: EVERY, tag: ROUND }))
      .toMatch(/^Of the [\d,]+ stored games, [\d,]+ carry no Round tag with a value\.$/u)
  })
})

describe('the bands of dates and ratings', () => {
  const layout = tags.datedLayout(800)

  it('splits each decade into tiers that sum to the whole', () => {
    for (const column of tags.COLUMNS) {
      const { dates, ratings } = tags.datedParts(column)
      expect(numbers.summed(dates)).toBeCloseTo(1)
      expect(numbers.summed(ratings)).toBeCloseTo(1)
    }
  })

  it('finds the decade under a point, held to the decades drawn, and shortens the bands on a phone', () => {
    expect(tags.datedAt(layout, layout.left + 2.5 * layout.cell)).toBe(2)
    expect(tags.datedAt(layout, -40)).toBe(0)
    expect(tags.datedAt(layout, 5000)).toBe(tags.TAGS.decades.length - 1)
    expect(tags.datedLayout(400).band).toBeLessThan(layout.band)
    expect(tags.datedLayout(0).cell).toBe(0)
  })

  it('writes the sentence the bands read', () => {
    const { dates, ratings } = tags.datedParts(tags.TAGS.every)
    expect(tags.datedSentence(tags.TAGS.every)).toBe(
      `Of the ${numbers.counted(tags.TAGS.every.games)} stored games, ${numbers.percent(dates[0]!)} carry a `
      + `date naming the day and ${numbers.percent(ratings[0]!)} carry both ratings, while `
      + `${numbers.percent(ratings[2]!)} carry neither.`
    )
  })
})
