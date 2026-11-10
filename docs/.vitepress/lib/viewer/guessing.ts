import { type ComputedRef, type Ref, computed, shallowRef, watch } from 'vue'

import * as games                                    from './games.ts'
import { type Guess, type Offer, type Verdict, judge } from './guesses.ts'
import type { Loaded }                                 from './loaded.ts'
import { writtenOf }                                   from './offering.ts'
import { standingOf }                                  from './placements.ts'

/**
 * The Viewer's covered mode: whether the stored game is covered past the
 * cursor, the stored ply a player offers a move from at the cursor where none
 * was taken there yet, what was offered at each covered ply a step on showed,
 * and the verdict on the move the last step showed, beside the calls that cover
 * the stored game and take an offered move.
 */
export interface Guessing {
  cover   : (on: boolean) => void
  covered : Readonly<Ref<boolean>>
  guess   : ComputedRef<number | undefined>
  guesses : Readonly<Ref<ReadonlyMap<number, Guess>>>
  take    : (offer: Offer) => boolean
  verdict : ComputedRef<Verdict | undefined>
}

/**
 * Reads the stored game's ply a player offers a move from at a cursor, where
 * the stored game holds a position there and plays a move from it.
 */
export function guessAt(cursor: number, loaded: Loaded): number | undefined {
  const stored = loaded.match.stored
  const ply    = loaded.plyOf('stored', cursor)
  return stored && loaded.has('stored', cursor) && ply < stored.moves.length ? ply : undefined
}

/**
 * Fixes what was offered at each stored ply a step from cursor `from` to cursor
 * `to` shows, keeping each ply fixed before and marking each one shown with no
 * offer as offered nothing.
 */
export function passed(
  from    : number,
  guesses : ReadonlyMap<number, Guess>,
  loaded  : Loaded,
  to      : number
): ReadonlyMap<number, Guess> {
  const plies = Array.from({ length: Math.max(0, to - from) }, (_, at) => guessAt(from + at, loaded))
  return new Map([...plies.flatMap(ply => ply === undefined ? [] : [[ply, {}] as const]), ...guesses])
}

/**
 * Holds the covered mode over the Viewer's cursor and loaded match, opening
 * uncovered. Each step on while the stored game is covered fixes what was
 * offered at each ply it passes, covering or showing the stored game clears
 * what was offered, and a match with no stored game stays uncovered.
 */
export function useGuessing(cursor: Readonly<Ref<number>>, loaded: Readonly<Ref<Loaded>>): Guessing {
  const covered = shallowRef(false)
  const guesses = shallowRef<ReadonlyMap<number, Guess>>(new Map())
  const guess   = computed(() => {
    const ply = covered.value ? guessAt(cursor.value, loaded.value) : undefined
    return ply === undefined || guesses.value.has(ply) ? undefined : ply
  })
  const verdict = computed(() =>
    covered.value ? verdictAt(cursor.value, guesses.value, loaded.value) : undefined)

  watch(cursor, (to, from) => {
    if (covered.value && to > from) guesses.value = passed(from, guesses.value, loaded.value, to)
  }, { flush: 'sync' })

  return {
    covered : covered,
    guess   : guess,
    guesses : guesses,
    verdict : verdict,

    cover: on => {
      covered.value = on && !!loaded.value.match.stored
      guesses.value = new Map()
    },

    take: offer => {
      const [ply, side] = [guess.value, loaded.value.match.stored!]
      const matched     = ply === undefined ? undefined : judge(offer, side, ply)
      if (ply === undefined || matched === undefined) return false
      const offered = offer.hop ? writtenOf(offer.hop, standingOf(side.placements[ply]!)) : offer.typed
      guesses.value = new Map([[ply, { matched, offered }], ...guesses.value])
      return true
    }
  }
}

/**
 * Writes what the Viewer says of the stored move a step on to a cursor just
 * showed, where the player offered a move at it.
 */
export function verdictAt(
  cursor  : number,
  guesses : ReadonlyMap<number, Guess>,
  loaded  : Loaded
): Verdict | undefined {
  const ply   = guessAt(cursor - 1, loaded)
  const guess = ply === undefined ? undefined : guesses.get(ply)
  if (ply === undefined || guess?.offered === undefined) return undefined
  const played = games.numbered(loaded.match.stored!, ply)
  if (guess.matched) {
    return { line: `${played} · matches`, say: `The stored game played ${played}, matching yours.` }
  }
  return {
    line : `${played} · you offered ${guess.offered}`,
    say  : `The stored game played ${played}, and you offered ${guess.offered}.`
  }
}
