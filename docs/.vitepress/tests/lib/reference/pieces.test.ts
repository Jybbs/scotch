import { describe, expect, it } from 'vitest'

import * as pieces from '../../../lib/reference/pieces.ts'
import { DRAWINGS } from '../../../lib/site/pieces.ts'

describe('TYPES', () => {
  it('holds every piece the set draws', () => {
    expect([...pieces.TYPES].toSorted()).toEqual(Object.keys(DRAWINGS).toSorted())
  })
})

describe('placeOf', () => {
  it('counts a square from the top left of the board', () => {
    expect(pieces.placeOf(0)).toEqual([0, 7])
    expect(pieces.placeOf(63)).toEqual([7, 0])
  })
})

describe('pieceName', () => {
  it('names a piece by its color and its kind', () => {
    expect(pieces.pieceName('Q')).toBe('White queen')
    expect(pieces.pieceName('n')).toBe('Black knight')
  })
})

describe('squareName', () => {
  it('names a square by its file and its rank', () => {
    expect(pieces.squareName(27)).toBe('d4')
    expect(pieces.squareName(63)).toBe('h8')
  })
})

describe('squareNamed', () => {
  it('reads every square back from the name it is written as', () => {
    expect(Array.from({ length: 64 }, (_, square) => pieces.squareNamed(pieces.squareName(square))))
      .toEqual(Array.from({ length: 64 }, (_, square) => square))
  })
})

describe('reach', () => {
  it.each([
    ['Q', 27, 27], ['R', 27, 14], ['B', 27, 13], ['N', 27, 8], ['K', 27, 8],
    ['P', 11, 2], ['P', 27, 1], ['p', 51, 2], ['p', 35, 1], ['N', 0, 2], ['K', 0, 3]
  ] as const)('reaches from %s on square %i to %i squares', (piece, square, count) => {
    expect(pieces.reach(piece, square).length).toBe(count)
  })

  it('walks a pawn toward the far side, two squares from its home rank', () => {
    expect(pieces.reach('P', 11).toSorted((a, b) => a - b)).toEqual([19, 27])
    expect(pieces.reach('p', 51).toSorted((a, b) => a - b)).toEqual([35, 43])
  })
})

describe('HOMES', () => {
  it('stands a piece where a pawn may take its double step', () => {
    expect(pieces.squareName(pieces.HOMES.P)).toBe('d2')
    expect(pieces.squareName(pieces.HOMES.p)).toBe('d7')
  })
})

describe('WALK', () => {
  it('ends on the pawn its double step reaches', () => {
    const [piece, to] = pieces.WALK.at(-1)!
    expect(pieces.reach(piece, pieces.HOMES[piece])).toContain(to)
  })
})
