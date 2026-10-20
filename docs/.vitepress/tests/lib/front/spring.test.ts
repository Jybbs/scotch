import { describe, expect, it } from 'vitest'

import type { Mote }    from '../../../lib/front/motes.ts'
import { PUSH, spring } from '../../../lib/front/spring.ts'

const piece = (overrides: Partial<Mote> = {}): Mote => ({
  ax   : 0,
  ay   : 0,
  dx   : 0,
  dy   : 0,
  fx   : 0,
  fy   : 0,
  game : 'bot',
  home : 0,
  hx   : 0,
  hy   : 0,
  id   : 'a',
  k    : -1,
  kind : 'p',
  ox   : 0,
  oy   : 0,
  px   : 1,
  py   : 1,
  vx   : 0,
  vy   : 0,
  ...overrides
})

describe('spring', () => {
  it('leaves a piece at rest on its path where nothing pushes it', () => {
    const mote = piece()
    spring([100, 100], [100, 100], 9, [], mote, 0, null, 0.016)
    expect([mote.ox, mote.oy, mote.vx, mote.vy]).toEqual([0, 0, 0, 0])
  })

  it('pushes a piece away from a pointer within reach', () => {
    const mote = piece()
    spring([100, 100], [100, 100], 9, [], mote, 0, [90, 100], 0.016)
    expect(mote.vx).toBeGreaterThan(0)
    expect(mote.vy).toBe(0)
  })

  it.each([
    ['at the edge of its reach, which leaves it', PUSH.pointer.radius, false],
    ['a pixel inside its reach, which pushes it', PUSH.pointer.radius - 1, true],
    ['twice its reach away, which leaves it', PUSH.pointer.radius * 2, false]
  ])('takes a pointer %s', (_, distance, pushed) => {
    const mote = piece()
    spring([100, 100], [100, 100], 9, [], mote, 0, [100 - distance, 100], 0.016)
    expect(mote.vx > 0).toBe(pushed)
  })

  it("gives a quarter of the pointer's force at half its reach, across or down", () => {
    const half           = PUSH.pointer.radius / 2
    const [across, down] = [piece(), piece()]
    spring([100, 100], [100, 100], 9, [], across, 0, [100 - half, 100], 0.016)
    spring([100, 100], [100, 100], 9, [], down, 0, [100, 100 - half], 0.016)
    expect([across.vx, down.vy]).toAllEqual(expect.closeTo(PUSH.pointer.force / 4 * 0.016, 9))
  })

  it('pushes a piece aside from a traveling piece within reach, on the page', () => {
    const mote = piece()
    spring([100, 0], [100, 300], 9, [[100, 290]], mote, 0, null, 0.016)
    expect(mote.vy).toBeGreaterThan(0)
  })
})

describe('spring back to its path', () => {
  it('pulls a pushed piece back to its path, harder once its pair stands in its place', () => {
    const [slack, firm] = [piece({ ox: 5 }), piece({ ox: 5 })]
    spring([0, 0], [0, 0], 9, [], slack, 0, null, 0.016)
    spring([0, 0], [0, 0], 9, [], firm, 1, null, 0.016)
    expect(slack.vx).toBeCloseTo(-PUSH.slack * 5 * 0.016, 9)
    expect(firm.vx).toBeCloseTo(-PUSH.firm * 5 * 0.016, 9)
  })

  it('slows a moving piece by the share of critical damping its spring takes', () => {
    const mote   = piece({ vx: 10, vy: 10 })
    const slowed = 10 - 2 * Math.sqrt(PUSH.slack) * PUSH.damping * 0.16
    spring([0, 0], [0, 0], 9, [], mote, 0, null, 0.016)
    expect([mote.vx, mote.vy]).toAllEqual(expect.closeTo(slowed, 9))
  })

  it("caps a push at the field's own and halves the speed that carried it there", () => {
    const mote = piece({ ox: 12, oy: 16 })
    spring([0, 0], [0, 0], 9, [], mote, 0, null, 0.001)
    expect(Math.hypot(mote.ox, mote.oy)).toBeCloseTo(9, 9)
    expect([mote.vx, mote.vy])
      .toEqual([12, 16].map(push => expect.closeTo(-PUSH.slack * push * 0.001 / 2, 9)))
  })
})
