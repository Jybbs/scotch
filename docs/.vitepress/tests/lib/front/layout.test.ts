import { describe, expect, it } from 'vitest'

import measures  from './fixtures/measures.json' with { type: 'json' }
import { RING, boxAround, gapBetween, layout, pads, slotOf } from '../../../lib/front/layout.ts'
import { front } from '../../common/front.ts'

const { shared } = front

/**
 * Measures the narrowest gap between a piece in its place on either arc and a
 * part of the page the oval keeps clear of, on the page `name` measured.
 */
function lockupGap(name: keyof typeof measures): number {
  const plan = layout(measures[name], shared)
  return Math.min(...plan.slots.flatMap(([x, y]) => [y, 2 * plan.cy - y].flatMap(row =>
    measures[name].parts.map(part => gapBetween(boxAround([x, row], plan.size), part)))))
}

describe('gapBetween', () => {
  it.each([
    ['touching', { h: 10, w: 10, x: 10, y: 0 }, 0],
    ['overlapping', { h: 10, w: 10, x: 5, y: 5 }, 0],
    ['beside', { h: 10, w: 10, x: 13, y: 0 }, 3],
    ['diagonal', { h: 10, w: 10, x: 13, y: 14 }, 5]
  ])('measures two boxes %s', (_, other, gap) => {
    expect(gapBetween({ h: 10, w: 10, x: 0, y: 0 }, other)).toBeCloseTo(gap, 9)
  })
})

describe('layout around the lockup', () => {
  it('centers the oval on the lockup', () => {
    const { lock } = measures.wide
    const plan     = layout(measures.wide, shared)
    expect([plan.cx, plan.cy]).toEqual([lock.x + lock.w / 2, lock.y + lock.h / 2])
  })

  it('reaches 26 percent of the page past the lockup on a wide page', () => {
    const plan = layout(measures.wide, shared)
    expect(plan.rx).toBeCloseTo(measures.wide.lock.w / 2 + measures.wide.W * 0.26, 9)
  })

  it.each([['wide', 17, 33.45024], ['narrow', 11, 24.00530]] as const)(
    'lays the %s page out at the size and clearance the settled field took',
    (name, size, cleared) => {
      expect(layout(measures[name], shared).size).toBe(size)
      expect(lockupGap(name)).toBeCloseTo(cleared, 4)
    }
  )

  it('opens a wider ring on a wide page than on a narrow one', () => {
    expect(layout(measures.wide, shared).ringReach).toBe(RING.wide)
    expect(layout(measures.narrow, shared).ringReach).toBe(RING.narrow)
  })

  it('shrinks the pieces where the arcs run short', () => {
    const lock = { h: 20, w: 40, x: 40, y: 100 }
    const plan = layout({ W: 120, lock, parts: [lock] }, shared)
    expect(plan.size).toBeGreaterThanOrEqual(7)
    expect(plan.size).toBeLessThan(plan.loose)
  })

  it("counts a shared pair's ring in the oval's top and bottom", () => {
    const [all, none] = [true, false].map(on => layout(measures.wide, shared.map(() => on)))
    expect(none!.top - all!.top).toBeCloseTo(all!.ring - all!.size / 2, 9)
    expect(all!.bottom - none!.bottom).toBeCloseTo(all!.ring - all!.size / 2, 9)
  })

  it('falls back to the ellipse at its lowest height where no height clears the lockup', () => {
    const wall = { h: 2000, w: 2000, x: -500, y: -500 }
    const plan = layout({ ...measures.wide, parts: [wall] }, shared)
    expect([plan.slots[0], plan.size]).toEqual([[0, 0], 7])
  })
})

describe('layout along the arcs', () => {
  it.each(['narrow', 'wide'] as const)('places one slot per ply on the ellipse of the %s page', name => {
    const { cx, cy, rx, ry, slots } = layout(measures[name], shared)
    expect(slots).toHaveLength(shared.length)
    expect(slots.map(([x, y]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2))
      .toAllEqual(expect.closeTo(1, 2))
  })
})

describe('slotOf', () => {
  it("takes the line's slot on the top arc and its reflection through the center for the stored game", () => {
    const plan   = layout(measures.wide, shared)
    const [x, y] = plan.slots[3]!
    expect([slotOf(plan, 'top', 3), slotOf(plan, 'bot', 3)]).toEqual([[x, y], [x, 2 * plan.cy - y]])
  })
})

describe('pads', () => {
  it.each([[16, 'wide'], [12, 'narrow']] as const)(
    "sets the oval's top %d pixels under the bar and the first card as far under its ring on the %s page",
    (margin, name) => {
      const plan     = layout(measures[name], shared)
      const room     = pads(measures[name], plan)
      const { h, y } = measures[name].lock
      expect(room.top).toBeCloseTo(y + margin - plan.top, 9)
      expect(room.bottom).toBeCloseTo(plan.bottom + margin - (y + h), 9)
    }
  )

  it.each([[12, 639], [16, 640]])(
    "sets the oval's top %i pixels under the bar on a page %i pixels wide",
    (margin, W) => {
      const lock = { h: 10, w: 10, x: 0, y: 100 }
      expect(pads({ W, lock }, { bottom: 0, top: 0 }).top).toBe(100 + margin)
    }
  )

  it('never sets the room below 0', () => {
    expect(pads(measures.wide, { bottom: 0, top: 999 })).toEqual({ bottom: 0, top: 0 })
  })
})
