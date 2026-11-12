import { describe, expect, it, vi }       from 'vitest'
import { shallowRef }                     from 'vue'

import { EXAMPLES }                       from '../../../lib/viewer/examples.ts'
import { Matcher, type Submission }       from '../../../lib/viewer/matcher.ts'
import { useViewer }                      from '../../../lib/viewer/state.ts'
import { type Submitting, useSubmission } from '../../../lib/viewer/submission.ts'
import { answered, oneApart }             from '../../common/matches.ts'

/**
 * Builds the submission of a Viewer whose matcher answers every game with
 * `answer`, beside the line naming its problem and the Viewer itself.
 */
function submitting(answer: Submission) {
  const matcher = new Matcher()
  const problem = shallowRef('')
  const viewer  = useViewer()
  vi.spyOn(matcher, 'submit').mockResolvedValue(answer)
  return { problem, submission: useSubmission(problem, viewer, matcher), viewer }
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
