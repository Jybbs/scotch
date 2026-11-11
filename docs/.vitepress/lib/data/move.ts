import { createGlobalState, useTransition }                               from '@vueuse/core'
import { type ComputedRef, type Ref, type ShallowRef, computed, shallowRef } from 'vue'

import { useMotion } from '../motion/control.ts'
import * as timing   from '../motion/timing.ts'
import { CHART }     from './lengths.ts'

/**
 * Holds the one move both charts of game lengths read, so a move picked in one
 * is marked in the other, opening on the move the charts open on.
 */
export const useMove = createGlobalState((): ShallowRef<number> => shallowRef(CHART.opening))

/**
 * Eases a chart's marker toward the move it follows along the site's glide,
 * over the glide's duration for a move a key or the other chart sets and the
 * shorter duration a pointer's moves take where `quick` is set, and straight to
 * the move while the site's drawings hold still.
 */
export function useGlide(move: Ref<number>): { quick: ShallowRef<boolean>, shown: ComputedRef<number> } {
  const quick      = shallowRef(false)
  const { moving } = useMotion()

  return {
    quick : quick,
    shown : useTransition(move, {
      disabled : computed(() => !moving.value),
      duration : computed(() => quick.value ? timing.DURATIONS.move : timing.DURATIONS.glide),
      easing   : timing.CURVES.glide
    })
  }
}
