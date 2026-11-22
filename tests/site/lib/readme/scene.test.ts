import { describe, expect, it } from 'vitest'

import { frontOf }                          from '../../../../docs/.vitepress/lib/front/example.ts'
import { PACE, framesOf, matchOf, sceneOf } from '../../../../docs/.vitepress/lib/readme/scene.ts'

/**
 * A pace whose every leg lasts a whole number of 20-millisecond frames short
 * enough to list.
 */
const SHORT = { back: 40, frame: 20, hold: 60, rest: 20, slide: 40, step: 60 }

describe('framesOf', () => {
  it('holds the start, slides and holds each ply, holds longer at the part, and slides back', () => {
    expect(framesOf(2, SHORT).map(({ from, to }) => `${from}>${to}`)).toEqual([
      '0>0', '0>1', '0>1', '1>1', '1>2', '1>2', '2>2', '2>0', '2>0'
    ])
  })

  it('counts each frame of a leg one frame further into it', () => {
    expect(framesOf(1, SHORT).slice(1, 3).map(({ span, t }) => [span, t])).toEqual([[40, 20], [40, 40]])
  })
})

describe('matchOf', () => {
  const front = frontOf()
  const match = matchOf(front)

  it("starts each game on the starting position, written as a FEN's placement", () => {
    expect(match.submitted.placements[0]).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')
  })

  it.each(['stored', 'submitted'] as const)('carries the %s game up to its last position drawn', game => {
    expect(match[game]!.placements).toHaveLength(front.example[game].length)
    expect(match[game]!.moves).toHaveLength(front.example[game].length - 1)
  })

  it('spans the run the example shares', () => {
    expect(match.span).toMatchObject({ length: front.example.run.length, start: front.example.run.start })
  })
})

describe('sceneOf', () => {
  it('plays the example up to where its games part and back, at the pace the preview keeps', () => {
    const scene = sceneOf()
    const part  = scene.loaded.shared!.part
    expect(scene.frames.at(-1)).toMatchObject({ from: part, to: 0 })
    const played = PACE.rest + part * PACE.step + PACE.hold - PACE.step + PACE.back
    expect(scene.frames.length * PACE.frame).toBe(played)
  })
})
