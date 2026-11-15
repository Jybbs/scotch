import { describe, expect, it } from 'vitest'

import * as rails from '../../../lib/overview/rails.ts'

/**
 * The stored game's name as the key labels it.
 */
const STORED = 'Kasparov vs. Sosonko'

const { example } = rails
const shared      = example.shared!

describe('squaresOf', () => {
  const squares = rails.squaresOf(example)
  const lifts   = (cursor: number): number[] =>
    squares.filter(square => square.cursor === cursor).map(square => square.lift)

  it('sets one square on the shared line for each position of the run', () => {
    const both = squares.filter(square => square.game === 'both')
    expect(both.map(square => square.cursor)).toEqual(
      Array.from({ length: shared.length }, (_, at) => shared.meet + at))
    expect(new Set(both.map(square => square.lift))).toEqual(new Set([0]))
  })

  it('lifts the submitted game above the line and the stored game below it, more with distance', () => {
    expect(lifts(shared.part)).toEqual([-4, 4])
    expect(lifts(shared.meet - 1)).toEqual([-4, 4])
    expect(lifts(example.first)).toEqual([-rails.RAILS.lift, rails.RAILS.lift])
  })

  it('draws no square for a game past its last position', () => {
    const stored = squares.filter(square => square.game === 'stored').map(square => square.cursor)
    expect(Math.max(...stored)).toBe(example.sideOf('stored')!.moves.length)
  })

  it('draws as many columns as the rails hold, one step apart', () => {
    expect(Math.max(...squares.map(square => square.cursor))).toBe(rails.lastOf(example))
    expect(squares.find(square => square.cursor === 1)!.x).toBe(rails.RAILS.cell + rails.RAILS.gap)
  })
})

describe('bandOf', () => {
  it('starts each column’s band half a gap before its squares, the parting line on its band', () => {
    const step = rails.RAILS.cell + rails.RAILS.gap
    expect(rails.bandOf(example, example.first + 2)).toBe(2 * step - rails.RAILS.gap / 2)
    expect(rails.cutOf(example)).toBe(rails.bandOf(example, shared.part))
  })
})

describe('cursorAt', () => {
  const shares = [[-0.2, 0], [0, 0], [0.5, 30], [0.999, 59], [1.4, 59]]

  it.each(shares)('reads the share %s across as cursor %s', (share, at) => {
    expect(rails.cursorAt(example, share)).toBe(at)
  })
})

describe('restingKey', () => {
  it('names the run and each game’s move where the two part', () => {
    expect(rails.restingKey(example)).toEqual([
      { game: 'both', label: 'positions shared', move: String(shared.length) },
      { game: 'submitted', label: 'Yours', move: '22. c6' },
      { game: 'stored', label: STORED, move: '22. Bc2' }
    ])
  })
})

describe('keyAt', () => {
  it('sets the start mark at the starting position', () => {
    expect(rails.keyAt(example, example.first)).toEqual([{ game: 'both', label: 'both games', start: true }])
  })

  it('names a shared position by its place in the run and the move both played to reach it', () => {
    expect(rails.keyAt(example, shared.meet + 1)).toEqual([
      { game: 'both', label: `Position 2 of ${shared.length}`, move: '4...Bb4' }
    ])
  })

  it('names each game’s move where the two reach the run’s first position by different moves', () => {
    expect(rails.keyAt(example, shared.meet)).toEqual([
      { game: 'both', label: `Position 1 of ${shared.length}` },
      { game: 'submitted', label: 'Yours', move: '4. d4' },
      { game: 'stored', label: STORED, move: '4. Nc3' }
    ])
  })

  it('names each game’s move and how far the position stands from the run on either side of it', () => {
    expect(rails.keyAt(example, shared.meet - 2).at(-1)).toEqual({ game: 'both', label: '2 before meeting' })
    expect(rails.keyAt(example, shared.part).at(-1)).toEqual({ game: 'both', label: '1 after parting' })
  })

  it('writes ended where a game holds no position at the cursor', () => {
    const cursor = example.sideOf('stored')!.moves.length + 1
    expect(rails.keyAt(example, cursor)[1]).toEqual({ game: 'stored', label: STORED, move: 'ended' })
  })
})

describe('cutReplayOf', () => {
  it('fades the parting line in once the run has passed', () => {
    const replay = rails.cutReplayOf(example, { rise: 2, stagger: 10, step: 5 })
    expect(replay.delay).toBe(shared.length * 5)
    expect(replay.keys).toEqual([{ opacity: 0 }, { opacity: 1 }])
  })
})

describe('replayOf', () => {
  it('rises each shared square in the order the run reaches it', () => {
    const square = { away: 0, cursor: shared.meet + 3, game: 'both' as const, lift: 0, x: 0 }
    const replay = rails.replayOf(example, square, { rise: 2, stagger: 10, step: 5 })
    expect(replay.delay).toBe(15)
    expect(replay.keys[1]).toEqual({ offset: 0.5, transform: 'translateY(-2px)' })
  })

  it('lifts each parted square out from the line once the run has passed, the nearest first', () => {
    const square = { away: 3, cursor: shared.part + 2, game: 'stored' as const, lift: 10, x: 0 }
    const replay = rails.replayOf(example, square, { rise: 2, stagger: 10, step: 5 })
    expect(replay.delay).toBe(shared.length * 5 + 20)
    expect(replay.keys[0]).toEqual({ opacity: 0.35, transform: 'translateY(-10px)' })
  })
})
