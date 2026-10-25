import { describe, expect, it } from 'vitest'

import { EXAMPLES }                               from '../../../lib/viewer/examples.ts'
import * as games                                 from '../../../lib/viewer/games.ts'
import { Loaded, PARTIES }                        from '../../../lib/viewer/loaded.ts'
import { lastMove }                               from '../../../lib/viewer/placements.ts'
import { endedAt, last, meet, oneApart, shifted } from '../../common/matches.ts'

const { span, stored, submitted } = EXAMPLES.match

describe('Loaded', () => {
  const loaded = new Loaded(EXAMPLES.match)
  const alone  = new Loaded(EXAMPLES.alone)

  it('reads the run the two share in the submitted game’s plies', () => {
    expect(loaded.shared).toEqual({ last, length: span!.length, meet, part: last + 1 })
  })

  it('reads the cursor’s range from the earlier start to the later end of the two games', () => {
    expect([loaded.first, loaded.last]).toEqual([0, Math.max(submitted.moves.length, stored!.moves.length)])
    expect([alone.first, alone.last, alone.offset]).toEqual([0, EXAMPLES.alone.submitted.moves.length, 0])
  })

  it.each([
    ['trailing the submitted game', 5, 0],
    ['leading it, the range reaching back before the submitted game starts', -5, -5]
  ])('reads the range with the stored game’s plies %s, boards meeting on one position', (_, by, first) => {
    const match = shifted(by)
    const moved = new Loaded(match)
    const at    = moved.shared!.meet
    expect([moved.offset, moved.first, at]).toEqual([-by, first, meet + Math.min(0, by)])
    expect(match.stored!.placements[moved.plyOf('stored', at)])
      .toBe(match.submitted.placements[moved.plyOf('submitted', at)])
  })

  it('names the two moves where the games part', () => {
    expect([loaded.leaving, loaded.parting])
      .toEqual([games.numbered(submitted, last), games.numbered(stored!, last)])
    expect(loaded.partAt).toBe(last)
  })

  it('reads each game’s move from the last position the two share', () => {
    expect(loaded.partings).toEqual(Object.fromEntries(PARTIES.map(party => {
      const { placements } = EXAMPLES.match[party]!
      return [party, lastMove(placements[last]!, placements[last + 1]!)]
    })))
  })

  it('leaves out the move of a game that ends on the last shared position', () => {
    const ended = new Loaded(endedAt(last))
    expect(Object.keys(ended.partings)).toEqual(['stored'])
    expect(ended.leaving).toBeUndefined()
  })

  it('reads no partings and no run where no stored game shares a position', () => {
    expect([alone.partings, alone.shared, alone.leaving, alone.parting, alone.partAt])
      .toEqual([{}, undefined, undefined, undefined, undefined])
  })
})

describe('Loaded at a cursor', () => {
  const loaded = new Loaded(EXAMPLES.match)
  const alone  = new Loaded(EXAMPLES.alone)

  it.each([
    ['submitted', -1, false],
    ['submitted', 0, true],
    ['submitted', submitted.moves.length, true],
    ['submitted', submitted.moves.length + 1, false],
    ['stored', stored!.moves.length, true],
    ['stored', stored!.moves.length + 1, false]
  ] as const)('reads whether the %s game holds a position at cursor %i', (party, cursor, held) => {
    expect(loaded.has(party, cursor)).toBe(held)
  })

  it('reads no position of a stored game the match leaves out', () => {
    expect([alone.has('stored', 0), alone.plyOf('stored', 4), alone.sideOf('stored')])
      .toEqual([false, 0, null])
  })

  it.each([
    [-3, 0],
    [12, 12],
    [500, stored!.moves.length]
  ])('holds the stored game’s ply at cursor %i to its own plies', (cursor, ply) => {
    expect(loaded.plyOf('stored', cursor)).toBe(ply)
  })

  it.each([
    [meet - 1, false],
    [meet, true],
    [last, true],
    [last + 1, false]
  ])('reads whether the two show one position at cursor %i', (cursor, sharing) => {
    expect(loaded.sharing(cursor)).toBe(sharing)
  })
})

