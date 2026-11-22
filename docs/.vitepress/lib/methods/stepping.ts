import { clamp, isClient, useTimeoutFn } from '@vueuse/core'
import { type Ref, shallowRef, watch }   from 'vue'

import { useMotion } from '../motion/control.ts'

/**
 * The ply a widget stands on, whether it plays, and the calls that step, jump,
 * and toggle it.
 */
export interface Player {
  jump    : (to: number) => void
  playing : Ref<boolean>
  ply     : Ref<number>
  step    : (by: number) => void
  toggle  : () => void
}

/**
 * How a widget plays a line through: the milliseconds it waits between two
 * plies, and the milliseconds it rests on the last before starting again.
 */
export const PACE = { interval: 1100, rest: 2600 } as const

/**
 * Plays a line forward from ply 0 to `last` while the site's drawings move,
 * resting on the last ply before it starts again, and opens on the ply `still`
 * names wherever they hold still. A step or a jump stops the line where it
 * lands, and a toggle plays it again, from the start once it stands on the
 * last ply. The line plays only in a browser, so a page rendered on the
 * server arms no timer.
 *
 * Args:
 *   last  : The last ply.
 *   still : The ply the widget opens on while the drawings hold still.
 */
export function usePlayer(last: number, still: number): Player {
  const { moving } = useMotion()
  const ply        = shallowRef(moving.value ? 0 : still)
  const playing    = shallowRef(false)
  const timer      = useTimeoutFn(() => {
    ply.value = ply.value >= last ? 0 : ply.value + 1
    tick()
  }, () => ply.value >= last ? PACE.rest : PACE.interval, { immediate: false })

  function tick(): void {
    timer.stop()
    if (playing.value && isClient) timer.start()
  }
  const land = (to: number): void => {
    ply.value     = clamp(to, 0, last)
    playing.value = false
  }

  watch(moving, on => {
    playing.value = on
  }, { immediate: true })
  watch(playing, tick, { immediate: true })

  return {
    jump    : land,
    playing : playing,
    ply     : ply,
    step    : by => land(ply.value + by),
    toggle  : () => {
      if (!playing.value && ply.value >= last) ply.value = 0
      playing.value = !playing.value
    }
  }
}
