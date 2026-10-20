import * as timing from '../motion/timing.ts'

export type How = 'fade' | 'glide'

/**
 * Where one node moves to, as the transform it ends on, or its current one
 * where none is named, and the opacity it ends at.
 */
interface Target {
  opacity    : number
  transform? : string
}

/**
 * Chooses how the widget moves from one ply to another: a glide to the next ply
 * or the one before, a fade across a longer jump, and no motion at all for a
 * reader who prefers reduced motion.
 */
export function howOf(from: number, reduced: boolean, to: number): How | undefined {
  if (reduced) return undefined
  return Math.abs(to - from) === 1 ? 'glide' : 'fade'
}

/**
 * Moves one node to a target from the transform and the opacity its inline
 * style holds, then writes the target there. A glide eases the transform and
 * the opacity along the site's glide, a fade carries the node out, across while
 * hidden, and back in along the sway, and no motion at all writes the target at
 * once. A node holding no transform yet, or none it shows, takes its first
 * transform without gliding from nowhere.
 *
 * Args:
 *   node    : The node to move.
 *   how     : The motion, or `undefined` for none.
 *   running : The list each animation started is added to, so a later step can
 *     settle it.
 *   target  : Where the node ends.
 */
export function moveNode(
  node    : HTMLElement,
  how     : How | undefined,
  running : Animation[],
  target  : Target
): void {
  const from  = node.style.transform
  const shown = Number(node.style.opacity)
  const to    = target.transform ?? from

  if (to === from && target.opacity === shown) return

  if (how === 'glide') {
    const curve = timing.cubicBezier(timing.CURVES.glide)
    if (to !== from && from && shown > 0) {
      const frames = [{ transform: from }, { transform: to }]
      running.push(node.animate(frames, { duration: timing.DURATIONS.glide, easing: curve }))
    }
    if (target.opacity !== shown) {
      const frames = [{ opacity: shown }, { opacity: target.opacity }]
      running.push(node.animate(frames, { duration: timing.DURATIONS.settle, easing: curve }))
    }
  }
  if (how === 'fade') {
    const across = to === from || !from
      ? [{ opacity: shown }, { opacity: target.opacity }]
      : [
          { opacity: shown, transform: from },
          { offset: 0.45, opacity: 0, transform: from },
          { offset: 0.55, opacity: 0, transform: to },
          { opacity: target.opacity, transform: to }
        ]
    const curve = timing.cubicBezier(timing.CURVES.sway)
    running.push(node.animate(across, { duration: timing.DURATIONS.settle, easing: curve }))
  }

  node.style.transform = to
  node.style.opacity   = String(target.opacity)
}

/**
 * Ends every animation a step left running, first writing where each has
 * carried its node into the node's inline style wherever the browser can, so
 * the next step starts from the place the reader sees.
 */
export function settleAll(running: Animation[]): void {
  for (const animation of running.splice(0)) {
    const settling = animation.playState === 'running' && typeof animation.commitStyles === 'function'
    if (settling) animation.commitStyles()
    animation.cancel()
  }
}