describe('Loaded.status inside the run', () => {
  const loaded = new Loaded(EXAMPLES.match)

  it('counts the cursor’s place in the run while the two show one position', () => {
    expect(loaded.status(meet)).toEqual({
      count : '',
      line  : `Ply ${meet} · same position · 1 of ${span!.length}`,
      say   : `Ply ${meet}, one position, 1 of the ${span!.length} the two share.`,
      short : `Same position · 1 of ${span!.length}`
    })
  })

  it('names the stored game’s next move at the last position the two share', () => {
    const say = `Ply ${last}, one position, ${span!.length} of the ${span!.length} the two share, `
              + `and the stored game played ${loaded.parting} next.`
    expect(loaded.status(last).say).toBe(say)
  })
})

describe('Loaded.status outside the run', () => {
  const loaded = new Loaded(EXAMPLES.match)

  it('names where the two meet before the run', () => {
    expect(loaded.status(0)).toEqual({
      count : '',
      line  : `Ply 0 · they meet at ply ${meet}`,
      say   : 'Ply 0, the start in the submitted game, the start in the stored game. '
            + `They meet at ply ${meet}.`,
      short : `Different · meet at ply ${meet}`
    })
  })

  it('names where the two parted, the stored game’s move there, and how many squares differ', () => {
    const after = last + 1
    expect(loaded.status(after)).toEqual({
      count : '4 squares differ',
      line  : `Ply ${after} · parted at ply ${after} · 4 squares differ`,
      say   : `Ply ${after}, ${games.numbered(submitted, last)} in the submitted game, `
            + `${games.numbered(stored!, last)} in the stored game. They parted at ply ${after}, `
            + `where the stored game played ${loaded.parting}, and 4 squares differ.`,
      short : `Parted at ply ${after}`
    })
  })

  it('names one square that differs in the singular', () => {
    expect(new Loaded(oneApart()).status(2))
      .toMatchObject({ count: '1 square differs', short: 'Parted at ply 2' })
  })

  it('leaves the stored game’s move unnamed where it ends on the last shared position', () => {
    const ended = new Loaded(endedAt(last, 'stored'))
    expect(ended.status(last).say)
      .toBe(`Ply ${last}, one position, ${span!.length} of the ${span!.length} the two share.`)
    expect(ended.status(last + 1).say).toMatch(new RegExp(`They parted at ply ${last + 1}\\.$`, 'u'))
  })

})

describe('Loaded.status with nothing matched', () => {
  it.each([
    [0, 'Ply 0, the starting position. No stored game shares a position with this game.'],
    [1, `Ply 1, ${games.numbered(EXAMPLES.alone.submitted, 0)}. `
      + 'No stored game shares a position with this game.']
  ])('says at ply %i that nothing matched', (cursor, say) => {
    const alone = new Loaded(EXAMPLES.alone)
    expect(alone.status(cursor)).toEqual({
      count : '',
      line  : `Ply ${cursor} of ${EXAMPLES.alone.submitted.moves.length}`,
      say   : say,
      short : 'Nothing matched'
    })
  })
})

describe('Loaded.pairs', () => {
  it('pairs moves played in another order before the meet, leaving out one played at the same ply', () => {
    expect(new Loaded(EXAMPLES.match).pairs)
      .toEqual([{ stored: 5, submitted: 1 }, { stored: 7, submitted: 5 }, { stored: 1, submitted: 7 }])
  })

  it('reads each pair in the submitted game’s plies where the stored game’s plies lead', () => {
    expect(new Loaded(shifted(-5)).pairs).toEqual([{ stored: -4, submitted: 2 }])
  })

  it('pairs nothing where no stored game shares a position', () => {
    expect(new Loaded(EXAMPLES.alone).pairs).toEqual([])
  })
})

describe('Loaded.differing', () => {
  const loaded = new Loaded(EXAMPLES.match)

  it('lists the squares the two boards differ on once the games part', () => {
    expect(loaded.differing(last + 1)).toEqual([10, 19, 34, 42])
  })

  it.each([
    ['inside the run', last],
    ['before the two meet', 0],
    ['past the stored game’s end', EXAMPLES.match.stored!.moves.length + 1]
  ])('lists none %s', (_, cursor) => {
    expect(loaded.differing(cursor)).toEqual([])
  })

  it('lists none where no stored game shares a position', () => {
    expect(new Loaded(EXAMPLES.alone).differing(50)).toEqual([])
  })
})
