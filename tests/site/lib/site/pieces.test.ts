import { describe, expect, it } from 'vitest'

import * as pieces from '../../../../docs/.vitepress/lib/site/pieces.ts'

describe('svgOf', () => {
  it('wraps a piece on its 45-unit square', () => {
    expect(pieces.svgOf(pieces.DRAWINGS.K)).toBe(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" aria-hidden="true">'
      + `${pieces.DRAWINGS.K}</svg>`
    )
  })

  it('declares its size and shows the part of its square a caller names', () => {
    expect(pieces.svgOf(pieces.DRAWINGS.q, 48, '3.5 2 38 38.5')).toBe(
        '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="3.5 2 38 38.5" '
      + `aria-hidden="true">${pieces.DRAWINGS.q}</svg>`
    )
  })
})
