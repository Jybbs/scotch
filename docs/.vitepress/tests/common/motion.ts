import type { DetachedWindowAPI } from 'happy-dom'
import { onTestFinished }         from 'vitest'

/**
 * Sets happy-dom's document to answer the reduced-motion query as a reader who
 * prefers reduced motion does, until the case ends or calls the lift this
 * returns, when the document goes back to stating no preference.
 *
 * Returns:
 *   The call that lifts the preference before the case ends.
 */
export function reduceMotion(): () => void {
  const { device } = (window as unknown as { happyDOM: DetachedWindowAPI }).happyDOM.settings
  const lift       = (): void => {
    device.prefersReducedMotion = 'no-preference'
  }
  device.prefersReducedMotion = 'reduce'
  onTestFinished(lift)
  return lift
}
