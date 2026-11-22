import { flushPromises }          from '@vue/test-utils'
import type { DetachedWindowAPI } from 'happy-dom'
import { onTestFinished }         from 'vitest'

import { MOTION_KEY } from '../../../docs/.vitepress/lib/motion/control.ts'

/**
 * Presses pause on the motion switch, as a reader does mid-play, telling every
 * mounted drawing through the storage event session storage sends, and clears
 * the choice once the case ends.
 */
export async function pauseMotion(): Promise<void> {
  const sent = { key: MOTION_KEY, newValue: 'paused', storageArea: sessionStorage }
  sessionStorage.setItem(MOTION_KEY, 'paused')
  window.dispatchEvent(new StorageEvent('storage', sent))
  onTestFinished(() => {
    sessionStorage.removeItem(MOTION_KEY)
  })
  await flushPromises()
}

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
