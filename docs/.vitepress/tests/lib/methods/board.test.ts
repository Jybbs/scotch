import { describe, expect, it } from 'vitest'

import { readingOrder } from '../../../lib/methods/board.ts'

describe('readingOrder', () => {
  it('runs from a8 across and down to h1', () => {
    expect([readingOrder[0], readingOrder[7], readingOrder[56], readingOrder[63]]).toEqual([56, 63, 0, 7])
  })
})
