import { describe, expect, it } from 'vitest'

import { HEIGHT, LAYOUT }   from '../../../lib/readme/parts.ts'
import { encodePreview }    from '../../../lib/readme/reel.ts'
import { PACE }             from '../../../lib/readme/scene.ts'
import { decoded }          from '../../common/gif.ts'
import { scene }            from '../../common/shots.ts'

describe('encodePreview', () => {
  it('encodes each frame into a looping GIF at the preview’s size and the pace’s delay', async () => {
    const frames = [0, 400, 400].map(at => scene.frames[at]!)
    const read   = decoded(await encodePreview(import.meta.url, 'light', frames, { batch: 2, sample: 2 }))
    expect(read).toMatchObject({ height: HEIGHT, loops: true, width: LAYOUT.width })
    expect(read.delays).toEqual([PACE.frame, PACE.frame, PACE.frame])
    expect(read.frames[1]).not.toEqual(read.frames[0])
    expect(read.frames[2]).toEqual(read.frames[1])
  }, 60_000)
})
