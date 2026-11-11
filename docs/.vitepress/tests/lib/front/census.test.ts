import { describe, expect, it } from 'vitest'

import { FIRST_CELL }                  from '../../../lib/data/decades.ts'
import type { Archive }                from '../../../lib/data/store.ts'
import { SQUARES, decadesOf, fillsOf } from '../../../lib/front/census.ts'

const FILES = [
  { address: 'players/Alekhine.zip', decades: { 1830: 2, 1840: 3, 1950: 10 }, name: 'Alekhine' },
  { address: 'players/Botvinnik.zip', decades: { 1950: 40, 1960: 9 }, name: 'Botvinnik' },
  { address: 'openings/Botvinnik.zip', decades: { 1960: 1 }, name: 'Botvinnik' }
] as unknown as Archive[]

describe('decadesOf', () => {
  const decades = decadesOf(FILES)

  it(`gathers every decade before ${FIRST_CELL} under the one before it`, () => {
    expect(decades.map(each => [each.decade, each.games])).toEqual([[1840, 5], [1950, 50], [1960, 10]])
  })

  it('names a gathered decade as the games before the first', () => {
    expect(decades[0]).toMatchObject({ name: 'Before 1850', short: '< 1850', when: 'before 1850' })
    expect(decades[1]).toMatchObject({ name: 'The 1950s', short: '1950s', when: 'in the 1950s' })
  })

  it('counts the files holding games from a decade, the most first', () => {
    expect(decades[1]).toMatchObject({
      files : 2,
      top   : [
        { decade: 1950, games: 40, name: 'Botvinnik' },
        { decade: 1950, games: 10, name: 'Alekhine' }
      ]
    })
  })

  it('counts two files of one name apart', () => {
    expect(decades[2]?.files).toBe(2)
  })

  it("reads the store's files by default", () => {
    expect(decadesOf().reduce((sum, each) => sum + each.games, 0)).toBeGreaterThan(0)
  })
})

describe('fillsOf', () => {
  const fills = fillsOf(decadesOf())

  it('fills every square whole', () => {
    const filled = Map.groupBy(fills, fill => fill.square)
    expect(filled.size).toBe(SQUARES)
    for (const [, parts] of filled) expect(parts.reduce((sum, fill) => sum + fill.share, 0)).toBeCloseTo(1)
  })

  it('carries a decade spilling past one square into the next', () => {
    const one = [{ decade: 1950, files: 1, games: 3, name: '', short: '', top: [], when: '' }]
    const two = [...one, { ...one[0]!, decade: 1960, games: 61 }]
    expect(fillsOf(two).slice(0, 5)).toEqual([
      { decade: 0, from: 0, share: 1, square: 0 },
      { decade: 0, from: 0, share: 1, square: 1 },
      { decade: 0, from: 0, share: 1, square: 2 },
      { decade: 1, from: 0, share: 1, square: 3 },
      { decade: 1, from: 0, share: 1, square: 4 }
    ])
  })

  it('starts a part where the one before it on the square ends', () => {
    const halves = [
      { decade: 1950, files: 1, games: 32.5, name: '', short: '', top: [], when: '' },
      { decade: 1960, files: 1, games: 31.5, name: '', short: '', top: [], when: '' }
    ]
    expect(fillsOf(halves).filter(fill => fill.square === 32)).toEqual([
      { decade: 0, from: 0, share: 0.5, square: 32 },
      { decade: 1, from: 0.5, share: 0.5, square: 32 }
    ])
  })
})
