import { describe, expect, it } from 'vitest'

import { CYCLE }      from '../../../lib/front/cycle.ts'
import type { Scene } from '../../../lib/front/scene.ts'
import { sceneAt }    from '../../common/front.ts'

/**
 * Taps the scene at one point, a press a second after the page opens and a
 * release `after` milliseconds later and `drift` pixels across.
 */
function tap(scene: Scene, after = 100, drift = 0): void {
  scene.point(true, 'down', 1000, 10, 10)
  scene.point(true, 'up', 1000 + after, 10 + drift, 10)
}

describe('Scene.point taps', () => {
  it('gathers the oval on a tap while its pieces are home', () => {
    const scene = sceneAt(3)
    tap(scene)
    expect(scene.time).toBe(CYCLE.gatherAt)
  })

  it('lets the oval go on a tap while it stands', () => {
    const scene = sceneAt()
    scene.time  = scene.timing.setAt + 1
    tap(scene)
    expect(scene.time).toBe(CYCLE.releaseAt)
  })

  it("gathers the next cycle's oval on a tap once every piece is home again", () => {
    const scene = sceneAt()
    scene.time  = scene.timing.looseAt + 1
    tap(scene)
    expect(scene.time).toBe(CYCLE.length + CYCLE.gatherAt)
  })

  it('leaves the cycle as it runs on a tap while pieces travel', () => {
    const scene = sceneAt(CYCLE.gatherAt + 1)
    tap(scene)
    expect(scene.time).toBe(CYCLE.gatherAt + 1)
  })

  it('holds the oval or lets it go on a tap where the scene does not animate', () => {
    const scene   = sceneAt(3)
    scene.animate = false
    tap(scene)
    expect(scene.held).toBe(true)
    tap(scene)
    expect([scene.held, scene.time]).toEqual([false, 0])
  })
})

describe('Scene.point tap thresholds', () => {
  it.each([
    ['a press of 319 ms', 319, 0, CYCLE.gatherAt],
    ['a press of 320 ms', 320, 0, 3],
    ['a drift of 7 px', 100, 7, CYCLE.gatherAt],
    ['a drift of 8 px', 100, 8, 3]
  ])('takes %s for a tap only below 320 ms and 8 px', (_, after, drift, time) => {
    const scene = sceneAt(3)
    tap(scene, after, drift)
    expect(scene.time).toBe(time)
  })

  it("takes a press over the page's content for no tap", () => {
    const scene = sceneAt(3)
    scene.point(false, 'down', 0, 10, 10)
    scene.point(true, 'up', 100, 10, 10)
    expect(scene.time).toBe(3)
  })
})

describe('Scene.point moves', () => {
  it('stirs the pieces from a press inside the backdrop', () => {
    const scene = sceneAt()
    scene.point(true, 'down', 0, 10, 10)
    expect(scene.pointer).toEqual([10, 10])
  })

  it.each(['leave', 'up'] as const)('lets the pointer go on %s and once it lands on the content', kind => {
    const scene = sceneAt()
    scene.point(true, 'move', 0, 10, 10)
    expect(scene.pointer).toEqual([10, 10])
    scene.point(false, 'move', 0, 10, 10)
    expect(scene.pointer).toBeNull()
    scene.point(true, 'move', 0, 10, 10)
    scene.point(true, kind, 0, 10, 10)
    expect(scene.pointer).toBeNull()
  })

  it('takes a release with no press before it for nothing', () => {
    const scene = sceneAt(3)
    scene.point(true, 'up', 0, 10, 10)
    expect(scene.time).toBe(3)
  })

  it('ignores a second release once a tap has ended its press', () => {
    const scene   = sceneAt()
    scene.animate = false
    scene.point(true, 'down', 0, 10, 10)
    scene.point(true, 'up', 100, 10, 10)
    scene.point(true, 'up', 150, 10, 10)
    expect(scene.held).toBe(true)
  })
})
