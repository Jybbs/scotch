import { describe, expect, it } from 'vitest'

import * as offering  from '../../../lib/viewer/offering.ts'
import { standingOf } from '../../../lib/viewer/placements.ts'

/**
 * The pieces standing on each square at the start of a game.
 */
const START = standingOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')

/**
 * Plays a run of presses and releases on a fresh picking from the start, White
 * to move, each a square pressed or released.
 *
 * Returns:
 *   The move the last step made beside the square left picked.
 */
function played(...steps: ['press' | 'release', number][]): [unknown, number | undefined] {
  const picking = new offering.Picking()
  const made    = steps.map(([step, square]) =>
    step === 'press' ? picking.press(square, START, true) : picking.release(square))
  return [made.at(-1), picking.picked]
}

describe('Picking', () => {
  it.each<[string, ['press' | 'release', number][], unknown, number | undefined]>([
    [
      'moves a piece dragged to another square',
      [['press', 12], ['release', 28]],
      { from: 12, to: 28 },
      undefined
    ],
    ['holds a piece pressed and released on its own square', [['press', 12], ['release', 12]], undefined, 12],
    [
      'moves a piece tapped and then a square tapped',
      [['press', 12], ['release', 12], ['press', 28]],
      { from: 12, to: 28 },
      undefined
    ],
    [
      'lets a tapped piece go on a second tap',
      [['press', 12], ['release', 12], ['press', 12]],
      undefined,
      undefined
    ],
    [
      'picks another piece of the side to move instead',
      [['press', 12], ['release', 12], ['press', 11]],
      undefined,
      11
    ],
    [
      'moves a tapped piece onto a piece of the side not to move',
      [['press', 12], ['release', 12], ['press', 52]],
      { from: 12, to: 52 },
      undefined
    ],
    ['picks nothing on a piece of the side not to move', [['press', 52]], undefined, undefined],
    ['picks nothing on an empty square', [['press', 28]], undefined, undefined],
    ['moves nothing on a release with no press before it', [['release', 28]], undefined, undefined]
  ])('%s', (_, steps, made, picked) => {
    expect(played(...steps)).toEqual([made, picked])
  })
})

describe('Picking from the side to move', () => {
  it('picks a piece of Black’s where Black moves', () => {
    const picking = new offering.Picking()
    picking.press(52, START, false)
    expect(picking.picked).toBe(52)
  })

  it('lets the picked piece go as the board takes a new position', () => {
    const picking = new offering.Picking()
    picking.press(12, START, true)
    picking.drop()
    expect([picking.picked, picking.release(28)]).toEqual([undefined, undefined])
  })
})

describe('squareAt', () => {
  it.each([
    ['a8 at the top left from White’s side', 0, 0, 'white', 56],
    ['a1 at the bottom left from White’s side', 44, 359, 'white', 0],
    ['h8 at the top right from White’s side', 359, 0, 'white', 63],
    ['h1 at the top left from Black’s side', 0, 0, 'black', 7],
    ['e4 from Black’s side', 150, 140, 'black', 28],
    ['nothing left of the board', -1, 0, 'white', undefined],
    ['nothing below the board', 0, 360, 'white', undefined],
    ['nothing right of the board', 360, 0, 'black', undefined],
    ['nothing above the board', 0, -1, 'black', undefined]
  ] as const)('reads %s', (_, x, y, facing, square) => {
    expect(offering.squareAt(x, y, facing)).toBe(square)
  })
})

describe('writtenOf', () => {
  it.each([
    ['a pawn’s move with no letter', { from: 12, to: 28 }, 'e2-e4'],
    ['a White knight’s move with its letter', { from: 6, to: 21 }, 'Ng1-f3'],
    ['a Black knight’s move with the same capital letter', { from: 57, to: 42 }, 'Nb8-c6']
  ])('writes %s', (_, hop, written) => {
    expect(offering.writtenOf(hop, START)).toBe(written)
  })
})
