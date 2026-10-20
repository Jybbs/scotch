import { describe, expect, it } from 'vitest'

import * as decades     from '../../../lib/data/decades.ts'
import { SAMPLE_STORE } from './fixtures/store.ts'

const strip = decades.stripOf(SAMPLE_STORE)

describe('stripOf', () => {
  it('gathers every decade before 1850 into the first cell and gives each later one a cell', () => {
    expect(strip.decades).toEqual([
      { games: 2, label: '<1850', name: 'Before 1850' },
      { decade: 1850, games: 5, label: '1850s', name: '1850s' },
      { decade: 1900, games: 8, label: '1900s', name: '1900s' },
      { decade: 2000, games: 10, label: '2000s', name: '2000s' }
    ])
  })

  it('runs the dated games into their totals and finds the cells holding each quarter', () => {
    expect([strip.dated, strip.held, strip.quartiles]).toEqual([25, [2, 7, 15, 25], [1, 2, 3]])
  })

  it('gives every decade a cell of its own where none falls before the first', () => {
    expect(decades.stripOf(SAMPLE_STORE, 1800).decades.map(decade => decade.label)).toEqual([
      '<1800', '1840s', '1850s', '1900s', '2000s'
    ])
  })
})

describe('stripLayout', () => {
  it('starts each cell on a whole pixel at the floor of the pitch where each takes at least eight', () => {
    expect(decades.stripLayout(4, 403)).toEqual({
      band   : { height: 22, top: 30 },
      height : 78,
      starts : [0, 100, 200, 300, 400],
      width  : 400
    })
  })

  it.each([
    [33, [0, 8, 16, 24, 32]],
    [31, [0, 8, 16, 23, 31]],
    [30, [0, 8, 15, 23, 30]]
  ])('spaces the cells across %i pixels on whole pixels while each takes eight or more', (width, starts) => {
    expect(decades.stripLayout(4, width).starts).toEqual(starts)
  })
})

describe('stripReading', () => {
  it.each([
    { picked: null, reading: '25 dated games · quartiles in the 1850s, 1900s, and 2000s' },
    { picked: 1, reading: '1850s · 5 games · 28.0% played by its end' }
  ])('reads $picked as $reading', ({ picked, reading }) => {
    expect(decades.stripReading(strip, picked)).toBe(reading)
  })
})

describe('stripSummary', () => {
  it('names the median decade and the decades holding the middle half', () => {
    const summary = decades.stripSummary(strip)
    expect(summary).toBe('Half of the stored games with a known date were played by the end of the 1900s, '
                       + 'and the middle half between the 1850s and the 2000s.')
    expect(summary).toReadAsProse()
  })
})

describe('stripTicks', () => {
  it('names the first and the last cell and each named decade the strip holds, once each', () => {
    expect(decades.stripTicks(strip)).toEqual([0, 2, 3])
  })
})

describe('pawnAt', () => {
  it('stands the pawn on its baseline at the height given, centered on its point', () => {
    expect(decades.pawnAt(10, 20)).toBe('translate(-1.43 -0.32) scale(0.5079)')
  })

  it('reads the pawn as an outline python-chess draws', () => {
    expect(decades.pawn).toMatch(/^M22\.5 9c/u)
  })
})

describe('cellWidth and cellMiddle', () => {
  const layout = decades.stripLayout(4, 403)

  it("draws a cell a pixel short of the next cell's start and centers it on a whole pixel", () => {
    expect([decades.cellWidth(layout, 1), decades.cellMiddle(layout, 1)]).toEqual([99, 150])
  })

  it('centers a cell of an odd width on the whole pixel left of its middle', () => {
    expect(decades.cellMiddle(decades.stripLayout(4, 31), 2)).toBe(19)
  })

  it('draws a cell 0 wide where two edges meet', () => {
    expect(decades.cellWidth({ ...layout, starts: [0, 0] }, 0)).toBe(0)
  })
})
