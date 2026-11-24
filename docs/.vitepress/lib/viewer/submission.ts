import { type Ref, shallowRef } from 'vue'

import type { Matches }            from '../games/store.ts'
import { type Reading, readMatch } from './link.ts'
import { Matcher, unreadable }     from './matcher.ts'
import type { Tied }               from './ranks.ts'
import type { Viewer }             from './state.ts'

/**
 * A game submitted to the Viewer: the stored games tied on the run it shares,
 * the place of the one shown among them, and the calls that load a match,
 * submit a game, take a file, and show another of the tied games.
 */
export interface Submitting {
  at     : Readonly<Ref<number>>
  load   : Viewer['load']
  show   : (at: number) => void
  submit : (text: string, source: string) => Promise<void>
  take   : (file: File) => Promise<void>
  ties   : () => readonly Tied[]
}

/**
 * Makes the call claiming the next load, submission, or file read, which
 * returns a call telling whether no later claim has been made since.
 */
function claims(): () => () => boolean {
  let latest = 0
  return () => {
    const mine = ++latest
    return () => mine === latest
  }
}

/**
 * Reads what a file gives: its text where its name ends on `.pgn`, or else the
 * match it holds, or the line naming what it lacks or why it cannot be read.
 */
async function readingOf(file: File): Promise<Reading | { game: string }> {
  let text: string
  try {
    text = await file.text()
  } catch (error) {
    return unreadable(file.name, error)
  }
  return file.name.toLowerCase().endsWith('.pgn') ? { game: text } : readMatch(text, file.name)
}

/**
 * Sends each game the Viewer submits in PGN to `matcher` and loads its first
 * match, holding every stored game tied with it in the order the match ranks
 * them, while `problem` says that the game is being matched until it names the
 * problem the game carries or empties. Taking a file loads the match it holds,
 * or submits its game where its name ends on `.pgn`, or names in `problem` what
 * it lacks or why it cannot be read. Showing another of the tied games reads
 * its moves only then, loading a match from anywhere else empties `problem`
 * and drops the tied games, and a file read or an answer arriving after a later
 * file, submission, or load is dropped.
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
  const tied  = shallowRef<Matches>()
  const at    = shallowRef(0)
  const claim = claims()
  const load  = (...args: Parameters<Viewer['load']>): void => {
    claim()
    problem.value = ''
    tied.value    = undefined
    viewer.load(...args)
  }
  const submit = async (text: string, source: string): Promise<void> => {
    const current    = claim()
    problem.value    = 'Matching the game against the store …'
    const submission = await matcher.submit(source, text)
    if (!current()) return
    if (!submission.matches) {
      problem.value = submission.problem
      return
    }
    load(submission.matches.match(0), source)
    tied.value = submission.matches
    at.value   = 0
  }
  return {
    at     : at,
    load   : load,
    submit : submit,
    ties   : () => tied.value?.ties ?? [],

    show: (place: number) => {
      viewer.load(tied.value!.match(place), viewer.source.value)
      at.value = place
    },

    take: async (file: File) => {
      const current = claim()
      const reading = await readingOf(file)
      if (!current()) return
      if ('game' in reading) await submit(reading.game, file.name)
      else if (reading.match) load(reading.match, file.name)
      else problem.value = reading.problem
    }
  }
}
