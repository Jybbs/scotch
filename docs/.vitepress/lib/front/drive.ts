import { useElementVisibility, useIntervalFn, useMounted } from '@vueuse/core'
import { type Ref, shallowRef, watch, watchEffect }        from 'vue'

import { useMotion } from '../motion/control.ts'

/**
 * The step a front page widget shows and the ways to move it: a step the
 * reader picks, and whether a pointer or focus holds the widget where it
 * stands.
 */
export interface Drive {
  at   : Ref<number>
  go   : (step: number) => void
  hold : (held: boolean) => void
}

/**
 * How a widget plays its steps: the steps it holds, the milliseconds between
 * two of them, the beats it rests on its last step before it starts over, the
 * step it starts over from, and the step it stands on while the site's
 * drawings hold still.
 */
export interface DriveTuning {
  count    : number
  interval : number
  rest     : number
  settle   : number
  start    : number
}

/**
 * Plays a widget's steps on a clock while its panel is on the screen and the
 * site's drawings move, holding while a pointer rests on the panel or focus
 * sits inside it, and resting on the last step for `rest` beats before it
 * starts over. While the drawings hold still, the widget stands on its
 * `settle` step until the reader picks another, moving there once the widget
 * mounts, so hydration meets the first step the build rendered on the server.
 *
 * Args:
 *   panel  : The ref the widget's panel binds to.
 *   tuning : How the widget plays its steps.
 */
export function useDrive(panel: Ref<HTMLElement | null>, tuning: DriveTuning): Drive {
  const { moving } = useMotion()
  const mounted    = useMounted()
  const seen       = useElementVisibility(panel)
  const held       = shallowRef(false)
  const at         = shallowRef(tuning.start)
  let waited       = 0

  const timer = useIntervalFn(() => {
    if (at.value < tuning.count - 1) at.value++
    else if (++waited > tuning.rest) {
      waited   = 0
      at.value = tuning.start
    }
  }, tuning.interval, { immediate: false })

  watch([moving, mounted], ([now, on]) => {
    if (on && !now) at.value = tuning.settle
  })
  watchEffect(() => {
    if (moving.value && seen.value && !held.value) timer.resume()
    else timer.pause()
  })

  return {
    at: at,

    go: step => {
      waited   = 0
      at.value = step
    },

    hold: now => {
      held.value = now
    }
  }
}
