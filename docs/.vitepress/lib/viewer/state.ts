import { clamp } from '@vueuse/core'
import { type ComputedRef, type Ref, computed, shallowRef } from 'vue'

import { EXAMPLES, type Match, SAMPLES, type Sample } from './examples.ts'
import { Loaded, type Status }                        from './loaded.ts'
import type { Facing }                                from './trail.ts'

/**
 * The Viewer's state: the loaded match, where it came from and the example it
 * is where it is one, one cursor in the submitted game's plies, what the Viewer
 * says there, and whether the reader hovers or focuses the count of the squares
 * the boards differ on, beside the calls that load a match, move the cursor,
 * turn the boards, and show those squares.
 */
export interface Viewer {
  cursor  : Readonly<Ref<number>>
  facing  : Readonly<Ref<Facing>>
  go      : (to: number | undefined) => void
  load    : (match: Match, source: string, sample?: Sample, ply?: number) => void
  loaded  : Readonly<Ref<Loaded>>
  sample  : Readonly<Ref<Sample | undefined>>
  show    : (on: boolean) => void
  showing : Readonly<Ref<boolean>>
  source  : Readonly<Ref<string>>
  status  : ComputedRef<Status>
  turn    : (facing: Facing) => void
}

/**
 * Holds the Viewer's state, opening on the example match at the first position
 * the two games share from White's side. Loading a match moves the cursor to
 * the ply a link names or else to the first position it shares, or to the start
 * where it shares none, and moving the cursor holds it to the loaded match's
 * plies, each board's ply deriving from it through the run's offset.
 */
export function useViewer(): Viewer {
  const opening = SAMPLES[0]
  const loaded  = shallowRef(new Loaded(EXAMPLES[opening.name]))
  const cursor  = shallowRef(loaded.value.shared?.meet ?? 0)
  const facing  = shallowRef<Facing>('white')
  const sample  = shallowRef<Sample | undefined>(opening.name)
  const showing = shallowRef(false)
  const source  = shallowRef<string>(opening.source)
  const go      = (to: number | undefined): void => {
    if (to === undefined) return
    cursor.value = clamp(Math.round(to), loaded.value.first, loaded.value.last)
  }

  return {
    cursor  : cursor,
    facing  : facing,
    go      : go,
    loaded  : loaded,
    sample  : sample,
    showing : showing,
    source  : source,
    status  : computed(() => loaded.value.status(cursor.value)),

    load: (match, from, name, ply) => {
      loaded.value = new Loaded(match)
      cursor.value = loaded.value.shared?.meet ?? 0
      sample.value = name
      source.value = from
      go(ply)
    },

    show: on => {
      showing.value = on
    },

    turn: to => {
      facing.value = to
    }
  }
}
