import { describe, expect, it } from 'vitest'

import * as files       from '../../../lib/data/files.ts'
import { SAMPLE_STORE } from './fixtures/store.ts'

const players = files.playersOf(SAMPLE_STORE)
const karpov  = players.find(player => player.name === 'Karpov')!

describe('playersOf', () => {
  it('lists each archive under the name the store files it under, in the order of their names', () => {
    expect(players.map(player => player.name)).toEqual(['Anderssen', 'Karpov', 'Kasparov', 'Morphy'])
  })

  it('takes the name the store records rather than reading it off the address', () => {
    const store = { ...SAMPLE_STORE, files: [{ ...SAMPLE_STORE.files[0]!, name: 'Tal' }] }
    expect(files.playersOf(store)[0]!.name).toBe('Tal')
  })
})

describe('initials', () => {
  it('lists the initials in order and finds the one whose archives hold the most games', () => {
    expect([files.initialsOf(players), files.busiest(players)]).toEqual([['A', 'K', 'M'], 'K'])
  })

  it('opens on the earlier initial where two hold as many games', () => {
    const tied = [{ ...karpov, games: 5, name: 'Tal' }, { ...karpov, games: 5, name: 'Anand' }]
    expect(files.busiest(files.playersOf({ ...SAMPLE_STORE, files: tied }))).toBe('A')
  })

  it("ranks an initial's archives by their games", () => {
    expect(files.rankedUnder(players, 'K').map(player => player.name)).toEqual(['Kasparov', 'Karpov'])
  })
})

describe('largestReading and largestSummary', () => {
  it.each([
    { picked: null, reading: 'Read from 4 archives · 18 games indexed' },
    { picked: 0, reading: 'Kasparov · 8 games · 44.4% of the store' }
  ])('reads row $picked as $reading', ({ picked, reading }) => {
    expect(files.largestReading(4, picked, SAMPLE_STORE.largest)).toBe(reading)
  })

  it('names no share held where the store holds no archive', () => {
    const summary = files.largestSummary(0, [])
    expect(summary).toBe('Games indexed from 0 archives, the top 0 holding 0.0% of them '
                       + 'and every other archive the rest.')
  })

  it('names the archives and the share the top ones hold', () => {
    const summary = files.largestSummary(4, SAMPLE_STORE.largest)
    expect(summary).toBe('Games indexed from 4 archives, the top 2 holding 72.2% of them '
                       + 'and every other archive the rest.')
    expect(summary).toReadAsProse()
  })
})

describe('playedSpan', () => {
  it.each([
    { player: karpov, span: 'Karpov, played 1900s to 2000s' },
    { player: { ...karpov, decades: { 1830: 4 } }, span: 'Karpov, played in the 1830s' },
    { player: { ...karpov, decades: {} }, span: 'Karpov' }
  ])('names the decades $span', ({ player, span }) => {
    expect(files.playedSpan(player)).toBe(span)
  })
})

describe('curveSpan', () => {
  it.each([
    { earliest: 1850, span: { high: 2000, low: 1850 } },
    { earliest: 2100, span: { high: 2000, low: 2100 } }
  ])('runs the curves across $span from $earliest', ({ earliest, span }) => {
    expect(files.curveSpan(SAMPLE_STORE, earliest)).toEqual(span)
  })
})

describe('curvePath', () => {
  const span = { high: 2000, low: 1900 }

  it("rises at each decade to the player's games against their busiest decade", () => {
    const line = files.curvePath(karpov, span)
    expect([line.split('L').length, line.slice(0, 4), line.slice(-8)]).toEqual([11, 'M0 3', 'L120 9.2'])
  })

  it('closes the curve along the foot of its box for its fill', () => {
    expect(files.curvePath(karpov, span, true)).toMatch(/L120 9\.2L120 22L0 22Z$/u)
  })

  it('counts a decade the record leaves empty as no games', () => {
    const gap = { ...karpov, decades: { 1900: undefined, 2000: 2 } }
    expect(files.curvePath(gap, span).slice(0, 7)).toBe('M0 21.5')
  })

  it('reaches the top of its box at the busiest decade it draws, past a busier one before the span', () => {
    const early = { ...karpov, decades: { 1890: 50, 1900: 10, 2000: 5 } }
    expect(files.curvePath(early, span).slice(0, 4)).toBe('M0 3')
  })

  it('draws a player with no games in the span flat along the foot of its box', () => {
    const early = { ...karpov, decades: { 1800: 4 } }
    expect(files.curvePath(early, span)).toMatch(/^M0 21\.5(?:L\d+ 21\.5){10}$/u)
  })

  it('draws one point where the span holds one decade', () => {
    expect(files.curvePath(karpov, { high: 1900, low: 1900 })).toBe('M0 3')
  })
})

describe('yearAt', () => {
  it.each([
    { at: 0, span: { high: 2000, low: 1900 }, year: 1900 },
    { at: 50, span: { high: 2000, low: 1900 }, year: 1950 },
    { at: 0, span: { high: 1900, low: 1900 }, year: 1900 }
  ])('places $year at $at percent across $span', ({ at, span, year }) => {
    expect(files.yearAt(span, year)).toBe(at)
  })
})
