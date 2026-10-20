import { describe, expect, it, vi } from 'vitest'

import measures                     from './fixtures/measures.json' with { type: 'json' }
import { CYCLE, timingOf }          from '../../../lib/front/cycle.ts'
import { ALPHA }                    from '../../../lib/front/layers.ts'
import { type Point, RING, layout } from '../../../lib/front/layout.ts'
import { type Frame, Scene }        from '../../../lib/front/scene.ts'
import { PUSH }                     from '../../../lib/front/spring.ts'
import { front, looseOf, sceneAt }  from '../../common/front.ts'

const ringTimes = [[RING.dur - 0.01, 1], [RING.dur, 0]] as const
const settled   = timingOf(front.shown).setAt + 1

/**
 * Lists the colorings a scene draws at its moment.
 */
function layersOf(scene: Scene): Set<string> {
  return new Set(scene.draw(5000).stamps.map(stamp => stamp.layer))
}

/**
 * Lists how far a pointer or a passing piece has pushed each of `motes`.
 */
function pushesOf(motes: Scene['motes']): number[][] {
  return motes.map(piece => [piece.ox, piece.oy])
}

/**
 * Lists the rings a shared pair that landed `since` seconds ago opens around
 * the scene's first piece.
 */
function ringsAt(scene: Scene, since: number): Frame['rings'] {
  const frame: Frame = { rings: [], stamps: [] }
  scene.stamp(frame, scene.motes[0]!, { layers: [['run', ALPHA.run]], since, size: 17 }, [100, 100], 900)
  return frame.rings
}

describe('Scene.build', () => {
  it("lays out the settled field and makes way for every piece in the oval's path", () => {
    const scene = new Scene(front)
    expect(scene.build(measures.wide, layout(measures.wide, front.shared))).toEqual({ lost: 0, made: 39 })
    expect(looseOf(scene.motes)).toHaveLength(306)
  })
})

describe('Scene.draw through the cycle', () => {
  it('draws every loose piece in plain ink before the oval gathers', () => {
    expect(layersOf(sceneAt(5))).toEqual(new Set(['ink']))
  })

  it("draws both games in white and black and the shared pairs in the run's color in the oval", () => {
    expect(layersOf(sceneAt(settled))).toEqual(new Set(['ink', 'plain-bot', 'plain-top', 'run']))
  })

  it("edges the pieces in flight in their games' colors", () => {
    expect(layersOf(sceneAt(CYCLE.gatherAt + 0.4))).toContain('edged-top')
  })

  it('opens a ring around a shared pair just after it lands', () => {
    const scene     = sceneAt()
    scene.time      = scene.timing.land[front.top.shared.indexOf(true)]! + 0.1
    const { rings } = scene.draw(5000)
    expect(rings.length).toBeGreaterThan(0)
    expect(Math.min(...rings.map(ring => Math.min(ring.alpha, ring.radius)))).toBeGreaterThan(0)
  })
})

describe('Scene.draw on the page', () => {
  it("leaves out every piece beyond the backdrop's height", () => {
    const scene = sceneAt()
    expect(scene.draw(200).stamps.length).toBeLessThan(scene.draw(5000).stamps.length)
  })

  it('draws each piece where the page has scrolled it', () => {
    const scene  = sceneAt()
    const middle = scene.draw(5000).stamps.find(stamp => stamp.y > 400)!
    scene.shift  = 100
    expect(scene.draw(5000).stamps.find(stamp => stamp.x === middle.x)?.y).toBeCloseTo(middle.y - 100, 9)
  })

  it('draws a pushed piece where its push carries it', () => {
    const scene  = sceneAt()
    const before = scene.draw(5000).stamps[0]!
    Object.assign(scene.motes[0]!, { ox: 5, oy: -3 })
    expect(scene.draw(5000).stamps[0]).toMatchObject({ x: before.x + 5, y: before.y - 3 })
  })

  it('fades a loose piece toward the foot', () => {
    const scene    = sceneAt()
    const { F, H } = measures.wide
    const deep     = looseOf(scene.motes).find(piece => piece.hy > F + 20)!
    expect(scene.depth(deep.hy)).toBeCloseTo(ALPHA.foot, 6)
    expect(scene.depth((H + F) / 2)).toBeCloseTo((1 + ALPHA.foot) / 2, 9)
    expect(scene.depth(10)).toBe(1)
  })
})

