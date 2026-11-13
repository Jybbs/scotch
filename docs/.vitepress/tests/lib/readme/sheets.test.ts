import { describe, expect, it } from 'vitest'

import { sheetsOf }      from '../../../lib/readme/sheets.ts'
import { scene, shotAt } from '../../common/shots.ts'

/**
 * The chip both sheets draw under the move the cursor reached.
 */
const CHIP = /<g [^>]*><rect [^>]*rx="3"[^>]*\/><\/g>/gu
const { part } = scene.loaded.shared!

describe('sheetsOf', () => {
  it('numbers both sheets up to the move where the games part', async () => {
    const svg = await sheetsOf(shotAt(0), 300, 0)
    expect(svg.match(/\[\d+\]/gu)).toHaveLength(2 * Math.ceil(part / 2))
  })

  it.each([
    { chips: 0, faded: 0, frame: [0, 0], where: 'at the starting position' },
    { chips: 2, faded: 2, frame: [0, 1], where: 'sliding in from the start' },
    { chips: 2, faded: 0, frame: [3, 4], where: 'sliding between two moves' },
    { chips: 2, faded: 2, frame: [part, 0], where: 'sliding back to the start' }
  ])('draws $chips chips, $faded faded, $where', async ({ chips, faded, frame }) => {
    const svg   = await sheetsOf(shotAt(frame[0]!, frame[1]), 300, 0)
    const drawn = [...svg.matchAll(CHIP)].map(([chip]) => chip)
    expect([drawn.length, drawn.filter(chip => chip.includes('opacity')).length]).toEqual([chips, faded])
  })
})
