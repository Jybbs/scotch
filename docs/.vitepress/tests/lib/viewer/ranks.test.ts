import { describe, expect, it } from 'vitest'

import * as ranks from '../../../lib/viewer/ranks.ts'

/**
 * Builds a tied game rated `white` and `black`, each left untagged where it
 * is `undefined`.
 */
function rated(white?: string, black?: string): ranks.Tied {
  return { headers: { BlackElo: black, WhiteElo: white } }
}

describe('rankOf', () => {
  it.each([
    ['2700', '2700', 'Q'],
    ['2699', '2699', 'R'],
    ['2600', '2600', 'R'],
    ['2599', '2599', 'B'],
    ['2400', '2400', 'N'],
    ['2400', '2399', 'N'],
    ['2399', '2399', 'P'],
    ['2650', undefined, 'R'],
    [undefined, '2450', 'N'],
    ['0', '2500', 'B'],
    ['?', '-', 'P'],
    [undefined, undefined, 'P']
  ])('sets White at %j and Black at %j in the rank of the %s', (white, black, piece) => {
    expect(ranks.RANKS[ranks.rankOf(rated(white, black))]!.piece).toBe(piece)
  })
})

describe('ranked', () => {
  it('lists each tied game by its rank in the order the match ranks them', () => {
    const ties = [rated('2800', '2700'), rated(), rated('2610', '2600'), rated('2750', '2750'), rated('2390')]
    expect(ranks.ranked(ties)).toEqual([[0, 3], [2], [], [], [1, 4]])
  })

  it('lists no game in any rank where no game ties', () => {
    expect(ranks.ranked([])).toEqual([[], [], [], [], []])
  })
})

describe('dotsOf', () => {
  it.each([
    [1, [0]],
    [3, [0, 1, 2]],
    [7, [0, 1, 2, 3, 4, 5, 6]],
    [8, [0, 2, 3, 4, 5, 6, 7]],
    [155, [0, 23, 45, 67, 89, 111, 133]]
  ])('opens each dot of a rank of %i games on the places %j', (count, places) => {
    expect(ranks.dotsOf(count)).toEqual(places)
  })
})

describe('dotOf', () => {
  it.each([
    [0, 3, 0],
    [2, 3, 2],
    [0, 155, 0],
    [22, 155, 0],
    [23, 155, 1],
    [154, 155, 6]
  ])('marks the game at %i of a rank of %i games on dot %i', (here, count, dot) => {
    expect(ranks.dotOf(here, count)).toBe(dot)
  })

  it.each([5, 8, 30, 155, 13_610])('marks each dot of a rank of %i games by the game it opens on', count => {
    const dots = ranks.dotsOf(count)
    expect(dots.map(opens => ranks.dotOf(opens, count))).toEqual(dots.map((_, dot) => dot))
  })
})
