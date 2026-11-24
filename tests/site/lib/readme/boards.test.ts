import { describe, expect, it } from 'vitest'

import { mix }                        from '../../../../docs/.vitepress/lib/identity/colors.ts'
import { boardOf, captionOf, ringOf } from '../../../../docs/.vitepress/lib/readme/boards.ts'
import { sceneOf }                    from '../../../../docs/.vitepress/lib/readme/scene.ts'
import { scene, shotAt }              from '../../common/shots.ts'

/**
 * The preview's scene with the submitted game's first position missing the
 * piece on h1, so the move to ply 1 takes it.
 */
const capturing = (() => {
  const front     = sceneOf().front
  const submitted = front.example.submitted.map((position, ply) => ply === 1
    ? { ...position, standing: position.standing.filter(({ square }) => square !== 7) }
    : position)
  return sceneOf({ ...front, example: { ...front.example, submitted } })
})()
const { meet, part } = scene.loaded.shared!

/**
 * Lists each piece a board draws, as the group placing it.
 */
function uses(svg: string): string[] {
  return [...svg.matchAll(/<g [^>]*><use [^>]*\/><\/g>/gu)].map(([use]) => use)
}

describe('boardOf', () => {

  it('draws every piece of the position at its square while the frame holds', async () => {
    expect(uses(await boardOf('submitted', shotAt(0), 0))).toHaveLength(32)
  })

  it('fades out a piece the move takes, and draws nothing of it once taken', async () => {
    const [sliding, taken] = await Promise.all([
      boardOf('submitted', shotAt(0, 1, 50, capturing), 0),
      boardOf('submitted', shotAt(1, 1, 50, capturing), 0)
    ])
    expect(uses(sliding).filter(use => use.includes('opacity'))).toHaveLength(1)
    expect(uses(taken)).toHaveLength(31)
  })

  it('fades a taken piece back in as the preview slides back to the start', async () => {
    const back = await boardOf('submitted', shotAt(1, 0, 50, capturing), 0)
    expect(uses(back).filter(use => use.includes('opacity'))).toHaveLength(1)
  })

  it.each([
    { marks: 0, ply: 0, where: 'at the starting position' },
    { marks: 2, ply: 1, where: 'after a move' }
  ])('outlines $marks squares $where', async ({ marks, ply }) => {
    const svg = await boardOf('submitted', shotAt(ply), 0)
    expect([...svg.matchAll(/stroke-width/gu)]).toHaveLength(marks)
  })
})

describe('captionOf', () => {
  it.each([
    { move: '[Start]', ply: 0 },
    { move: '[1. d4]', ply: 1 }
  ])('names the side and sets $move at ply $ply', async ({ move, ply }) => {
    const svg = await captionOf('stored', 'Grandmaster’s', shotAt(ply), 0)
    expect(svg).toContain('[Grandmaster’s]')
    expect(svg).toContain(move)
  })
})

describe('ringOf', () => {
  it.each([
    { ply: meet, share: 100, where: 'in the run' },
    { ply: part, share: 0, where: 'where the games part' }
  ])('rings the board in the run mixed $share% into its color $where', ({ ply, share }) => {
    const { colors } = shotAt(ply)
    const band       = mix(colors.run, share, colors.submitted, 'srgb')
    expect(ringOf('submitted', shotAt(ply), 3)).toContain(`fill="${band}"`)
  })
})
