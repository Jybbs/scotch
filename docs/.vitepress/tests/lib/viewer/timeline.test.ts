import { describe, expect, it } from 'vitest'

import type { Sprite } from '../../../lib/viewer/sprites.ts'
import * as timeline   from '../../../lib/viewer/timeline.ts'
import { Trail }       from '../../../lib/viewer/trail.ts'

const { PACE } = timeline

/**
 * Builds a moving piece whose legs and fades end at the times given, with no
 * node of its own.
 */
function moving(legs: readonly [number, number][], fades: readonly [number, number][] = []): Sprite {
  return {
    end     : legs.at(-1)?.[1] ?? 0,
    fadeEnd : fades.at(-1)?.[1] ?? 0,
    fades   : fades.map(([t0, t1]) => ({ a0: 1, a1: 0, plan: undefined, t0, t1 })),
    legs    : legs.map(([t0, t1]) => ({
      batch  : 0,
      from   : 0,
      merged : [],
      plan   : undefined,
      t0     : t0,
      t1     : t1,
      ties   : [],
      trail  : new Trail([0, 0, 45, 0])
    })),
    live    : true,
    node    : undefined as unknown as SVGGElement,
    piece   : 'P',
    rest    : { a: 1, s: 1, x: 0, y: 0 },
    shown   : 100,
    written : { a: 1, s: 1, x: 0, y: 0 }
  }
}

describe('paceOf', () => {
  it.each([0, 1])('gives %i moves one ply’s length with no slot between', count => {
    expect(timeline.paceOf(count)).toEqual({ length: PACE.ply, slot: 0 })
  })

  it.each([2, 5, 20, 200])('starts %i moves a slot apart, the whole jump inside its span', count => {
    const { length, slot } = timeline.paceOf(count)
    expect(slot * count).toBeLessThanOrEqual(PACE.span)
    expect(slot).toBeLessThanOrEqual(PACE.ply * 0.55)
    expect(length).toBeGreaterThanOrEqual(Math.min(PACE.least, PACE.ply))
    expect(length).toBeLessThanOrEqual(PACE.ply)
  })

  it('reads the pace it is handed', () => {
    expect(timeline.paceOf(4, { ...PACE, ply: 100, span: 40 })).toEqual({ length: 100, slot: 10 })
  })
})

describe('squeeze', () => {
  it.each([
    ['one already landed', { t0: 0, t1: 10 }, { t0: 0, t1: 10 }],
    ['one yet to start, from now', { t0: 30, t1: 50 }, { t0: 25, t1: 35 }],
    ['one running, keeping the share it has run', { t0: 10, t1: 30 }, { t0: 15, t1: 25 }]
  ])('scales what is left of %s', (_, item, scaled) => {
    const copy = { ...item }
    timeline.squeeze(copy, 20, 0.5)
    expect(copy).toEqual(scaled)
  })
})

describe('without', () => {
  it.each([
    ['takes out an item the list holds', 2, [1, 3]],
    ['leaves a list as it stands where it holds no such item', 4, [1, 2, 3]]
  ])('%s', (_, item, left) => {
    const list = [1, 2, 3]
    timeline.without(list, item)
    expect(list).toEqual(left)
  })
})

describe('lastEnd', () => {
  it.each([
    [[], 0],
    [[{ t1: 5 }, { t1: 9 }], 9]
  ])('reads when the last of %j lands', (items, end) => {
    expect(timeline.lastEnd(items)).toBe(end)
  })
})

describe('horizonOf', () => {
  it('reads the latest a leg or a fade still planned lands', () => {
    expect(timeline.horizonOf([moving([[0, 40]]), moving([[0, 10]], [[0, 70]])], 5)).toBe(70)
  })

  it('reads now where nothing lands later', () => {
    expect(timeline.horizonOf([moving([[0, 40]])], 50)).toBe(50)
  })
})

