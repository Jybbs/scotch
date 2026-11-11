import { describe, expect, it } from 'vitest'

import type { Cell }         from '../../../lib/front/mosaic.ts'
import { POUR_TUNING, Pour } from '../../../lib/front/pour.ts'

const CELLS  = [{ at: 0.2, drift: 0 }, { at: 0.6, drift: 1 }] as Cell[]
const TUNING = { ...POUR_TUNING, lift: 100, pour: 200, wait: 50 }

describe('Pour', () => {
  it('starts every piece out of the drawing', () => {
    const pour = new Pour(CELLS, TUNING)
    expect([pour.placed(0, 100), pour.placed(1, 100)]).toEqual([undefined, undefined])
  })

  it('pours a piece in over its pour once the scroll passes its place', () => {
    const pour = new Pour(CELLS, TUNING)
    expect(pour.advance(0, true, 0, 0.3)).toBe(true)
    expect(pour.advance(100, true, 100, 0.3)).toBe(true)
    expect(pour.placed(0, 100)!.away).toBeGreaterThan(0)
    expect(pour.advance(100, true, 200, 0.3)).toBe(false)
    expect(pour.placed(0, 100)).toEqual({ alpha: 1, away: 0, turn: -0 })
    expect(pour.placed(1, 100)).toBeUndefined()
  })

  it('holds a piece back by its drift before its course starts', () => {
    const pour = new Pour(CELLS, TUNING)
    pour.advance(0, true, 0, 1)
    pour.advance(40, true, 40, 1)
    expect(pour.placed(1, 100)).toBeUndefined()
    pour.advance(20, true, 60, 1)
    expect(pour.placed(1, 100)!.alpha).toBeCloseTo(0.3)
  })

  it('lifts a piece back out over its lift once the scroll falls behind it', () => {
    const pour = new Pour(CELLS, TUNING)
    pour.advance(0, false, 0, 0.3)
    pour.advance(50, true, 50, 0)
    expect(pour.placed(0, 100)!.alpha).toBe(1)
    pour.advance(50, true, 100, 0)
    expect(pour.placed(0, 100)).toBeUndefined()
  })

  it('sets every piece straight where the scroll sets it while the drawings hold still', () => {
    const pour = new Pour(CELLS, TUNING)
    expect(pour.advance(0, false, 0, 1)).toBe(false)
    expect([pour.placed(0, 100), pour.placed(1, 100)].map(placed => placed?.away)).toEqual([0, 0])
  })

  it("turns a piece by its drift's distance from the middle, easing on the site's glide", () => {
    const pour = new Pour(CELLS, TUNING)
    pour.advance(0, true, 0, 0.3)
    pour.advance(100, true, 100, 0.3)
    const { away, turn } = pour.placed(0, 100)!
    expect(away / (100 * TUNING.reach)).toBeCloseTo(1 - 0.954809, 5)
    expect(turn).toBeCloseTo(-(1 - 0.954809) * 0.5 * TUNING.spin, 5)
  })
})
