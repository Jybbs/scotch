// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { effectScope }              from 'vue'

import * as studying                 from '../../../lib/front/studying.ts'
import { pauseMotion, reduceMotion } from '../../common/motion.ts'

describe('studying', () => {
  it('reads each run of Studying a Match under the heading its section opens on', () => {
    expect(studying.RUNS.map(({ short }) => short)).toEqual([
      'match game --plies 4', 'match game --top 3', 'match games', 'show game', 'show position', 'show store'
    ])
    expect(studying.RUNS.map(({ answer, lines }) => lines[answer])).not.toContain(undefined)
    expect(studying.RUNS.map(({ answer }) => answer)).toEqual([3, 5, 0, 11, 0, 1])
    expect(studying.RUNS[4]!.columns).toBe(true)
  })

  it('types a run then prints each of its lines in turn', () => {
    const run    = studying.RUNS[5]!
    const frames = studying.framesOf(run)
    expect(frames[0]).toEqual({ done: false, shown: 0, typed: 0 })
    expect(frames.at(-1)).toEqual({ done: true, shown: run.lines.length, typed: run.command.length })
  })

  it('restarts the typing on a pick and plays it through to its last frame', () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const term  = scope.run(() => studying.useConsole(10))!
    expect(term.frame.value.done).toBe(true)
    term.pick(2)
    expect([term.picked.value, term.frame.value]).toEqual([2, { done: false, shown: 0, typed: 0 }])
    vi.advanceTimersByTime(60_000)
    expect(term.frame.value.shown).toBe(studying.RUNS[2]!.lines.length)
    scope.stop()
    vi.useRealTimers()
  })

  it('prints a picked run whole at once while the site’s drawings hold still', () => {
    reduceMotion()
    const scope = effectScope()
    const term  = scope.run(() => studying.useConsole())!
    term.pick(3)
    expect(term.frame.value.shown).toBe(studying.RUNS[3]!.lines.length)
    scope.stop()
  })
})

describe('useConsole under a pause', () => {
  it('prints the run whole once the reader pauses the drawings mid-play', async () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const term  = scope.run(() => studying.useConsole(10))!
    term.pick(1)
    expect(term.frame.value.done).toBe(false)
    await pauseMotion()
    expect(term.frame.value.shown).toBe(studying.RUNS[1]!.lines.length)
    scope.stop()
    vi.useRealTimers()
  })
})

describe('wordsOf', () => {
  it.each([
    {
      text  : 'scotch show game demo.pgn:3',
      words : [['scotch', 'program'], ['show', 'sub'], ['game', 'sub'], ['demo.pgn:3', 'arg']]
    },
    {
      text  : 'scotch match game a.pgn --top 3',
      words : [
        ['scotch', 'program'], ['match', 'sub'], ['game', 'sub'], ['a.pgn', 'arg'], ['--top', 'flag'],
        ['3', 'flag']
      ]
    },
    { text: 'show 4', words: [['show', 'sub'], ['4', 'arg']] }
  ])('marks each word of $text with its kind', ({ text, words }) => {
    expect(studying.wordsOf(text).filter(([, kind]) => kind !== null)).toEqual(words)
  })
})