describe('hasten', () => {
  it('lands a piece moving past the warp within it, leaving one landing sooner as it stands', () => {
    const late = moving([[0, 2000]], [[1500, 2500]])
    const soon = moving([[0, 300]])
    timeline.hasten([late, soon], 0, PACE, [])
    expect(late.end).toBeLessThanOrEqual(2000 * PACE.haste + 1)
    expect(late.fadeEnd).toBeLessThan(2500)
    expect(soon.legs[0]).toMatchObject({ t0: 0, t1: 300 })
  })

  it('moves a plan’s start and end with the pieces it moves', () => {
    const late = moving([[100, 2000]])
    const plan = { end: 2000, fades: [], legs: [[late, late.legs[0]!]], t0: 100 }
    timeline.hasten([late], 0, PACE, [plan as never])
    expect(plan.end).toBe(late.legs[0]!.t1)
    expect(plan.t0).toBe(late.legs[0]!.t0)
  })
})

describe('unwind', () => {
  it('turns a running leg back from where the piece stands over the time it has taken', () => {
    const sprite = moving([[0, 100]])
    const leg    = sprite.legs[0]!
    timeline.unwind(PACE.chain, 60, { fades: [], legs: [[sprite, leg]] } as never)
    expect(sprite.legs).toHaveLength(1)
    expect(sprite.legs[0]).toMatchObject({ t0: 60, t1: 60 + Math.max(PACE.chain, 60) })
    expect(sprite.legs[0]!.trail.end).toEqual({ x: 0, y: 0 })
  })

  it('turns a leg that has landed back along its whole trail over the time it took', () => {
    const sprite = moving([[0, 40]])
    timeline.unwind(PACE.chain, 60, { fades: [], legs: [[sprite, sprite.legs[0]!]] } as never)
    const [back] = sprite.legs
    expect(back).toMatchObject({ t0: 60, t1: 60 + Math.max(PACE.chain, 40) })
    expect([back!.trail.start, back!.trail.end]).toEqual([{ x: 45, y: 0 }, { x: 0, y: 0 }])
  })

  it('drops a leg yet to start with no turn back', () => {
    const sprite = moving([[100, 200]])
    timeline.unwind(PACE.chain, 60, { fades: [], legs: [[sprite, sprite.legs[0]!]] } as never)
    expect([sprite.legs, sprite.end]).toEqual([[], 0])
  })

  it('fades a running fade back to where it started', () => {
    const sprite = moving([], [[0, 100]])
    timeline.unwind(PACE.chain, 50, { fades: [[sprite, sprite.fades[0]!]], legs: [] } as never)
    expect(sprite.fades)
      .toEqual([{ a0: 0.5, a1: 1, plan: undefined, t0: 50, t1: 50 + Math.max(PACE.chain, 50) }])
  })
})

describe('tie', () => {
  it('times a fade to end as its leg reaches a length, and moves it as the leg moves', () => {
    const sprite = moving([[0, 100]])
    const leg    = sprite.legs[0]!
    const fade   = { a0: 1, a1: 0, plan: undefined, t0: 0, t1: 20 }
    timeline.tie(leg, 'end', fade, leg.trail.total)
    expect([fade.t0, fade.t1]).toEqual([expect.closeTo(80), expect.closeTo(100)])
    leg.t1 = 200
    timeline.retime(leg)
    expect([fade.t0, fade.t1]).toEqual([expect.closeTo(180), expect.closeTo(200)])
  })

  it('times a fade to start as its leg sets off from its start', () => {
    const sprite = moving([[10, 100]])
    const leg    = sprite.legs[0]!
    const fade   = { a0: 0, a1: 1, plan: undefined, t0: 0, t1: 30 }
    timeline.tie(leg, 'start', fade, 0)
    expect(fade.t0).toBeCloseTo(10)
    expect(fade.t1).toBeCloseTo(40)
  })

  it('times a fade to the leg’s end where its trail has no length', () => {
    const leg  = { ...moving([[0, 100]]).legs[0]!, trail: new Trail([0, 0]) }
    const fade = { a0: 0, a1: 1, plan: undefined, t0: 0, t1: 10 }
    timeline.tie(leg, 'start', fade, 0)
    expect(fade.t0).toBeCloseTo(100)
  })
})
