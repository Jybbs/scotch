import { clamp } from '@vueuse/core'

/**
 * Steps a slider's value by a key as the slider pattern of the ARIA Authoring
 * Practices sets, the arrows stepping by one, Page Up and Page Down by ten, and
 * Home and End to the ends, with the up and down arrows left out where
 * `vertical` is false.
 *
 * Returns:
 *   The value the key moves the slider to, held between `low` and `high`, or
 *   `undefined` for a key the slider does not answer.
 */
export function stepped(
  high     : number,
  key      : string,
  low      : number,
  value    : number,
  vertical : boolean = true
): number | undefined {
  const steps: Partial<Record<string, number>> = {
    ArrowLeft  : value - 1,
    ArrowRight : value + 1,
    End        : high,
    Home       : low,
    PageDown   : value - 10,
    PageUp     : value + 10,
    ...vertical ? { ArrowDown: value - 1, ArrowUp: value + 1 } : {}
  }
  const to = steps[key]
  return to === undefined ? undefined : clamp(to, low, high)
}
