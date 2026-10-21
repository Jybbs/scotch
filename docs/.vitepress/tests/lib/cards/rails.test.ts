import { describe, expect, it } from 'vitest'

import * as rails from '../../../lib/cards/rails.ts'

const COLORS = {
  run       : ['#e3c3a3', '#1e7634'],
  shade     : '#1a1a1a',
  stored    : '#a17b0d',
  submitted : '#1e69a6'
} as const
const RUN = { length: 6, start: 7 } as const

describe('merged', () => {
  it.each([
    [3, 0],
    [4, 0],
    [5, 1 / 3 ** 2 * (3 - 2 / 3)],
    [7, 1],
    [12, 1],
    [13, 1 - 1 / 3 ** 2 * (3 - 2 / 3)],
    [16, 0]
  ])('closes the rails at column %d to %d', (column, share) => {
    expect(rails.merged(column, RUN)).toBeCloseTo(share, 6)
  })

  it('closes the rails over the columns before the run, never opening them back up on the way', () => {
    const shares = [4, 5, 6, 7].map(column => rails.merged(column, RUN))
    expect(shares).toEqual(shares.toSorted((a, b) => a - b))
  })
})

describe('squares', () => {
  const drawn = rails.squares({ colors: COLORS, ...RUN })

  it('draws one square for each column of the run and two for every other column', () => {
    expect(drawn).toHaveLength(24 * 2 - RUN.length)
  })

  it("fills the run in the light column's color and every second column's in the dark column's", () => {
    const run = drawn.filter(square => COLORS.run.includes(square.fill as never))
    expect(run.map(square => square.fill)).toEqual([1, 0, 1, 0, 1, 0].map(dark => COLORS.run[dark]))
  })

  it("darkens each game's square on every second column toward the shade", () => {
    expect(drawn.slice(0, 4).map(square => square.fill)).toEqual(['#a17b0d', '#1e69a6', '#816410', '#1d5684'])
  })

  it('sets the stored game above the center line and the submitted game below it', () => {
    const [stored, submitted] = drawn
    expect(stored!.y + stored!.size / 2).toBeLessThan(rails.RAILS.middle)
    expect(submitted!.y + submitted!.size / 2).toBeGreaterThan(rails.RAILS.middle)
  })

  it('takes as many columns as it is given', () => {
    expect(rails.squares({ colors: COLORS, columns: 10, length: 2, start: 4 })).toHaveLength(18)
  })
})
