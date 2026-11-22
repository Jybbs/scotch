import { describe, expect, it } from 'vitest'

import { grouped, keyedOf, travelOf } from '../../../../docs/.vitepress/lib/methods/keys.ts'

const keyed = keyedOf()

/**
 * Combines sixteen-digit hexadecimal numbers into one, as the key combines its
 * numbers.
 */
const combined = (values: readonly string[]): bigint =>
  values.reduce((key, value) => key ^ BigInt(`0x${value}`), 0n)

describe('keyedOf', () => {
  it('stops at the ply where the stored game reaches the line\'s position by another order', () => {
    expect(keyed.last).toBe(7)
    expect(keyed.keys).toHaveLength(8)
    expect(keyed.stored.key).toBe(keyed.keys[7])
  })

  it('turns each key into the next through the numbers its move turns', () => {
    const before = ['0', ...keyed.keys]
    const turned = keyed.turns.map((turns, ply) => combined([before[ply]!, ...turns.map(({ term }) => term.value)]))
    expect(turned).toEqual(keyed.keys.map(key => BigInt(`0x${key}`)))
  })

  it('lists the numbers a move takes out before the ones it puts in', () => {
    expect(keyed.turns[1]!.map(({ joins, term }) => [joins, term.name]))
      .toEqual([[false, 'White pawn d2'], [false, 'White to move'], [true, 'White pawn d4']])
  })

  it('counts the numbers the first key combines', () => {
    expect(keyed.numbers).toBe(37)
  })

  it('names the stored game and writes its moves as one line of movetext', () => {
    expect(keyed.stored.name).toBe('Timman – Klein')
    expect(keyed.stored.moves).toBe('1. c4 Nf6 2. Nc3 g6 3. e4 Bg7 4. d4')
  })

  it('keys each en passant position with its square and without', () => {
    expect(keyed.passant.map(({ cleared, counted, legal }) => [legal, counted === cleared]))
      .toEqual([[true, false], [false, true]])
  })
})

describe('travelOf', () => {
  it('reads the square a move leaves and the square it enters', () => {
    expect(travelOf(keyed.turns[1]!)).toEqual({ from: 11, to: 27 })
  })

  it('reads no square where no piece moves', () => {
    expect(travelOf([])).toEqual({ from: undefined, to: undefined })
  })
})

describe('grouped', () => {
  it('writes a key in four groups of four capitals', () => {
    expect(grouped('244716f4629e4be1')).toBe('2447 16F4 629E 4BE1')
  })
})
