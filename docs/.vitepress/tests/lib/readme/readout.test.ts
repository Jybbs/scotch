import { describe, expect, it } from 'vitest'

import { readoutOf }     from '../../../lib/readme/readout.ts'
import { scene, shotAt } from '../../common/shots.ts'

const { part } = scene.loaded.shared!

describe('readoutOf', () => {
  it("reads out the Viewer's line for the cursor", async () => {
    expect(await readoutOf(shotAt(part))).toContain(`[${scene.loaded.status(part).line}]`)
  })

  it('sets the labels the track writes, where the games meet and part', async () => {
    const svg = await readoutOf(shotAt(0))
    expect(svg).toContain('[MEET]')
    expect(svg).toContain('[PART]')
  })

  it('swatches each game beside its row of the track', async () => {
    const shot = shotAt(0)
    const svg  = await readoutOf(shot)
    expect(svg).toContain(`fill="${shot.colors.submitted}" height="9"`)
    expect(svg).toContain(`fill="${shot.colors.stored}" height="9"`)
  })
})
