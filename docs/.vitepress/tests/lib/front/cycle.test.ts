import { describe, expect, it } from 'vitest'

import * as cycle from '../../../lib/front/cycle.ts'

const timing = cycle.timingOf(18)

describe('timingOf', () => {
  it('sets the first pair off when the oval gathers and the last one the spread later', () => {
    expect(timing.start[0]).toBe(cycle.CYCLE.gatherAt)
    expect(timing.start.at(-1)).toBeCloseTo(cycle.CYCLE.gatherAt + cycle.CYCLE.spread, 9)
  })

  it('lands each pair seven tenths of the way through its journey', () => {
    const { dur, land } = cycle.SETTLE
    expect(timing.land).toEqual(timing.start.map(start => expect.closeTo(start + dur * land, 9)))
  })

  it('has every pair home again a journey after the oval lets go', () => {
    expect(timing.looseAt).toBe(cycle.CYCLE.releaseAt + cycle.SETTLE.dur)
  })

  it('stands every pair in its place once the last has arrived', () => {
    expect(timing.setAt).toBeCloseTo(cycle.CYCLE.gatherAt + cycle.CYCLE.spread + cycle.SETTLE.dur, 9)
  })

  it('sets a single ply off when the oval gathers', () => {
    expect(cycle.timingOf(1).start).toEqual([cycle.CYCLE.gatherAt])
  })
})

describe('eased', () => {
  it('reaches its end three quarters of the way through a journey', () => {
    expect(cycle.eased(0)).toBeCloseTo(0, 6)
    expect(cycle.eased(0.75)).toBeCloseTo(1, 6)
    expect(cycle.eased(0.9)).toBeCloseTo(1, 6)
  })
})

describe('statesAt', () => {
  it('holds every pair at home before the oval gathers', () => {
    expect(cycle.statesAt(5, timing).map(state => state.p)).toAllEqual(0)
  })

  it('stands every pair in its place, out on its way, once all have arrived', () => {
    const states = cycle.statesAt(timing.setAt + 0.5, timing)
    expect(states.map(state => state.p)).toAllEqual(expect.closeTo(1, 6))
    expect(states.map(state => state.out)).toAllEqual(1)
  })

  it("holds the run's color back from a pair until it nears its place", () => {
    const start = timing.start[0]!
    const cols  = [0.3, 0.75].map(share => cycle.statesAt(start + cycle.SETTLE.dur * share, timing)[0]!.col)
    expect(cols).toEqual([0, 1])
  })

  it("holds the run's color on every pair heading home", () => {
    expect(cycle.statesAt(cycle.CYCLE.releaseAt + 0.5, timing).map(state => state.col)).toAllEqual(1)
  })

  it('sends every pair home after the oval lets go', () => {
    const states = cycle.statesAt(timing.looseAt + 0.5, timing)
    expect(states.map(state => state.p)).toAllEqual(expect.closeTo(0, 6))
    expect(states.map(state => state.out)).toAllEqual(-1)
  })

  it('counts the seconds since a pair landed and none before', () => {
    const at = cycle.statesAt(timing.land[0]! + 0.25, timing)
    expect(at[0]!.since).toBeCloseTo(0.25, 9)
    expect(cycle.statesAt(timing.land[0]! - 0.01, timing)[0]!.since).toBe(-1)
  })

  it('carries a pair past its place near the end of its journey', () => {
    const state = cycle.statesAt(timing.start[0]! + cycle.SETTLE.dur * 0.85, timing)[0]!
    expect(state.push).toBeCloseTo(cycle.SETTLE.past, 6)
  })

  it('runs the same moment in every cycle', () => {
    expect(cycle.statesAt(10 + cycle.CYCLE.length, timing)).toEqual(cycle.statesAt(10, timing))
  })

  it('stands every pair in its place with no ring running while the oval holds still', () => {
    expect(cycle.statesAt(0, timing, true))
      .toAllEqual({ col: 1, out: 1, p: 1, push: 0, since: -1, u: Number.POSITIVE_INFINITY })
  })
})
