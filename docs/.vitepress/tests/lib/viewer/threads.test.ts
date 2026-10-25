import { describe, expect, it } from 'vitest'

import { EXAMPLES }        from '../../../lib/viewer/examples.ts'
import { Loaded, PARTIES } from '../../../lib/viewer/loaded.ts'
import { Threads }         from '../../../lib/viewer/threads.ts'

const GUTTER         = { first: 0, left: 100, row: 20, top: 0, width: 40 }
const loaded         = new Loaded(EXAMPLES.match)
const { last, meet } = loaded.shared!

describe('Threads', () => {
  const threads = new Threads(GUTTER, loaded)

  it('sets each game’s ring in its own lane while the two differ, the submitted game’s at the left', () => {
    expect(PARTIES.map(party => threads.ringAt(party, 0).x)).toEqual([108.8, 131.2])
  })

  it.each([meet, last])('sets both rings at the gutter’s middle at cursor %i, inside the run', cursor => {
    expect(PARTIES.map(party => threads.ringAt(party, cursor).x)).toEqual([120, 120])
  })

  it('sets White’s ply and Black’s at their shares of the row holding them', () => {
    expect([1, 2, 3].map(cursor => threads.ringAt('submitted', cursor).y))
      .toEqual([expect.closeTo(5.6), expect.closeTo(14.4), expect.closeTo(25.6)])
  })

  it('keeps the ring of the starting position inside the picture', () => {
    expect(threads.ringAt('submitted', 0).y).toBe(3)
  })

  it('lays the run’s band down the gutter’s middle from the first position the two share to the last', () => {
    const top = threads.ringAt('submitted', meet).y
    expect(threads.band).toEqual({
      height : expect.closeTo(threads.ringAt('submitted', last).y - top + 7),
      rx     : 3.5,
      width  : 7,
      x      : 116.5,
      y      : expect.closeTo(top - 3.5)
    })
  })

  it('writes each game’s thread through every ply it holds, curving between its lane and the middle', () => {
    const path = threads.pathOf('stored')
    expect(path.startsWith(`M${threads.ringAt('stored', 0).x} `)).toBe(true)
    expect(path.match(/[LC]/gu)).toHaveLength(EXAMPLES.match.stored!.moves.length)
    expect(path.match(/C/gu)).toHaveLength(2)
  })

  it('writes no band and an empty thread for a stored game the match leaves out', () => {
    const alone = new Threads(GUTTER, new Loaded(EXAMPLES.alone))
    expect([alone.band, alone.pathOf('stored')]).toEqual([undefined, ''])
  })
})
