import { flushPromises } from '@vue/test-utils'

/**
 * Presses a key on an element as a reader does, then waits for what the press
 * draws, reading whether a handler kept the browser from acting on the key.
 */
export async function pressed(element: Element, key: string, held: KeyboardEventInit = {}): Promise<boolean> {
  const answered = prevented(element, key, held)
  await flushPromises()
  return answered
}

/**
 * Presses a key on an element as a reader does and reads whether its handler
 * kept the browser from acting on the key, as a slider, a list, or a row of
 * tabs does for a key it answers so the page does not scroll, the modifiers
 * `held` names held down.
 */
export function prevented(element: Element, key: string, held: KeyboardEventInit = {}): boolean {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...held })
  element.dispatchEvent(event)
  return event.defaultPrevented
}
