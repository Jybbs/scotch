import { clamp, useIntervalFn } from '@vueuse/core'
import { type Ref, ref }        from 'vue'

/**
 * The ply a reader stands on and the ways to move it: a step to a ply, a key
 * the list of plies answers, and playing the line through from its start.
 */
export interface Stepping {
  answer  : (event: KeyboardEvent) => void
  go      : (to: number) => void
  play    : () => void
  playing : Readonly<Ref<boolean>>
  ply     : Ref<number>
}

/**
 * The keys the list of plies answers, each naming the ply it moves to from the
 * ply in view and the last ply, following the listbox pattern's arrows, Home,
 * and End.
 */
export const STEP_KEYS: Readonly<Record<string, (ply: number, last: number) => number>> = {
  ArrowDown : ply => ply + 1,
  ArrowUp   : ply => ply - 1,
  End       : (_, last) => last,
  Home      : () => 0
}

/**
 * Holds the ply a widget stands on between 0 and `last`. A step from a button,
 * a click, or a key stops the line playing, and playing starts again from the
 * starting position, stepping once every `interval` milliseconds and stopping
 * on the step that reaches the last, while a press of play during playing stops
 * it where it stands.
 *
 * Args:
 *   interval : The milliseconds between two plies while the line plays.
 *   last     : The last ply.
 *   opening  : The ply the widget opens on.
 */
export function useStepping(interval: number, last: number, opening: number): Stepping {
  const ply   = ref(opening)
  const timer = useIntervalFn(() => {
    ply.value = Math.min(ply.value + 1, last)
    if (ply.value === last) timer.pause()
  }, interval, { immediate: false })

  const go = (to: number): void => {
    timer.pause()
    ply.value = clamp(to, 0, last)
  }

  return {
    go      : go,
    playing : timer.isActive,
    ply     : ply,

    answer: event => {
      const step = STEP_KEYS[event.key]
      if (!step) return
      event.preventDefault()
      go(step(ply.value, last))
    },

    play: () => {
      if (timer.isActive.value) {
        timer.pause()
        return
      }
      ply.value = 0
      timer.resume()
    }
  }
}
