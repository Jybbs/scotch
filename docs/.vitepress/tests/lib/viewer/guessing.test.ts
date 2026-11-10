import { describe, expect, it } from 'vitest'
import { shallowRef }           from 'vue'

import { EXAMPLES }                       from '../../../lib/viewer/examples.ts'
import type { Guess }                     from '../../../lib/viewer/guesses.ts'
import * as guessing                      from '../../../lib/viewer/guessing.ts'
import { Loaded }                         from '../../../lib/viewer/loaded.ts'
import { endedAt, loaded, meet, shifted } from '../../common/matches.ts'

/**
 * Holds the covered mode over a cursor the test moves, on the example match
 * unless another loaded match is given.
 */
function covering(at = meet, on = loaded): guessing.Guessing & { go: (to: number) => void } {
  const cursor = shallowRef(at)
  return {
    ...guessing.useGuessing(cursor, shallowRef(on)),
    go: to => {
      cursor.value = to
    }
  }
}

describe('guessAt', () => {
  it.each([
    ['the stored ply at the cursor where the two games run level', loaded, meet, meet],
    ['the stored ply its offset sets where the stored game trails', new Loaded(shifted(3)), 5, 2],
    ['nothing before the stored game starts', new Loaded(shifted(3)), 2, undefined],
    ['nothing at the stored game’s last position', new Loaded(endedAt(20, 'stored')), 20, undefined],
    ['nothing past the stored game’s end', new Loaded(endedAt(20, 'stored')), 30, undefined],
    ['nothing where no game is stored', new Loaded(EXAMPLES.alone), 4, undefined]
  ])('reads %s', (_, on, cursor, ply) => {
    expect(guessing.guessAt(cursor, on)).toBe(ply)
  })
})

describe('passed', () => {
  const offered = new Map<number, Guess>([[meet, { matched: true, offered: 'Bb4' }]])

  it.each([
    ['marks each ply a step passes as offered nothing', new Map(), meet + 2, [[meet, {}], [meet + 1, {}]]],
    [
      'keeps what was offered at a ply it passes',
      offered,
      meet + 2,
      [[meet, offered.get(meet)], [meet + 1, {}]]
    ],
    ['passes nothing on a step back', offered, meet - 3, [[meet, offered.get(meet)]]]
  ] as const)('%s', (_, guesses, to, after) => {
    expect([...guessing.passed(meet, guesses, loaded, to)].toSorted(([a], [b]) => a - b)).toEqual(after)
  })

  it('passes nothing at a position the stored game plays no move from', () => {
    expect(guessing.passed(19, new Map(), new Loaded(endedAt(20, 'stored')), 22).keys().toArray())
      .toEqual([19])
  })
})

describe('useGuessing taking a move', () => {
  it('opens uncovered, taking no move and fixing nothing as the cursor steps on', () => {
    const viewer = covering()
    viewer.go(meet + 2)
    expect([viewer.covered.value, viewer.guess.value, viewer.verdict.value])
      .toEqual([false, undefined, undefined])
    expect([viewer.take({ typed: 'Bb4' }), viewer.guesses.value.size]).toEqual([false, 0])
  })

  it('takes a move at the cursor once covered, then no second one there', () => {
    const viewer = covering()
    viewer.cover(true)
    const [before, first] = [viewer.guess.value, viewer.take({ typed: 'Bb4' })]
    expect([before, first, viewer.guess.value, viewer.take({ typed: 'Bc5' })])
      .toEqual([meet, true, undefined, false])
    expect(viewer.guesses.value.get(meet)).toEqual({ matched: true, offered: 'Bb4' })
  })

  it('writes a move made on the board from the piece it moves', () => {
    const viewer = covering()
    viewer.cover(true)
    viewer.take({ hop: { from: 61, to: 25 } })
    expect(viewer.guesses.value.get(meet)).toEqual({ matched: true, offered: 'Bf8-b4' })
  })

  it.each([
    ['text that is no move in SAN', 'hello', meet],
    ['a move at the stored game’s last position', 'Bb4', EXAMPLES.match.stored!.moves.length]
  ])('refuses %s', (_, typed, cursor) => {
    const viewer = covering(cursor)
    viewer.cover(true)
    expect([viewer.take({ typed }), viewer.guesses.value.size]).toEqual([false, 0])
  })
})

describe('useGuessing saying what a step showed', () => {
  it.each([
    [
      'matching',
      'Bb4',
      { line: '4...Bb4 · matches', say: 'The stored game played 4...Bb4, matching yours.' }
    ],
    [
      'differing',
      'Bc5',
      {
        line : '4...Bb4 · you offered Bc5',
        say  : 'The stored game played 4...Bb4, and you offered Bc5.'
      }
    ]
  ])('says what a step on showed of a %s offer', (_, typed, verdict) => {
    const viewer = covering()
    viewer.cover(true)
    viewer.take({ typed })
    viewer.go(meet + 1)
    expect(viewer.verdict.value).toEqual(verdict)
  })

  it('says nothing of a move stepped past with no offer, and counts it as offered nothing', () => {
    const viewer = covering()
    viewer.cover(true)
    viewer.go(meet + 2)
    expect([viewer.verdict.value, viewer.guesses.value.get(meet + 1)]).toEqual([undefined, {}])
  })

  it('stays uncovered on a match with no stored game', () => {
    const viewer = covering(4, new Loaded(EXAMPLES.alone))
    viewer.cover(true)
    expect(viewer.covered.value).toBe(false)
  })

  it('clears what was offered as the stored game is shown or covered again', () => {
    const viewer = covering()
    viewer.cover(true)
    viewer.take({ typed: 'Bb4' })
    viewer.cover(false)
    expect([viewer.guesses.value.size, viewer.guess.value]).toEqual([0, undefined])
  })
})

describe('verdictAt', () => {
  it('says nothing at the position the stored game starts from', () => {
    expect(guessing.verdictAt(0, new Map([[0, { matched: true, offered: 'd4' }]]), loaded)).toBeUndefined()
  })
})
