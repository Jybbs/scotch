import { describe, expect, it } from 'vitest'

import examples   from '../../../lib/rendered/examples.json' with { type: 'json' }
import { ovalOf } from '../../../lib/front/example.ts'

/**
 * Lists the plies, counted from 1, whose positions an arc marks as shared.
 */
function sharedPlies(shared: boolean[]): number[] {
  return shared.flatMap((on, k) => on ? [k + 1] : [])
}

/**
 * Builds one side of a made-up example, its moves and a count of frames.
 */
function side(frames: number, played: string[][]): { frames: unknown[], played: string[][] } {
  return { frames: Array.from({ length: frames }), played }
}

describe('ovalOf on the front example', () => {
  it('shows as many plies as the front example draws frames for', () => {
    expect(ovalOf().shown).toBe(examples.front.stored.frames.length - 1)
  })

  it('reads the submitted line on the top arc and the stored game on the bottom one', () => {
    const oval = ovalOf()
    expect(oval.top.moves.map(move => move.san)).toEqual(examples.front.submitted.played.map(([san]) => san))
    expect(oval.bot.moves.map(move => move.san)).toEqual(examples.front.stored.played.map(([san]) => san))
  })

  it('marks each ply whose position falls inside the span the match found', () => {
    const { length, start } = examples.front.span
    expect(sharedPlies(ovalOf().top.shared)).toEqual(Array.from({ length }, (_, offset) => start + offset))
  })
})

describe('ovalOf on a made-up example', () => {
  const offset = ovalOf({
    span      : { length: 2, offset: 1, start: 1 },
    stored    : side(4, [['e4', 'P'], ['e5', 'p'], ['Nf3', 'N']]),
    submitted : side(4, [['e4', 'P'], ['e5', 'p'], ['Nf3', 'N']])
  })

  it("counts the stored game's span from its own offset", () => {
    expect(sharedPlies(offset.top.shared)).toEqual([1, 2])
    expect(sharedPlies(offset.bot.shared)).toEqual([2, 3])
  })

  it('marks each ply where either arc reaches a shared position', () => {
    expect(sharedPlies(offset.shared)).toEqual([1, 2, 3])
  })

  it('shows only the plies the shorter drawn game holds frames for', () => {
    const oval = ovalOf({
      span      : { length: 1, offset: 0, start: 1 },
      stored    : side(3, [['e4', 'P'], ['e5', 'p']]),
      submitted : side(2, [['e4', 'P']])
    })
    expect(oval.shown).toBe(1)
  })

  it('names each piece by its kind whichever side moves it', () => {
    const oval = ovalOf({
      span      : { length: 1, offset: 0, start: 1 },
      stored    : side(3, [['O-O', 'K'], ['O-O', 'k']]),
      submitted : side(3, [['e4', 'P'], ['e5', 'p']])
    })
    expect(oval.bot.moves.map(move => move.kind)).toEqual(['k', 'k'])
    expect(oval.top.moves.map(move => move.kind)).toEqual(['p', 'p'])
  })

  it('refuses a symbol naming no piece of the set', () => {
    const made = {
      span      : { length: 1, offset: 0, start: 1 },
      stored    : side(2, [['x', 'X']]),
      submitted : side(2, [['x', 'X']])
    }
    expect(() => ovalOf(made)).toThrow('no piece of the set has the symbol X')
  })
})
