import { describe, expect, it } from 'vitest'

import { EXAMPLES }               from '../../../lib/viewer/examples.ts'
import { Loaded }                 from '../../../lib/viewer/loaded.ts'
import { pairAt, rowAt, sheetOf } from '../../../lib/viewer/sheet.ts'
import { last, meet, shifted }    from '../../common/matches.ts'

const { stored, submitted } = EXAMPLES.match

describe('rowAt', () => {
  it.each([
    [1, 0, 0],
    [2, 0, 0],
    [3, 0, 1],
    [1, 1, 0],
    [2, 1, 1],
    [0, 0, -1]
  ])('reads the row of the move reaching cursor %i, the first move %i plies in', (cursor, first, row) => {
    expect(rowAt(cursor, first)).toBe(row)
  })
})

describe('sheetOf', () => {
  const sheet = sheetOf(new Loaded(EXAMPLES.match))

  it('binds a row for every two plies of the longer game, numbered from the first', () => {
    const plies = Math.max(submitted.moves.length, stored!.moves.length)
    expect(sheet.first).toBe(0)
    expect(sheet.rows.map(({ index }) => index))
      .toEqual(Array.from({ length: Math.ceil(plies / 2) }, (_, at) => at))
  })

  it('sets each game’s moves in its half of the row the cursor reaches them in', () => {
    expect(sheet.rows[0]).toMatchObject({
      stored    : {
        black : { reach: 2, san: stored!.moves[1] },
        no    : '1.',
        white : { reach: 1, san: stored!.moves[0] }
      },
      submitted : {
        black : { reach: 2, san: submitted.moves[1] },
        no    : '1.',
        white : { reach: 1, san: submitted.moves[0] }
      }
    })
  })

  it('marks the moves inside the run and tags the moves where the two meet and part', () => {
    const cells = sheet.rows.flatMap(row => [row.submitted.white, row.submitted.black]).filter(Boolean)
    expect(cells.filter(cell => cell!.run).map(cell => cell!.reach))
      .toEqual(Array.from({ length: last - meet }, (_, at) => meet + 1 + at))
    expect(cells.filter(cell => cell!.tag).map(cell => [cell!.reach, cell!.tag]))
      .toEqual([[meet, 'meet'], [last + 1, 'part']])
    expect(sheet.rows.filter(row => row.run).map(row => row.index))
      .toEqual([...new Set(cells.filter(cell => cell!.run).map(cell => rowAt(cell!.reach, 0)))])
  })

})

describe('sheetOf for another match', () => {
  it('shifts the stored game’s moves by the run’s offset', () => {
    const moved = sheetOf(new Loaded(shifted(4)))
    const cell  = moved.rows.flatMap(row => [row.stored.white, row.stored.black]).find(Boolean)
    expect(cell).toMatchObject({ reach: 5, san: shifted(4).stored!.moves[0] })
  })

  it('sets only the submitted game where no stored game shares a position', () => {
    const alone = sheetOf(new Loaded(EXAMPLES.alone))
    expect(alone.rows.every(row => Object.keys(row.stored).length === 0)).toBe(true)
    const cells = alone.rows.flatMap(row => [row.submitted.white, row.submitted.black]).filter(Boolean)
    expect(cells.map(cell => [cell!.run, cell!.tag])).toEqual(cells.map(() => [false, undefined]))
  })

  it('shifts every row by one ply where the submitted game opens on Black’s move', () => {
    const alone   = EXAMPLES.alone.submitted
    const headers = { ...alone.headers, FEN: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' }
    const black   = sheetOf(new Loaded({ ...EXAMPLES.alone, submitted: { ...alone, headers } }))
    expect(black.first).toBe(1)
    expect(black.rows[0]!.submitted)
      .toEqual({ black: { reach: 1, run: false, san: EXAMPLES.alone.submitted.moves[0] }, no: '1.' })
  })
})

describe('pairAt', () => {
  const loaded = new Loaded(EXAMPLES.match)

  it.each([
    [meet, { stored: 1, submitted: meet }],
    [1, { stored: 5, submitted: 1 }],
    [meet - 1, undefined],
    [0, undefined]
  ])('finds the pair the submitted game’s move reaching cursor %i belongs to', (cursor, pair) => {
    expect(pairAt(loaded, cursor)).toEqual(pair)
  })
})