describe('Scene.away', () => {
  it('moves a loose piece aside as an oval piece comes within reach of a place it stands near', () => {
    const scene   = sceneAt()
    const { way } = scene.motes.find(piece => piece.way)!
    const at      = (gap: number): Map<string, Point> =>
      new Map(way!.near.map(place => [place.id, [place.x + gap, place.y]]))
    expect([way!.r0, (way!.r0 + way!.r1) / 2, 0].map(gap => scene.away(way!, at(gap))))
      .toEqual([0, expect.closeTo(0.5, 9), 1])
  })
})

describe('Scene.lookAt', () => {
  it('dims a loose piece across the hero alone while the oval forms', () => {
    const scene  = sceneAt()
    const states = scene.states()
    const loose  = looseOf(scene.motes)
    const hero   = loose.find(piece => piece.dy < measures.wide.H)!
    const below  = loose.find(piece => piece.dy > measures.wide.H)!
    expect(scene.lookAt(hero, states, 0.5).layers).toEqual([['ink', expect.closeTo(ALPHA.loose * 0.5, 9)]])
    expect(scene.lookAt(below, states, 0.5).layers)
      .toEqual([['ink', expect.closeTo(ALPHA.loose * scene.depth(below.dy), 9)]])
  })

  it('hushes the loose pieces to 45 percent of their strength once the oval stands', () => {
    const scene = sceneAt(settled)
    const look  = vi.spyOn(scene, 'lookAt')
    scene.draw(5000)
    expect(look.mock.calls.map(([, , hush]) => hush)).toAllEqual(expect.closeTo(0.45, 6))
  })
})

describe('Scene.arcAt', () => {
  it.each([
    ['on its place where its home sits there', [0, 0], 0.9, 1, [0, 0]],
    ['5 pixels past its place on its way out', [100, 0], 1, 1, [5, 0]],
    ['5 pixels past its home on its way back', [100, 0], 0, -1, [-105, 0]],
    ['5 pixels past its place on its way up from a home below it', [0, -100], 1, 1, [0, -5]]
  ] as const)('holds an oval piece %s', (_, [left, up], p, out, [x, y]) => {
    const scene    = sceneAt()
    const piece    = scene.motes.find(each => each.id === '0top')!
    const [sx, sy] = scene.plan!.slots[0]!
    Object.assign(piece, { dx: sx - left, dy: sy - up })
    expect(scene.arcAt(piece, { col: 0, out, p, push: 5, since: -1, u: 0.85 }))
      .toEqual([expect.closeTo(sx + x, 9), expect.closeTo(sy + y, 9)])
  })
})

describe('Scene.drift', () => {
  it.each([['across', 'dx', 'hx', 'px', 'ax', 'fx'], ['down', 'dy', 'hy', 'py', 'ay', 'fy']] as const)(
    'carries a piece %s half its drift off home a twelfth of a period on, as far the other way half on',
    (_, at, home, period, reach, phase) => {
      const scene   = sceneAt()
      const piece   = Object.assign(scene.motes[0]!, { [phase]: 0 })
      scene.drifted = piece[period] / 12
      scene.drift()
      expect(piece[at] - piece[home]).toBeCloseTo(piece[reach] / 2, 9)
      scene.drifted += piece[period] / 2
      scene.drift()
      expect(piece[at] - piece[home]).toBeCloseTo(-piece[reach] / 2, 9)
    }
  )
})

describe('Scene.step', () => {
  it('moves the clock and the drift on by the time a frame covers, capped at 40 milliseconds', () => {
    const scene = sceneAt(5)
    scene.step(16, 5000)
    scene.step(400, 5000)
    expect(scene.time).toBeCloseTo(5.056, 9)
    expect(scene.drifted).toBeCloseTo(0.056, 9)
  })

  it.each([
    ['an oval piece firmly once its pair stands in its place', settled, '0top', PUSH.firm],
    ['an oval piece slackly while its pair is home', 5, '0top', PUSH.slack],
    ['a loose piece slackly', settled, 'loose0', PUSH.slack]
  ] as const)('pulls %s back to its path', (_, time, id, stiff) => {
    const scene = sceneAt(time)
    const piece = scene.motes.find(each => each.id === id)!
    piece.ox    = 5
    scene.step(16, 5000)
    expect(piece.vx).toBeCloseTo(-stiff * 5 * 0.016, 9)
  })

  it('pushes a loose piece aside as an oval piece in flight passes it', () => {
    const scene = sceneAt(CYCLE.gatherAt + 0.5)
    for (let frame = 0; frame < 30; frame++) scene.step(16, 5000)
    expect(Math.max(...looseOf(scene.motes).map(piece => Math.hypot(piece.vx, piece.vy)))).toBeGreaterThan(0)
  })

  it('carries every piece along its drift as the clock steps', () => {
    const stepped = sceneAt()
    const drifted = Object.assign(sceneAt(), { drifted: 0.04 })
    stepped.step(40, 5000)
    drifted.drift()
    expect(stepped.motes.map(piece => [piece.dx, piece.dy]))
      .toEqual(drifted.motes.map(piece => [piece.dx, piece.dy]))
  })
})

