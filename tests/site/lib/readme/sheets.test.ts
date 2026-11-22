import { describe, expect, it } from 'vitest'

import { sceneOf }       from '../../../../docs/.vitepress/lib/readme/scene.ts'
import { sheetsOf }      from '../../../../docs/.vitepress/lib/readme/sheets.ts'
import { scene, shotAt } from '../../common/shots.ts'

/**
 * The chip both sheets draw under the move the cursor reached.
 */
const CHIP = /<g [^>]*><rect [^>]*rx="3"[^>]*\/><\/g>/gu
const { part } = scene.loaded.shared!
/**
 * The preview's scene with the stored game ending on the position where the
 * games part, so its sheet has no move for the ply the games part on.
 */
const ended = (() => {
  const { front } = scene
  return sceneOf({ ...front, example: { ...front.example, stored: front.example.stored.slice(0, part + 1) } })
})()

/**
 * Counts the moves a drawing sets, each a bracketed line not opening on a digit.
 */
function movesIn(svg: string): number {
  return svg.match(/\[[^\]\d][^\]]*\]/gu)?.length ?? 0
}

describe('sheetsOf', () => {
  it('numbers both sheets up to the move where the games part', async () => {
    const svg = await sheetsOf(shotAt(0), 300, 0)
    expect(svg.match(/\[\d+\]/gu)).toHaveLength(2 * Math.ceil(part / 2))
  })

  it('leaves a cell empty where a game has no move for its ply', async () => {
    const [full, short] = await Promise.all([
      sheetsOf(shotAt(0, 0, 50, scene), 300, 0),
      sheetsOf(shotAt(0, 0, 50, ended), 300, 0)
    ])
    expect([movesIn(full), movesIn(short)]).toEqual([28, 27])
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
