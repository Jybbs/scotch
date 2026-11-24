import { describe, expect, it } from 'vitest'

import { EXAMPLES, type Side } from '../../../../docs/.vitepress/lib/viewer/examples.ts'
import * as guesses            from '../../../../docs/.vitepress/lib/viewer/guesses.ts'

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

  it.each([
    '', 'Nf9', 'nf3', 'e2-e4', 'e4!!!', 'Kx', 'O-0', 'O-O-O-O', 'hello'
  ])('reads no move in %j', text => {
    expect(guesses.readSan(text)).toBeUndefined()
  })
})

describe('judge', () => {
  it.each<[string, guesses.Offer, boolean, Side, number]>([
    ['the stored move typed', { typed: 'Bb4' }, true, stored, 7],
    ['the stored move typed with a check sign it lacks', { typed: 'Bb4+' }, true, stored, 7],
    ['the stored move typed naming the file it leaves', { typed: 'Bfb4' }, true, stored, 7],
    ['the stored move typed naming another file', { typed: 'Bgb4' }, false, stored, 7],
    ['another piece typed to the same square', { typed: 'Nb4' }, false, stored, 7],
    ['the same piece typed to another square', { typed: 'Bc5' }, false, stored, 7],
    ['the stored move dragged', { hop: { from: 61, to: 25 } }, true, stored, 7],
    ['the stored piece dragged to another square', { hop: { from: 61, to: 34 } }, false, stored, 7],
    ['the promotion to a queen typed', { typed: 'c8=Q' }, true, submitted, 48],
    ['the promotion to a queen typed without its piece', { typed: 'c8' }, true, submitted, 48],
    ['an underpromotion typed at a promotion to a queen', { typed: 'c8=N' }, false, submitted, 48],
    ['the pawn dragged at a promotion to a queen', { hop: { from: 50, to: 58 } }, true, submitted, 48],
    ['the underpromotion typed', { typed: 'c8=N' }, true, underpromoted, 0],
    ['the underpromotion typed without its piece', { typed: 'c8' }, false, underpromoted, 0],
    ['the pawn dragged at an underpromotion', { hop: { from: 50, to: 58 } }, false, underpromoted, 0],
    ['the capture typed naming its rook’s file', { typed: 'Raxc8' }, true, submitted, 49],
    ['the capture typed naming no square its rook leaves', { typed: 'Rxc8' }, false, submitted, 49],
    ['the capture typed naming the other rook’s file', { typed: 'Rfxc8' }, false, submitted, 49],
    ['short castling typed', { typed: 'O-O' }, true, castled, 0],
    ['short castling typed with zeros', { typed: '0-0' }, true, castled, 0],
    ['long castling typed at short castling', { typed: 'O-O-O' }, false, castled, 0],
    ['the king typed to its castled square', { typed: 'Kg1' }, false, castled, 0],
    ['the king dragged to its castled square', { hop: { from: 4, to: 6 } }, true, castled, 0]
  ])('judges %s', (_, offer, matched, game, ply) => {
    expect(guesses.judge(offer, game, ply)).toBe(matched)
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
