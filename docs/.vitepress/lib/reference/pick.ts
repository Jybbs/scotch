import { clamp } from '@vueuse/core'

/**
 * The column width below which a drawing takes its narrow form, which a phone's
 * column reads and the narrowest desktop column does not.
 */
export const NARROW = 520

const KEYS: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1 }

/**
 * Reads whether a drawing's measured width takes the narrow form, for the
 * `data-narrow` attribute its stylesheet reads, a width of 0 meaning the drawing
 * has not been measured yet.
 */
export function narrowAt(width: number): { height: number, narrow: boolean, width: number } {
  return { height: 0, narrow: width > 0 && width < NARROW, width }
}

/**
 * Writes the properties of one button of a set a reader picks one of at a time,
 * its pressed state read by a screen reader, the arrow keys moving among the set
 * and the set taking one tab stop.
 *
 * Args:
 *   index : The button's place in the set.
 *   at    : The place picked now.
 *   count : How many buttons the set holds.
 *   pick  : Picks a place.
 */
export function pickable(index: number, at: number, count: number, pick: (index: number) => void): Record<string, unknown> {
  return {
    'aria-pressed' : String(index === at),
    'onClick'      : () => {
      pick(index)
    },
    'onKeydown'    : (event: KeyboardEvent) => {
      const step = KEYS[event.key]
      if (step === undefined) return
      event.preventDefault()
      const next   = (index + step + count) % count
      const target = (event.currentTarget as HTMLElement).parentElement?.children[next]
      pick(next)
      if (target instanceof HTMLElement) target.focus()
    },
    'tabindex' : index === at ? 0 : -1,
    'type'     : 'button'
  }
}

/**
 * Reads where a pointer falls along an element's width, as a share from 0 to 1.
 */
export function shareAlong(event: PointerEvent, node: Element): number {
  const box = node.getBoundingClientRect()
  return clamp((event.clientX - box.left) / box.width, 0, 1)
}
