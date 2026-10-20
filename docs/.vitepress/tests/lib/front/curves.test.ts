import { describe, expect, it } from 'vitest'

import * as curves from '../../../lib/front/curves.ts'

describe('edgeAt', () => {
  it.each([-0.1, 0, 1, 2])('shows no edging at %d, before a journey or once it has landed', share => {
    expect(curves.edgeAt(share)).toBe(0)
  })

  it('shows the full edging through the middle of a journey', () => {
    expect(curves.edgeAt(0.5)).toBe(1)
  })

  it('rises as a piece leaves and eases out as it settles', () => {
    expect(curves.edgeAt(0.09)).toBeCloseTo(0.5, 6)
    expect(curves.edgeAt(0.875)).toBeCloseTo(0.5, 6)
  })
})

describe('past', () => {
  it.each([0, 0.62, 1, 1.2])('carries a piece no pixel past its place at %d', share => {
    expect(curves.past(share)).toBe(0)
  })

  it('peaks at 85 percent of a journey', () => {
    expect(curves.past(0.85)).toBe(1)
  })

  it('rises through the bump before the peak and falls after it', () => {
    expect(curves.past(0.735)).toBeCloseTo(0.5, 6)
    expect(curves.past(0.925)).toBeCloseTo(0.5, 6)
  })
})

describe('soft', () => {
  it('runs from its start to its end, slow off the mark', () => {
    expect(curves.soft(0)).toBeCloseTo(0, 6)
    expect(curves.soft(1)).toBeCloseTo(1, 6)
    expect(curves.soft(0.1)).toBeLessThan(0.1)
  })
})
