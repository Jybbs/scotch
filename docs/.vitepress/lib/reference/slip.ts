import { clamp } from '@vueuse/core'

/**
 * The gap in pixels between a term and its slip, which a pointer crosses on a
 * bridge the slip's stylesheet draws.
 */
const GAP = 8

/**
 * The margin in pixels the slip keeps from the window's edge.
 */
const MARGIN = 12

/**
 * Places a slip below its term in the window, above it where no room remains
 * below, its left edge on the term's and held inside the window.
 *
 * Args:
 *   term   : The term's box in the window.
 *   slip   : The slip's size.
 *   window : The window's size.
 */
export function slipAt(
  term   : Pick<DOMRect, 'bottom' | 'left' | 'top'>,
  slip   : { height: number, width: number },
  window : { height: number, width: number }
): { above: boolean, x: number, y: number } {
  const above = term.bottom + GAP + slip.height + MARGIN > window.height && term.top - GAP - slip.height >= MARGIN

  return {
    above : above,
    x     : clamp(term.left, MARGIN, Math.max(MARGIN, window.width - slip.width - MARGIN)),
    y     : above ? term.top - GAP - slip.height : term.bottom + GAP
  }
}
