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

/**
 * Moves among `length` tabs by a key as the tabs pattern of the ARIA Authoring
 * Practices sets, the arrows along `axis` stepping by one and wrapping at
 * either end, and Home and End moving to the first tab and the last.
 *
 * Returns:
 *   The index of the tab the key moves to from the tab at `at`, or `undefined`
 *   for a key the tabs do not answer.
 */
export function tabbed(at: number, key: string, length: number, axis: 'x' | 'y' = 'x'): number | undefined {
  const [back, next] = axis === 'x' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']
  const to           = { [back]: at - 1, [next]: at + 1, End: length - 1, Home: 0 }[key]
  return to === undefined ? undefined : (to + length) % length
}
