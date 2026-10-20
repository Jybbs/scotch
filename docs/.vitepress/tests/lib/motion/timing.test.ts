import { describe, expect, it } from 'vitest'

import * as timing from '../../../lib/motion/timing.ts'

describe('bezier', () => {
  it.each(Object.entries(timing.CURVES))('runs the %s curve from 0 to 1', (_, points) => {
    const ease = timing.bezier(points)
    expect(ease(0)).toBeCloseTo(0, 6)
    expect(ease(1)).toBeCloseTo(1, 6)
  })

  it('returns the share itself on the straight curve', () => {
    const ease   = timing.bezier([0, 0, 1, 1])
    const shares = [0, 0.1, 0.25, 0.5, 0.9, 1]
    expect(shares.map(share => ease(share))).toEqual(shares.map(share => expect.closeTo(share, 6)))
  })

  it("reaches at the glide's midpoint the progress bisecting the curve's horizontal coordinate finds", () => {
    expect(timing.bezier(timing.CURVES.glide)(0.5)).toBeCloseTo(0.954809, 5)
  })

  it('holds every share past either end to the end it passed', () => {
    const ease = timing.bezier(timing.CURVES.sway)
    expect(ease(-1)).toBeCloseTo(0, 6)
    expect(ease(2)).toBeCloseTo(1, 6)
  })
})

describe('cubicBezier', () => {
  it('writes the four control values a stylesheet eases along', () => {
    expect(timing.cubicBezier(timing.CURVES.glide)).toBe('cubic-bezier(0.32, 0.72, 0, 1)')
  })
})

describe.each([
  ['smooth', timing.smooth, 0.15625],
  ['smoother', timing.smoother, 0.103515625]
])('%s', (_, step, quarter) => {
  it.each([[-1, 0], [0.25, quarter], [0.5, 0.5], [2, 1]])('reads %d as %d', (share, value) => {
    expect(step(share)).toBe(value)
  })
})
