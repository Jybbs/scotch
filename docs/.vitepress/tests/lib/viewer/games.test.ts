import { describe, expect, it } from 'vitest'

import type { Side } from '../../../lib/viewer/examples.ts'
import * as games    from '../../../lib/viewer/games.ts'

/**
 * Builds a game of three moves under the tags given.
 */
function tagged(headers: Side['headers']): Side {
  return { headers, moves: ['e4', 'e5', 'Nf3'], placements: [] }
}

describe('nameOf', () => {
  it.each([
    [{ Black: 'Sosonko, Gennadi', White: 'Kasparov, Gary' }, 'Kasparov vs. Sosonko'],
    [{ Black: '?', White: 'Kasparov, Gary' }, 'Kasparov vs. ?'],
    [{ Event: 'Tilburg' }, 'Tilburg'],
    [{ Event: '?' }, 'A game with no names'],
    [{}, 'A game with no names']
  ])('names a game tagged %j as %j', (headers, name) => {
    expect(games.nameOf(tagged(headers))).toBe(name)
  })
})

describe('numbered', () => {
  it.each([
    [{}, 0, '1. e4'],
    [{}, 1, '1...e5'],
    [{}, 2, '2. Nf3'],
    [{ FEN: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' }, 0, '1...e4'],
    [{ FEN: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' }, 1, '2. e5'],
    [{ FEN: '8/8/8/8/8/8/8/K6k w - - 0 40' }, 1, '40...e5']
  ])('numbers the move of a game tagged %j at index %i as %j', (headers, index, text) => {
    expect(games.numbered(tagged(headers), index)).toBe(text)
  })
})

describe('whereOf', () => {
  it.each([
    [{ Date: '1981.??.??', Event: 'Tilburg' }, 'Tilburg 1981'],
    [{ Date: '????.??.??', Event: 'Tilburg' }, 'Tilburg'],
    [{ Date: '1981.05.02', Event: '?' }, '1981'],
    [{}, '']
  ])('names where and when a game tagged %j was played as %j', (headers, where) => {
    expect(games.whereOf(tagged(headers))).toBe(where)
  })
})
