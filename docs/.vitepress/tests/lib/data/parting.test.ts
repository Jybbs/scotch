import { describe, expect, it } from 'vitest'

import * as numbers from '../../../lib/data/numbers.ts'
import * as parting from '../../../lib/data/parting.ts'

const SMALL: parting.Parting = {
  alone   : [0, 2, 4, 2],
  games   : 10,
  half    : 2,
  name    : '1990s',
  playing : [10, 10, 8, 0],
  sharing : [10, 8, 4, 0]
}

const every = parting.SHARED.every

describe('the shares of a parting', () => {
  it('reads the share still sharing among the games still playing, and none once none play', () => {
    expect([0, 1, 2, 3].map(move => parting.sharingAt(SMALL, move))).toEqual([1, 0.8, 0.5, 0])
  })

  it('reads the share of every game first standing alone at a move', () => {
    expect(parting.aloneAt(SMALL, 2)).toBe(0.4)
  })

  it.each([
    [0.25, 2],
    [0.5, 2],
    [0.75, 3],
    [0.9, null]
  ])('finds the move by which %f of the games stand alone, or none past the last move', (share, move) => {
    expect(parting.aloneBy(SMALL, share)).toBe(move)
  })

  it('writes the moves the middle half parts between, a dash for a share never reached', () => {
    expect(parting.middleHalf(SMALL)).toBe('2 to 3')
    expect(parting.middleHalf({ ...SMALL, alone: [0, 1, 0, 0] })).toBe('– to –')
  })

  it('matches the move half of every stored game stands alone by to the one the index wrote', () => {
    expect(parting.aloneBy(every, 0.5)).toBe(every.half)
    expect(parting.SHARED.decades.every(decade => parting.aloneBy(decade, 0.5) === decade.half)).toBe(true)
  })
})

describe('the parting charts', () => {
  const layout = parting.partingLayout(600)

  it('stands each move along the plot and finds the move nearest a point, held to the moves drawn', () => {
    expect(parting.moveOn(layout, 0)).toBe(layout.left)
    expect(parting.moveOn(layout, parting.LAST_MOVE)).toBe(layout.left + layout.plot)
    expect(parting.moveNear(layout, parting.moveOn(layout, 17) + 2)).toBe(17)
    expect(parting.moveNear(layout, -50)).toBe(0)
    expect(parting.moveNear(layout, 5000)).toBe(parting.LAST_MOVE)
  })

  it('draws the line shorter on a phone', () => {
    expect(parting.partingLayout(400).tall).toBeLessThan(layout.tall)
    expect(layout.height).toBeGreaterThan(layout.base)
  })

  it('writes the sentence each chart reads', () => {
    expect(parting.partingSentence(10)).toBe(
      `At move 10, ${numbers.percent(parting.sharingAt(every, 10))} of the stored games still playing stand `
      + 'in a position another stored game reaches, and '
      + `${numbers.percent(parting.aloneAt(every, 10), 1)} of every stored game first stands alone there.`
    )
    expect(parting.partingsSentence(1, SMALL)).toBe(
      'Half the games of the 1990s stand alone by move 2, the middle half parting between moves 2 and 3, '
      + 'and at move 1, 80% of them still share a position.'
    )
  })
})

describe('the grid of the decades', () => {
  it('lays a row per decade and a column per move, narrower on a phone', () => {
    const grid = parting.partingsLayout(600, 4)
    expect(grid.grid).toBe(4 * grid.row)
    expect(grid.cell * (parting.LAST_MOVE + 1)).toBeCloseTo(600 - grid.left - 14)
    expect(parting.partingsLayout(400, 4).row).toBeLessThan(grid.row)
    expect(parting.partingsLayout(0, 4).cell).toBe(0)
  })

  it('finds the cell under a point, a point under the grid keeping its decade', () => {
    const grid = parting.partingsLayout(600, 4)
    const cell = { decade: 1, move: 5 }
    const x    = parting.columnOn(grid, 7)
    expect(parting.cellNear(cell, grid, x, 2.5 * grid.row, 4)).toEqual({ decade: 2, move: 7 })
    expect(parting.cellNear(cell, grid, 0, grid.grid + 4, 4)).toEqual({ decade: 1, move: 0 })
    expect(parting.cellNear(cell, grid, 5000, -10, 4)).toEqual({ decade: 0, move: parting.LAST_MOVE })
  })

  it.each([
    ['ArrowDown', { decade: 2, move: 5 }],
    ['ArrowUp', { decade: 0, move: 5 }],
    ['ArrowRight', { decade: 1, move: 6 }],
    ['End', { decade: 1, move: parting.LAST_MOVE }],
    ['Tab', undefined]
  ])('steps a cell on %s', (key, to) => {
    expect(parting.cellStepped({ decade: 1, move: 5 }, key, 3)).toEqual(to)
  })

  it('holds a cell stepped down to the last decade', () => {
    expect(parting.cellStepped({ decade: 2, move: 5 }, 'ArrowDown', 3)).toEqual({ decade: 2, move: 5 })
  })
})
