import { type Ref, shallowRef } from 'vue'

import type { Matches } from '../games/store.ts'
import { Matcher }      from './matcher.ts'
import type { Tied }    from './ranks.ts'
import type { Viewer }  from './state.ts'

/**
 * A game submitted to the Viewer: the stored games tied on the run it shares,
 * the place of the one shown among them, and the calls that load a match,
 * submit a game, and show another of the tied games.
 */
export interface Submitting {
  at     : Readonly<Ref<number>>
  load   : Viewer['load']
  show   : (at: number) => void
  submit : (text: string, source: string) => Promise<void>
  ties   : () => readonly Tied[]
}

/**
 * Sends each game the Viewer submits in PGN to `matcher` and loads its first
 * match, holding every stored game tied with it in the order the match ranks
 * them, while `problem` says that the game is being matched until it names the
 * problem the game carries or empties. Showing another of the tied games reads
 * its moves only then, loading a match from anywhere else empties `problem`
 * and drops the tied games, and an answer arriving after a later submission or
 * load is dropped.
 *
 * Args:
 *   problem : The line naming the problem under the intake.
 *   viewer  : The Viewer the matches load into.
 *   matcher : What a game is matched through.
 */
export function useSubmission(
  problem : Ref<string>,
  viewer  : Viewer,
  matcher : Matcher = new Matcher()
): Submitting {
  const tied = shallowRef<Matches>()
  const at   = shallowRef(0)
  let latest = 0
  const load = (...args: Parameters<Viewer['load']>): void => {
    latest       += 1
    problem.value = ''
    tied.value    = undefined
    viewer.load(...args)
  }
  return {
    at   : at,
    load : load,
    ties : () => tied.value?.ties ?? [],

    show: (place: number) => {
      viewer.load(tied.value!.match(place), viewer.source.value)
      at.value = place
    },

    submit: async (text: string, source: string) => {
      latest          += 1
      const mine       = latest
      problem.value    = 'Matching the game against the store …'
      const submission = await matcher.submit(source, text)
      if (mine !== latest) return
      if (!submission.matches) {
        problem.value = submission.problem
        return
      }
      load(submission.matches.match(0), source)
      tied.value = submission.matches
      at.value   = 0
    }
  }
}
