import { describe, expect, it } from 'vitest'

import { seeded } from '../../../../docs/.vitepress/lib/front/random.ts'

describe('seeded', () => {
  it("draws Mulberry32's first value for the seed 58", () => {
    expect(seeded(58)()).toMatchInlineSnapshot(`0.49995423946529627`)
  })
})
