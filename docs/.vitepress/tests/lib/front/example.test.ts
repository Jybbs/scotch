import { describe, expect, it } from 'vitest'

import examples                  from '../../../lib/rendered/examples.json' with { type: 'json' }
import { frontOf, moveAt, same } from '../../../lib/front/example.ts'

const front = frontOf()

describe('frontOf', () => {
  it("reads each game's moves in SAN, in the order it plays them", () => {
    expect(front.moves.submitted.slice(0, 3)).toEqual(['c4', 'e6', 'e3'])
    expect(front.moves.stored.slice(0, 3)).toEqual(['d4', 'Nf6', 'c4'])
  })

  it('writes each decimal key as the 16 hex digits of its 64 bits', () => {
    const keys = ['255', '18446744073709551615']
    const raw  = { ...examples.front, submitted: { ...examples.front.submitted, keys } }
    expect(frontOf(raw).keys.submitted).toEqual(['00000000000000ff', 'ffffffffffffffff'])
  })
})

describe('moveAt', () => {
  it.each([
    ['submitted', 0, 'Start'],
    ['submitted', 1, '1. c4'],
    ['submitted', 2, '1...e6'],
    ['submitted', 13, '7. O-O'],
    ['stored', 13, '7. Qc2']
  ] as const)('writes the move reaching %s ply %i as %s', (game, ply, move) => {
    expect(moveAt(front, game, ply)).toBe(move)
  })
})

describe('same', () => {
  it.each([[6, false], [7, true], [12, true], [13, false]] as const)(
    'reads whether the keys match at ply %i as %s', (ply, matched) => {
      expect(same(front, ply)).toBe(matched)
    })
})
