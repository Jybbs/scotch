import { describe, expect, it } from 'vitest'

import type { State }    from '../../../lib/front/cycle.ts'
import { ALPHA, lookOf } from '../../../lib/front/layers.ts'

const PLAN = { loose: 12, size: 17 }

const alphaOf = (layers: ReturnType<typeof lookOf>['layers'], name: string): number =>
  layers.find(([layer]) => layer === name)?.[1] ?? 0

/**
 * Reads how strongly a shared pair shows the run's color `p` of the way from
 * home to its places.
 */
function runShown(p: number): number {
  return alphaOf(lookOf('top', 1, PLAN, true, stateOf(p, 0.5, 1)).layers, 'run')
}

const stateOf = (p: number, u: number, col = 0, since = -1): State => ({ col, out: 1, p, push: 0, since, u })

describe('lookOf', () => {
  it('draws a piece at home in plain ink at the loose size', () => {
    const look = lookOf('top', 1, PLAN, false, stateOf(0, 0))
    expect(look.size).toBe(PLAN.loose)
    expect(alphaOf(look.layers, 'ink')).toBeCloseTo(ALPHA.loose, 9)
    expect(alphaOf(look.layers, 'plain-top')).toBe(0)
  })

  it("draws a piece in its place in its game's white and black at the place's size", () => {
    const look = lookOf('bot', 1, PLAN, false, stateOf(1, 2))
    expect(look.size).toBe(PLAN.size)
    expect(alphaOf(look.layers, 'plain-bot')).toBeCloseTo(ALPHA.set, 9)
    expect(alphaOf(look.layers, 'ink')).toBe(0)
  })

  it("edges a piece in its game's color through the middle of its flight", () => {
    const look = lookOf('top', 1, PLAN, false, stateOf(0.5, 0.5))
    expect(alphaOf(look.layers, 'edged-top')).toBeCloseTo(ALPHA.edge, 9)
    expect(alphaOf(look.layers, 'ink')).toBe(0)
  })

  it("turns a shared pair from its edging to the run's color as it lands and names the seconds since", () => {
    const look = lookOf('top', 1, PLAN, true, stateOf(1, 0.75, 1, 0.3))
    expect(alphaOf(look.layers, 'run')).toBeCloseTo(ALPHA.run, 9)
    expect(alphaOf(look.layers, 'plain-top')).toBe(0)
    expect(alphaOf(look.layers, 'edged-top')).toBe(0)
    expect(look.since).toBe(0.3)
  })

  it("crosses from plain ink to its game's white and black halfway to its place", () => {
    const look = lookOf('top', 1, PLAN, false, stateOf(0.5, 0))
    expect(alphaOf(look.layers, 'ink')).toBeCloseTo((ALPHA.loose + ALPHA.ink) / 4, 9)
    expect(alphaOf(look.layers, 'plain-top')).toBeCloseTo((ALPHA.loose + ALPHA.set) / 4, 9)
    expect(look.size).toBe((PLAN.loose + PLAN.size) / 2)
  })

  it('names no landing for a pair the two games do not share', () => {
    expect(lookOf('top', 1, PLAN, false, stateOf(1, 2, 1, 0.3)).since).toBe(-1)
  })

  it('dims a piece at home while the loose pieces hush', () => {
    const { layers } = lookOf('top', 0.5, PLAN, false, stateOf(0, 0))
    expect(alphaOf(layers, 'ink')).toBeCloseTo(ALPHA.loose * 0.5, 9)
  })

  it("fades a shared pair's run color as it nears home", () => {
    expect(runShown(0.9)).toBeCloseTo(ALPHA.run, 9)
    expect(runShown(0.25)).toBeLessThan(ALPHA.run / 2)
  })
})
