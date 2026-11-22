import { describe, expect, it } from 'vitest'

import { REACH, reachOf } from '../../../lib/methods/reach.ts'
import rules              from '../../../lib/rendered/rules.json' with { type: 'json' }

/**
 * A page setting the median and the longest as the limits page does.
 */
const pageOf = (median: number, longest: number): string =>
  `<!-- reach-median -->${median}<!-- /reach-median -->`
  + ` and <!-- reach-longest -->${longest}<!-- /reach-longest -->`

describe('reachOf', () => {
  it('counts the games at each length from 1 to the longest', () => {
    const reach = reachOf([1, 3, 3, 4], pageOf(3, 4))
    expect(reach.counts).toEqual([1, 0, 2, 1])
    expect(reach.tallest).toBe(2)
    expect(reach.games).toBe(4)
  })

  it('bounds the middle half where the running count reaches a quarter and three quarters', () => {
    expect(reachOf([1, 2, 3, 4, 5, 6, 7, 8], pageOf(4, 8))).toMatchObject({ high: 6, low: 2 })
  })

  it('reads the median and the longest from the figures the page sets', () => {
    expect(reachOf([2, 5], pageOf(3, 5))).toMatchObject({ longest: 5, median: 3 })
  })
})

describe('REACH', () => {
  it('counts every sampled game', () => {
    expect(REACH.counts.reduce((sum, count) => sum + count, 0)).toBe(rules.lengths.length)
    expect(REACH.games).toBe(rules.lengths.length)
  })

  it('sets the longest at the longest sampled length, holding at least one game', () => {
    expect(REACH.longest).toBe(Math.max(...rules.lengths))
    expect(REACH.counts.at(-1)).toBeGreaterThan(0)
  })

  it('sets the median inside the middle half', () => {
    expect(REACH.median).toBeGreaterThanOrEqual(REACH.low)
    expect(REACH.median).toBeLessThanOrEqual(REACH.high)
  })
})
