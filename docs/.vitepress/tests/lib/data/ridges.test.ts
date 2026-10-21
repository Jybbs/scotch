import { describe, expect, it } from 'vitest'

import * as ridges             from '../../../lib/data/ridges.ts'
import { SAMPLE_STORE, SMALL } from './fixtures/store.ts'

const all    = ridges.ridgesOf(SAMPLE_STORE, SMALL)
const layout = ridges.ridgesLayout(3, 300)

describe('ridgesOf', () => {
  it('gathers every decade before 1900 into the first ridge and names each by its decade', () => {
    expect(all.map(ridge => [ridge.name, ridge.label, ridge.phrase])).toEqual([
      ['Before 1900', 'BEFORE 1900', 'played before 1900'],
      ['1900s', '1900S', 'of the 1900s'],
      ['2000s', '2000S', 'of the 2000s']
    ])
  })

  it("counts each ridge's games by moves, every game past the limit counting at it", () => {
    expect(all.map(ridge => [ridge.counts, ridge.games])).toEqual([
      [[0, 3, 3, 1], 7], [[1, 0, 3, 4], 8], [[0, 0, 2, 8], 10]
    ])
  })

  it('raises each ridge to its own peak, weighing each move twice beside its neighbors', () => {
    expect(all[0]!.heights).toEqual([0, 0.9, 1, 0.5])
  })

  it("finds the fewest moves a quarter, half, and three quarters of each ridge's games end by", () => {
    expect(all.map(ridge => ridge.quartiles)).toEqual([[1, 2, 2], [2, 2, 3], [3, 3, 3]])
  })

  it('draws a decade holding no games flat', () => {
    const store = { ...SAMPLE_STORE, eras: [{ decade: 1950, moves: [0, 0, 0], name: '1950s' }] }
    expect(ridges.ridgesOf(store, SMALL)[0]!.heights).toEqual([0, 0, 0, 0])
  })

  it('draws no gathered ridge where no decade falls before the first', () => {
    expect(ridges.ridgesOf(SAMPLE_STORE, SMALL, 1800).map(ridge => ridge.name))
      .toEqual(['1840s', '1850s', '1900s', '2000s'])
  })
})

describe('ridgeSummary', () => {
  it.each([
    {
      picked  : 2,
      summary : 'The games of the 2000s run longest, half of them ending by move 3, '
              + 'against move 2 for the games played before 1900.'
    },
    {
      picked  : 0,
      summary : 'The games played before 1900 run shortest, half of them ending by move 2, '
              + 'against move 3 for the games of the 2000s.'
    },
    {
      picked  : 1,
      summary : 'The games of the 1900s run shortest, half of them ending by move 2, '
              + 'against move 3 for the games of the 2000s.'
    }
  ])('sets ridge $picked against the latest and the earliest medians', ({ picked, summary }) => {
    expect(ridges.ridgeSummary(all, picked)).toBe(summary)
    expect(summary).toReadAsProse()
  })

  it('sets a ridge between the latest and the earliest medians against both', () => {
    const summary = ridges.ridgeSummary(ridges.ridgesOf(SAMPLE_STORE, SMALL, 1800), 1)
    expect(summary).toBe('Half the games of the 1850s end by move 2, against move 3 for the games '
                       + 'of the 2000s and move 1 for those of the 1840s.')
    expect(summary).toReadAsProse()
  })
})

describe('ridgeReading', () => {
  it("reads a ridge's name, median, middle half, and the share ended by the move", () => {
    expect(ridges.ridgeReading(all[1]!, 2, SMALL)).toEqual([
      ['Decade', '1900s'], ['Median move', '2'], ['Middle half', '2 to 3'],
      ['Ended by the move', '50%', 'by move 2']
    ])
  })
})

describe('ridgesLayout', () => {
  it('stacks the ridges a pitch apart under room for the first to rise, over the axis', () => {
    expect(layout).toEqual({ height: 128, left: 92, pitch: 24, plot: 198, rise: 46, top: 50, width: 300 })
  })
})

describe('ridgeAt', () => {
  it.each([
    { at: { move: 1, row: 0 }, x: 92, y: 50 },
    { at: { move: 1, row: 0 }, x: 92, y: 53 },
    { at: { move: 1, row: 1 }, x: 92, y: 54 },
    { at: { move: 2, row: 1 }, x: 191, y: 74 },
    { at: { move: 3, row: 2 }, x: 1000, y: 1000 },
    { at: { move: 1, row: 0 }, x: 0, y: 0 }
  ])('finds $at under the point $x, $y', ({ at, x, y }) => {
    expect(ridges.ridgeAt(3, layout, x, y, SMALL)).toEqual(at)
  })
})

describe('medianRule', () => {
  it("rules the median from the ridge's baseline up to 4 pixels above its line", () => {
    expect(ridges.medianRule(all[0]!, layout, 0)).toEqual({ height: 50, x: 190.5, y: 0 })
  })

  it('stands a rule 4 pixels tall on the baseline where the median falls past the moves drawn', () => {
    const late = { ...all[0]!, quartiles: [1, 9, 9] as [number, number, number] }
    expect(ridges.medianRule(late, layout, 1)).toEqual({ height: 4, x: 652.5, y: 70 })
  })
})

describe('ridgePath', () => {
  const ridge = all[0]!

  it("runs a ridge's line along its heights over its baseline", () => {
    expect(ridges.ridgePath(ridge, layout, 0)).toBe('M125 8.6L191 4L257 27')
  })

  it('closes a ridge back along its baseline for its fill', () => {
    expect(ridges.ridgePath(ridge, layout, 1, true)).toBe('M125 32.6L191 28L257 51L257 74L125 74Z')
  })
})

describe('ridgeBase', () => {
  it("sets each ridge's baseline a pitch below the one above it", () => {
    expect([0, 2].map(row => ridges.ridgeBase({ pitch: 24, top: 50 }, row))).toEqual([50, 98])
  })
})
