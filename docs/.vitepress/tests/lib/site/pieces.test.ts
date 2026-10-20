import { describe, expect, it } from 'vitest'

import * as pieces from '../../../lib/site/pieces.ts'

describe('svgOf', () => {
  it.each(Object.keys(pieces.DRAWINGS) as pieces.Piece[])('wraps the %s on its 45-unit square', piece => {
    expect(pieces.svgOf(pieces.DRAWINGS[piece])).toBe(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" aria-hidden="true">'
      + `${pieces.DRAWINGS[piece]}</svg>`
    )
  })

  it('declares its size and shows the part of its square a caller names', () => {
    expect(pieces.svgOf(pieces.DRAWINGS.q, 48, '3.5 2 38 38.5')).toBe(
        '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="3.5 2 38 38.5" '
      + `aria-hidden="true">${pieces.DRAWINGS.q}</svg>`
    )
  })
})
