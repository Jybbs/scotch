import { describe, expect, it } from 'vitest'

import * as key from '../../../lib/methods/key.ts'

const MEASURED = { reach: 256, size: 240 }

describe('leaderAt', () => {
  it("reaches from the first tag's middle to the lower edge of d2", () => {
    expect(key.leaderAt(MEASURED, 0, 11).leader).toBe('translate3d(105.00px, 0, 0) scaleY(0.2015)')
  })

  it("reaches from the third tag's middle to the lower edge of h8", () => {
    expect(key.leaderAt(MEASURED, 2, 63).leader)
      .toBe(`translate3d(225.00px, 0, 0) scaleY(${(269 / 299).toFixed(4)})`)
  })

  it.each([
    [10, 'translate3d(81.00px, 0, 0)'],
    [11, 'translate3d(105.00px, 0, 0) translateX(-50%) translateY(8px)'],
    [12, 'translate3d(135.00px, 0, 0) translateX(-50%) translateY(8px)'],
    [13, 'translate3d(159.00px, 0, 0) translateX(-100%)']
  ])('sets the tag for square %i beside its leader, or under it on the middle files', (square, tag) => {
    expect(key.leaderAt(MEASURED, 0, square).tag).toBe(tag)
  })
})

describe('middleOf', () => {
  it.each([[0, key.KEY_LAYOUT.first], [1, 25], [2, 43]])(
    'sets the middle of row %i at %i pixels',
    (row, px) => {
      expect(key.middleOf(row)).toBe(px)
    }
  )
})