describe('Scene.step on a scrolled page', () => {
  it('stirs the loose pieces around a pointer where the page has scrolled them', () => {
    const scene  = sceneAt(5)
    const target = looseOf(scene.motes).find(piece => piece.hy > 600)!
    scene.shift  = 300
    scene.point(true, 'move', 0, target.dx + 5, target.dy - scene.shift)
    scene.step(16, 5000)
    expect(Math.hypot(target.vx, target.vy)).toBeGreaterThan(0)
  })

  it('pushes the loose pieces aside the same wherever the page has scrolled', () => {
    const top      = sceneAt(CYCLE.gatherAt + 0.5)
    const scrolled = Object.assign(sceneAt(CYCLE.gatherAt + 0.5), { shift: 300 })
    for (let frame = 0; frame < 30; frame++) {
      top.step(16, 5000)
      scrolled.step(16, 5000)
    }
    expect(pushesOf(scrolled.motes)).toEqual(pushesOf(top.motes))
  })
})

describe('Scene.step on the oval', () => {
  it('pushes an oval piece from a pointer within reach', () => {
    const scene  = sceneAt(settled)
    const piece  = scene.motes.find(each => each.id === '0top')!
    const [x, y] = scene.arcAt(piece, scene.states()[0]!)
    scene.point(true, 'move', 0, x - 5, y - scene.shift)
    scene.step(16, 5000)
    expect(piece.vx).toBeGreaterThan(0)
  })

  it('pushes no piece where no pointer stands and no oval piece travels', () => {
    const scene = sceneAt(5)
    for (let frame = 0; frame < 30; frame++) scene.step(16, 5000)
    expect(pushesOf(scene.motes)).toAllEqual([0, 0])
  })

  it('pushes no oval piece from the others in flight', () => {
    const scene = sceneAt(CYCLE.gatherAt + 0.5)
    for (let frame = 0; frame < 30; frame++) scene.step(16, 5000)
    expect(pushesOf(scene.motes.filter(piece => piece.k >= 0))).toAllEqual([0, 0])
  })
})

describe('Scene.hold', () => {
  it('holds the oval formed in its places with every push let go', () => {
    const scene = sceneAt(5)
    Object.assign(scene.motes[0]!, { ox: 4, oy: 3, vx: 2, vy: 1 })
    scene.hold()
    expect(scene.motes[0]).toMatchObject({ ox: 0, oy: 0, vx: 0, vy: 0 })
    expect(scene.states().map(state => state.p)).toAllEqual(1)
  })

  it("moves every loose piece in the oval's path all the way aside while it holds", () => {
    const scene = sceneAt()
    scene.hold()
    const piece      = scene.motes.find(each => each.way)!
    const { tx, ty } = piece.way!
    expect(scene.made(piece, new Map()))
      .toEqual([expect.closeTo(piece.dx + tx - piece.hx, 9), expect.closeTo(piece.dy + ty - piece.hy, 9)])
  })
})

describe('Scene.stamp', () => {
  it.each(ringTimes)('opens a ring %d seconds after landing only within its time', (since, rings) => {
    expect(ringsAt(sceneAt(), since)).toHaveLength(rings)
  })

  it('widens a ring to the reach the layout leaves it and fades it out as its time runs', () => {
    const scene               = sceneAt()
    const [early, late, last] = [0.1, 0.5, RING.dur - 0.001].map(since => ringsAt(scene, since)[0]!)
    expect(late!.radius).toBeGreaterThan(early!.radius)
    expect(late!.alpha).toBeLessThan(early!.alpha)
    expect([last!.radius, last!.alpha])
      .toEqual([expect.closeTo(scene.plan!.ring - 1, 1), expect.closeTo(0, 3)])
  })
})
