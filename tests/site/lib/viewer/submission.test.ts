import { describe, expect, it, vi } from 'vitest'
import { shallowRef }               from 'vue'

import { EXAMPLES }                       from '../../../../docs/.vitepress/lib/viewer/examples.ts'
import { Matcher, type Submission }       from '../../../../docs/.vitepress/lib/viewer/matcher.ts'
import { useViewer }                      from '../../../../docs/.vitepress/lib/viewer/state.ts'
import { type Submitting, useSubmission } from '../../../../docs/.vitepress/lib/viewer/submission.ts'
import { fileOf }                         from '../../common/files.ts'
import { answered, oneApart }             from '../../common/matches.ts'

/**
 * Builds a file whose text settles as `reading` does.
 */
function slowFile(name: string, reading: Promise<string>): File {
  const file = fileOf('', name)
  vi.spyOn(file, 'text').mockReturnValue(reading)
  return file
}

/**
 * Builds the submission of a Viewer whose matcher answers every game with
 * `answer`, beside the line naming its problem and the Viewer itself.
 */
function submitting(answer: Submission) {
  const matcher = new Matcher()
  const problem = shallowRef('')
  const viewer  = useViewer()
  vi.spyOn(matcher, 'submit').mockResolvedValue(answer)
  return { matcher, problem, submission: useSubmission(problem, viewer, matcher), viewer }
}

describe('useSubmission', () => {
  it('loads the first match a game makes, holding each tied game in the order they rank', async () => {
    const tied                            = [EXAMPLES.match, oneApart()]
    const { problem, submission, viewer } = submitting({ matches: answered(...tied) })
    await submission.submit('1. Nf3 *', 'the pasted game')
    expect([viewer.loaded.value.match, viewer.source.value]).toEqual([EXAMPLES.match, 'the pasted game'])
    expect(submission.ties()).toEqual(tied.map(({ stored }) => ({ headers: stored!.headers })))
    expect([submission.at.value, problem.value]).toEqual([0, ''])
  })

  it('holds no tied game where the game shares no position with a stored game', async () => {
    const lone           = { span: null, stored: null, submitted: EXAMPLES.match.submitted, ties: 0 }
    const { submission } = submitting({ matches: answered(lone) })
    await submission.submit('1. h4 *', 'the pasted game')
    expect(submission.ties()).toEqual([])
  })

  it('shows another of the tied games, keeping where the game came from', async () => {
    const tied                   = [EXAMPLES.match, oneApart()]
    const { submission, viewer } = submitting({ matches: answered(...tied) })
    await submission.submit('1. Nf3 *', 'the pasted game')
    submission.show(1)
    expect([viewer.loaded.value.match, viewer.source.value]).toEqual([tied[1], 'the pasted game'])
    expect(submission.at.value).toBe(1)
  })

  it('names the problem a game carries and leaves the loaded match where it was', async () => {
    const { problem, submission, viewer } = submitting({ problem: 'Found no game in the pasted game' })
    const before                          = viewer.loaded.value.match
    const submitted                       = submission.submit('', 'the pasted game')
    expect(problem.value).toBe('Matching the game against the store …')
    await submitted
    expect(problem.value).toBe('Found no game in the pasted game')
    expect(viewer.loaded.value.match).toBe(before)
  })

  it('drops the tied games and the problem once a match loads from anywhere else', async () => {
    const { problem, submission, viewer } = submitting({ matches: answered(EXAMPLES.match, oneApart()) })
    await submission.submit('1. Nf3 *', 'the pasted game')
    problem.value = 'Found no game in the pasted game'
    submission.load(EXAMPLES.alone, 'demo.pgn')
    expect([submission.ties(), problem.value, viewer.source.value]).toEqual([[], '', 'demo.pgn'])
  })
})

