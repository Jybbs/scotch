import { describe, expect, it } from 'vitest'

import * as placements from '../../../lib/viewer/placements.ts'

/**
 * Placements before and after each kind of move a game makes, squares counted
 * from a1 as 0 to h8 as 63.
 */
const MOVES = {
  capture   : ['k7/8/8/3p4/4P3/8/8/K7', 'k7/8/8/3P4/8/8/8/K7'],
  castle    : ['r3k2r/8/8/8/8/8/8/R3K2R', 'r3k2r/8/8/8/8/8/8/R4RK1'],
  enPassant : ['k7/8/8/3pP3/8/8/8/K7', 'k7/8/3P4/8/8/8/8/K7'],
  promotion : ['k7/4P3/8/8/8/8/8/K7', 'k3Q3/8/8/8/8/8/8/K7'],
  advance   : [
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR'
  ]
} as const

describe('changesOf', () => {
  it.each([
    ['a pawn advancing', MOVES.advance, {
      appear  : [],
      travels : [{ from: 12, now: 'P', to: 28, was: 'P' }],
      vanish  : []
    }],
    ['a capture, the taken piece leaving its square', MOVES.capture, {
      appear  : [],
      travels : [{ from: 28, now: 'P', to: 35, was: 'P' }],
      vanish  : [35]
    }],
    ['castling, the king traveling ahead of its rook', MOVES.castle, {
      appear  : [],
      travels : [{ from: 4, now: 'K', to: 6, was: 'K' }, { from: 7, now: 'R', to: 5, was: 'R' }],
      vanish  : []
    }],
    ['en passant, the pawn taken from the square beside the taker', MOVES.enPassant, {
      appear  : [],
      travels : [{ from: 36, now: 'P', to: 43, was: 'P' }],
      vanish  : [35]
    }],
    ['a promotion, the pawn traveling and landing as the queen', MOVES.promotion, {
      appear  : [],
      travels : [{ from: 52, now: 'Q', to: 60, was: 'P' }],
      vanish  : []
    }],
    ['a capture taken back, the taken piece appearing again', MOVES.capture.toReversed(), {
      appear  : [{ piece: 'p', square: 35 }],
      travels : [{ from: 35, now: 'P', to: 28, was: 'P' }],
      vanish  : []
    }],
    ['a promotion taken back, the queen traveling back as the pawn', MOVES.promotion.toReversed(), {
      appear  : [],
      travels : [{ from: 60, now: 'P', to: 52, was: 'Q' }],
      vanish  : []
    }]
  ])('reads %s', (_, [before, after], changes) => {
    expect(placements.changesOf(before!, after!)).toEqual(changes)
  })
})

describe('lastMove', () => {
  it.each([
    ['a pawn advancing', MOVES.advance, { from: 12, to: 28 }],
    ['a capture', MOVES.capture, { from: 28, to: 35 }],
    ['castling as the king’s move', MOVES.castle, { from: 4, to: 6 }],
    ['en passant', MOVES.enPassant, { from: 36, to: 43 }],
    ['a promotion as the pawn’s move', MOVES.promotion, { from: 52, to: 60 }]
  ])('reads %s', (_, [before, after], hop) => {
    expect(placements.lastMove(before, after)).toEqual(hop)
  })

  it('reads no move between two placements that stand the same pieces', () => {
    expect(placements.lastMove(MOVES.advance[0], MOVES.advance[0])).toBeUndefined()
  })

  it('reads no move where a piece appears with nothing leaving', () => {
    expect(placements.lastMove('k7/8/8/8/8/8/8/K7', 'k7/8/8/8/8/8/8/KQ6')).toBeUndefined()
  })
})

describe('standingOf', () => {
  it('stands each piece of the starting position on its square, a1 as 0 and h8 as 63', () => {
    const standing = placements.standingOf(MOVES.advance[0])
    expect([standing[0], standing[4], standing[12], standing[28], standing[60], standing[63]])
      .toEqual(['R', 'K', 'P', undefined, 'k', 'r'])
    expect(standing.filter(Boolean)).toHaveLength(32)
  })
})
