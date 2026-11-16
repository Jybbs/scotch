import { describe, expect, it } from 'vitest'

import { facesOf }  from '../../../lib/cards/faces.ts'
import { Outliner } from '../../../lib/readme/outline.ts'

/**
 * A line of code set in a box the text fits in.
 */
const SETTING = { color: '#102030', face: 'code', height: 20, size: 12, width: 120 } as const

describe('Outliner', () => {
  const outliner = new Outliner(facesOf(import.meta.url))

  it('sets a line as outlined paths in its color, with no text left to load a face for', async () => {
    const paths = await outliner.line('PLY 6', SETTING)
    expect(paths).toMatch(/^<path [^>]*fill="#102030"/u)
    expect(paths).not.toContain('<text')
  })

  it('sets a blank line as no paths at all', async () => {
    expect(await outliner.line(' ', SETTING)).toBe('')
  })

  it('lays out a line it has set once, however often it is asked', () => {
    expect(outliner.line('MEET', SETTING)).toBe(outliner.line('MEET', SETTING))
  })

  it('sets a line in capitals under `caps`, as the uppercase line is set', async () => {
    const [caps, upper] = await Promise.all([
      outliner.line('part', { ...SETTING, caps: true }),
      outliner.line('PART', SETTING)
    ])
    expect(caps).toBe(upper)
  })
})
