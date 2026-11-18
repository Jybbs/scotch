import { describe, expect, it, vi } from 'vitest'

import { HEIGHT, LAYOUT }   from '../../../lib/readme/parts.ts'
import { encodePreview }    from '../../../lib/readme/reel.ts'
import { PACE }             from '../../../lib/readme/scene.ts'
import { decoded }          from '../../common/gif.ts'
import { scene }            from '../../common/shots.ts'

/**
 * The renders running now and the most that ran at once, which the mock of
 * `renderAsync` counts around each call to the real one.
 */
const flight = vi.hoisted(() => ({ most: 0, now: 0 }))

vi.mock('@resvg/resvg-js', async original => {
  const resvg = await original<typeof import('@resvg/resvg-js')>()
  return {
    ...resvg,
    renderAsync: async (...args: Parameters<typeof resvg.renderAsync>) => {
      flight.most = Math.max(flight.most, ++flight.now)
      try {
        return await resvg.renderAsync(...args)
      } finally {
        flight.now--
      }
    }
  }
})

describe('encodePreview', () => {
  it('encodes each frame into a looping GIF at the preview’s size and the pace’s delay', async () => {
    const frames   = [0, 400, 400].map(at => scene.frames[at]!)
    const shooting = { concurrency: 2, sample: 2 }
    const read     = decoded(await encodePreview(import.meta.url, 'light', { ...scene, frames }, shooting))
    expect(read).toMatchObject({ height: HEIGHT, loops: 0, width: LAYOUT.width })
    expect(read.delays).toEqual([PACE.frame, PACE.frame, PACE.frame])
    expect(read.frames[1]).not.toEqual(read.frames[0])
    expect(read.frames[2]).toEqual(read.frames[1])
  }, 60_000)

  it('draws no more frames at once than its concurrency allows', async () => {
    const frames   = [0, 0, 0, 0, 0].map(at => scene.frames[at]!)
    const shooting = { concurrency: 2, sample: 5 }
    flight.most    = 0
    await encodePreview(import.meta.url, 'light', { ...scene, frames }, shooting)
    expect(flight.most).toBe(2)
  }, 60_000)
})
