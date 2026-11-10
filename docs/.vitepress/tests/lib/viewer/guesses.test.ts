import { describe, expect, it } from 'vitest'

import { EXAMPLES, type Side } from '../../../lib/viewer/examples.ts'
import * as guesses            from '../../../lib/viewer/guesses.ts'

const stored    = EXAMPLES.match.stored!
const submitted = EXAMPLES.match.submitted

/**
 * A side whose one move promotes White's pawn on c7 to a knight.
 */
const underpromoted: Side = {
  ...stored,
  moves      : ['c8=N'],
  placements : ['k7/2P5/8/8/8/8/8/K7', 'k1N5/8/8/8/8/8/8/K7']
}

/**
 * A side whose one move castles White's king short.
 */
const castled: Side = {
  ...stored,
  moves      : ['O-O'],
  placements : ['r3k2r/8/8/8/8/8/8/R3K2R', 'r3k2r/8/8/8/8/8/8/R4RK1']
}

describe('readSan', () => {
  it.each([
    ['Nf3', { kind: 'n', to: 21 }],
    ['e4', { kind: 'p', to: 28 }],
    ['exd5', { file: 4, kind: 'p', to: 35 }],
    ['Raxc8', { file: 0, kind: 'r', to: 58 }],
    ['R1e2', { kind: 'r', rank: 0, to: 12 }],
    ['Qh4xe1', { file: 7, kind: 'q', rank: 3, to: 4 }],
    ['c8=Q', { kind: 'p', promotion: 'q', to: 58 }],
    ['c8N', { kind: 'p', promotion: 'n', to: 58 }],
    ['Bb5+', { kind: 'b', to: 33 }],
    ['Qh4#', { kind: 'q', to: 31 }],
    ['  e4!?  ', { kind: 'p', to: 28 }],
    ['O-O', { castle: 'king', kind: 'k' }],
    ['0-0-0', { castle: 'queen', kind: 'k' }]
  ])('reads %j', (text, read) => {
    expect(guesses.readSan(text)).toEqual(read)
  })

  it.each(['', 'Nf9', 'nf3', 'e2-e4', 'e4!!!', 'Kx', 'O-O-O-O', 'hello'])('reads no move in %j', text => {
    expect(guesses.readSan(text)).toBeUndefined()
  })
})

describe('judge', () => {
  it.each<[string, guesses.Offer, boolean]>([
    ['the stored move typed', { typed: 'Bb4' }, true],
    ['the stored move typed with a check sign it lacks', { typed: 'Bb4+' }, true],
    ['the stored move typed naming the file it leaves', { typed: 'Bfb4' }, true],
    ['the stored move typed naming another file', { typed: 'Bgb4' }, false],
    ['another piece typed to the same square', { typed: 'Nb4' }, false],
    ['the same piece typed to another square', { typed: 'Bc5' }, false],
    ['the stored move dragged', { hop: { from: 61, to: 25 } }, true],
    ['the stored piece dragged to another square', { hop: { from: 61, to: 34 } }, false]
  ])('judges %s at Black’s fourth move', (_, offer, matched) => {
    expect(guesses.judge(offer, stored, 7)).toBe(matched)
  })

})

describe('judge at a promotion', () => {
  it.each<[string, guesses.Offer, boolean]>([
    ['the promotion typed', { typed: 'c8=Q' }, true],
    ['the promotion typed without its piece, taken as a queen', { typed: 'c8' }, true],
    ['an underpromotion typed', { typed: 'c8=N' }, false],
    ['the pawn dragged to the last rank', { hop: { from: 50, to: 58 } }, true]
  ])('judges %s against a promotion to a queen', (_, offer, matched) => {
    expect(guesses.judge(offer, submitted, 48)).toBe(matched)
  })

  it.each<[string, guesses.Offer, boolean]>([
    ['the underpromotion typed', { typed: 'c8=N' }, true],
    ['the promotion typed without its piece, taken as a queen', { typed: 'c8' }, false],
    ['the pawn dragged to the last rank, taken as a queen', { hop: { from: 50, to: 58 } }, false]
  ])('judges %s against an underpromotion', (_, offer, matched) => {
    expect(guesses.judge(offer, underpromoted, 0)).toBe(matched)
  })

})

describe('judge at a named rook, at castling, and at a move it cannot read', () => {
  it.each<[string, guesses.Offer, boolean]>([
    ['the capture typed naming its rook’s file', { typed: 'Raxc8' }, true],
    ['the capture typed naming no square it leaves', { typed: 'Rxc8' }, false],
    ['the capture typed naming the other rook’s file', { typed: 'Rfxc8' }, false]
  ])('judges %s where the stored move names the rook it moves', (_, offer, matched) => {
    expect(guesses.judge(offer, submitted, 49)).toBe(matched)
  })

  it.each<[string, guesses.Offer, boolean]>([
    ['short castling typed', { typed: 'O-O' }, true],
    ['short castling typed with zeros', { typed: '0-0' }, true],
    ['long castling typed', { typed: 'O-O-O' }, false],
    ['the king typed to its castled square', { typed: 'Kg1' }, false],
    ['the king dragged to its castled square', { hop: { from: 4, to: 6 } }, true]
  ])('judges %s against short castling', (_, offer, matched) => {
    expect(guesses.judge(offer, castled, 0)).toBe(matched)
  })

  it.each<[string, guesses.Offer, number]>([
    ['text that is no move in SAN', { typed: 'hello' }, 7],
    ['a move at a ply the stored game plays none from', { typed: 'Bb4' }, stored.moves.length]
  ])('judges nothing for %s', (_, offer, ply) => {
    expect(guesses.judge(offer, stored, ply)).toBeUndefined()
  })
})

describe('tallyOf', () => {
  it.each([
    ['no ply', [], { matched: 0, offered: 0 }],
    ['a ply stepped past with no offer', [{}], { matched: 0, offered: 0 }],
    [
      'two offers, one matching, beside a ply stepped past',
      [{ matched: true, offered: 'e4' }, {}, { matched: false, offered: 'd4' }],
      { matched: 1, offered: 2 }
    ]
  ])('counts %s', (_, offered, tally) => {
    expect(guesses.tallyOf(new Map(offered.map((guess, ply) => [ply, guess])))).toEqual(tally)
  })
})
