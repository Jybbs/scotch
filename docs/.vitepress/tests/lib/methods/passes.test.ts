import { describe, expect, it } from 'vitest'

import { MATCHED, PASSED } from '../../../lib/methods/passes.ts'
import rules               from '../../../lib/rendered/rules.json' with { type: 'json' }

describe('PASSED', () => {
  it('lists the four measures in the page\'s order', () => {
    expect(PASSED.map(({ name }) => name))
      .toEqual(['Runs starting later', 'Ties', 'Crowded positions', 'Rarer by another order'])
  })

  it('reads each share from the figure the page sets, within rounding of the count it stands for', () => {
    const counts = [rules.later, rules.tied, rules.crowded, rules.transposed]
    const errors = PASSED.map(({ share }, at) => Math.abs(share - 100 * counts[at]! / MATCHED))
    expect(errors.every(error => error <= 0.5)).toBe(true)
  })

  it('boxes the positions before the run where the run starts later', () => {
    const [later] = PASSED
    expect(later!.named.box).toEqual([0, later!.named.pair.longest.start - 1])
  })

  it('boxes the run itself where its positions are crowded', () => {
    const { length, start } = PASSED[2]!.named.pair.longest
    expect(PASSED[2]!.named.box).toEqual([start, start + length - 1])
  })

  it('draws the tie as another stored game the match does not draw', () => {
    expect(PASSED[1]!.over).toMatchObject({ other: true })
    expect(PASSED[1]!.named.other).toBe(false)
  })

  it('draws a passed-over match only where a match shows what the rule passes over', () => {
    expect(PASSED.map(({ over }) => over !== undefined)).toEqual([false, true, false, true])
  })
})
