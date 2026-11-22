import { describe, expect, it } from 'vitest'

import * as sieve from '../../../../docs/.vitepress/lib/data/sieve.ts'

describe('sieve', () => {
  it('draws a square per ten thousand games, the stored ones first, counting down to the stored', () => {
    expect(sieve.SQUARES[0]).toBe('stored')
    expect(sieve.SQUARES.at(-1)).toBe('below')
    expect(sieve.SQUARES.length).toBe(Math.round(sieve.STEPS[0]!.total / sieve.PER_SQUARE))
    expect(sieve.STEPS.map(({ name }) => name)).toEqual(['Fetched', 'The floor', 'Repeats', 'Stored'])
    const totals = sieve.STEPS.map(({ total }) => total)
    expect(totals).toEqual(totals.toSorted((a, b) => b - a))
  })

  it.each([
    { share: -0.5, step: 0 },
    { share: 0.16, step: 0 },
    { share: 0.17, step: 1 },
    { share: 0.5, step: 2 },
    { share: 1.4, step: 3 }
  ])('reads the step $step nearest a pointer $share of the way along', ({ share, step }) => {
    expect(sieve.stepAt(share)).toBe(step)
  })
})
