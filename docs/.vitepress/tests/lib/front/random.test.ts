import { describe, expect, it } from 'vitest'

import { seeded } from '../../../lib/front/random.ts'

describe('seeded', () => {
  it('repeats its draws for the same seed', () => {
    const [first, second] = [seeded(58), seeded(58)]
    expect(Array.from({ length: 5 }, () => first())).toEqual(Array.from({ length: 5 }, () => second()))
  })

  it("draws Mulberry32's first value for the seed 58", () => {
    expect(seeded(58)()).toMatchInlineSnapshot(`0.49995423946529627`)
  })

  it('draws another sequence for another seed', () => {
    expect(seeded(58)()).not.toBe(seeded(59)())
  })
})
