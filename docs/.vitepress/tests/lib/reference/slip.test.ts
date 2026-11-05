import { describe, expect, it } from 'vitest'

import { slipAt } from '../../../lib/reference/slip.ts'

const SLIP   = { height: 100, width: 300 }
const WINDOW = { height: 800, width: 1000 }

describe('slipAt', () => {
  it('sets a slip below its term, its left edge on the term', () => {
    expect(slipAt({ bottom: 120, left: 200, top: 100 }, SLIP, WINDOW)).toEqual({ above: false, x: 200, y: 128 })
  })

  it('sets a slip above a term with no room below', () => {
    expect(slipAt({ bottom: 780, left: 200, top: 760 }, SLIP, WINDOW)).toEqual({ above: true, x: 200, y: 652 })
  })

  it('keeps a slip below a term with no room on either side', () => {
    expect(slipAt({ bottom: 780, left: 200, top: 760 }, SLIP, { height: 790, width: 1000 }).above).toBe(true)
    expect(slipAt({ bottom: 80, left: 200, top: 60 }, SLIP, { height: 150, width: 1000 }).above).toBe(false)
  })

  it('holds a slip inside the window', () => {
    expect(slipAt({ bottom: 120, left: 900, top: 100 }, SLIP, WINDOW).x).toBe(688)
    expect(slipAt({ bottom: 120, left: 2, top: 100 }, SLIP, WINDOW).x).toBe(12)
    expect(slipAt({ bottom: 120, left: 200, top: 100 }, SLIP, { height: 800, width: 100 }).x).toBe(12)
  })
})