describe('useSubmission answering out of order', () => {
  it.each<[string, string, (later: Submitting) => unknown]>([
    ['a later game', 'the second game', later => later.submit('1. e4 *', 'the second game')],
    ['a match loaded from elsewhere', 'demo.pgn', later => {
      later.load(EXAMPLES.alone, 'demo.pgn')
    }]
  ])('drops the answer to a game once %s arrives before it', async (_, source, after) => {
    const matcher = new Matcher()
    const problem = shallowRef('')
    const viewer  = useViewer()
    const pending = Promise.withResolvers<Submission>()
    vi.spyOn(matcher, 'submit')
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({ matches: answered(EXAMPLES.alone) })
    const submission = useSubmission(problem, viewer, matcher)
    const earlier    = submission.submit('1. Nf3 *', 'the first game')
    await after(submission)
    pending.resolve({ problem: 'Found no game in the first game' })
    await earlier
    expect([viewer.loaded.value.match, viewer.source.value, problem.value]).toEqual([EXAMPLES.alone, source, ''])
  })
})

describe('useSubmission taking a file', () => {
  it('loads the match a file holds, naming the file it came from', async () => {
    const { problem, submission, viewer } = submitting({ problem: '' })
    problem.value                         = 'Found no game in the pasted game'
    await submission.take(fileOf(JSON.stringify(EXAMPLES.alone), 'mine.json'))
    expect([viewer.loaded.value.match, viewer.source.value, problem.value])
      .toEqual([EXAMPLES.alone, 'mine.json', ''])
  })

  it('submits the game a PGN file holds, naming the file it came from', async () => {
    const { submission, viewer } = submitting({ matches: answered(EXAMPLES.match) })
    await submission.take(fileOf('1. c4 *', 'Mine.PGN'))
    expect([viewer.loaded.value.match, viewer.source.value]).toEqual([EXAMPLES.match, 'Mine.PGN'])
  })

  it.each([
    ['what a match file lacks', 'game.json', () => Promise.resolve('{"submitted": 1}'),
     'game.json: `submitted` holds a number rather than an object'],
    ['why a file cannot be read', 'gone.pgn', () => Promise.reject(new Error('A permission changed')),
     'Cannot read gone.pgn: A permission changed']
  ])('names %s', async (_, name, reading, named) => {
    const { problem, submission } = submitting({ problem: '' })
    await submission.take(slowFile(name, reading()))
    expect(problem.value).toBe(named)
  })

  it.each([
    ['an empty PGN file', new File([], 'empty.pgn'), ''],
    ['a PGN file in Latin-1', new File([Uint8Array.of(0x52, 0xE9, 0x74, 0x69)], 'reti.pgn'), 'R\uFFFDti']
  ])('submits the text of %s as UTF-8 decodes it', async (_, file, text) => {
    const { matcher, submission } = submitting({ problem: 'Found no game in empty.pgn' })
    await submission.take(file)
    expect(matcher.submit).toHaveBeenCalledWith(file.name, text)
  })
})

describe('useSubmission reading out of order', () => {
  it.each<[string, (reading: PromiseWithResolvers<string>) => void]>([
    ['is read', reading => {
      reading.resolve(JSON.stringify(EXAMPLES.match))
    }],
    ['turns out unreadable', reading => {
      reading.reject(new Error('A permission changed'))
    }]
  ])('keeps the file taken last where the earlier one %s after it', async (_, settle) => {
    const { problem, submission, viewer } = submitting({ problem: '' })
    const reading                         = Promise.withResolvers<string>()
    const earlier                         = submission.take(slowFile('earlier.json', reading.promise))
    await submission.take(fileOf(JSON.stringify(EXAMPLES.alone), 'later.json'))
    settle(reading)
    await earlier
    expect([viewer.loaded.value.match, viewer.source.value, problem.value])
      .toEqual([EXAMPLES.alone, 'later.json', ''])
  })

  it('drops the answer to a game arriving while a file taken after it is read', async () => {
    const { submission, viewer } = submitting({ matches: answered(EXAMPLES.match) })
    const before                 = viewer.source.value
    const reading                = Promise.withResolvers<string>()
    const earlier                = submission.submit('1. Nf3 *', 'the first game')
    const taken                  = submission.take(slowFile('later.json', reading.promise))
    await earlier
    expect(viewer.source.value).toBe(before)
    reading.resolve(JSON.stringify(EXAMPLES.alone))
    await taken
    expect(viewer.source.value).toBe('later.json')
  })
})
