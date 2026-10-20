import { describe, expect, it } from 'vitest'

import * as numbers from '../../../lib/data/numbers.ts'

describe('accumulated', () => {
  it.each([
    { counts: [1, 2, 3], totals: [1, 3, 6] },
    { counts: [], totals: [] }
  ])('runs $counts into $totals', ({ counts, totals }) => {
    expect(numbers.accumulated(counts)).toEqual(totals)
  })
})

describe('counted', () => {
  it('groups the digits of a count by three', () => {
    expect(numbers.counted(435321)).toBe('435,321')
  })
})

describe('percent', () => {
  it.each([
    { digits: undefined, share: 0.514, written: '51%' },
    { digits: 1, share: 0.14, written: '14.0%' }
  ])('writes $share as $written', ({ digits, share, written }) => {
    expect(numbers.percent(share, digits)).toBe(written)
  })
})

describe('reaching', () => {
  it.each([
    { index: 1, share: 0.5 },
    { index: 2, share: 0.51 },
    { index: 0, share: 0 }
  ])('finds the totals [1, 2, 4] reaching a share of $share at $index', ({ index, share }) => {
    expect(numbers.reaching([1, 2, 4], share)).toBe(index)
  })

  it('finds no place in an empty list', () => {
    expect(numbers.reaching([], 0.5)).toBe(-1)
  })
})

describe('quartiles', () => {
  it('finds where the totals reach each quarter of their last', () => {
    expect(numbers.quartiles([1, 2, 3, 4])).toEqual([0, 1, 2])
  })
})

describe('summed', () => {
  it('sums a list of counts, an empty one to 0', () => {
    expect([numbers.summed([1, 2, 3]), numbers.summed([])]).toEqual([6, 0])
  })
})

describe('tenth', () => {
  it.each([[12.34, 12.3], [12.36, 12.4], [7, 7]])('rounds %d to %d', (value, rounded) => {
    expect(numbers.tenth(value)).toBe(rounded)
  })
})

describe('pathThrough', () => {
  it('moves to the first point and draws a line to each after it, rounding to a tenth', () => {
    expect(numbers.pathThrough([[0, 1.04], [2.25, 3]])).toBe('M0 1L2.3 3')
  })

  it("runs on through a foot's points and closes the path where a foot is given", () => {
    expect(numbers.pathThrough([[0, 1], [2, 3]], [[2, 4], [0, 4]])).toBe('M0 1L2 3L2 4L0 4Z')
  })
})
