/**
 * Presses a key on an element as a reader does and reads whether its handler
 * kept the browser from acting on the key, as a slider, a list, or a row of
 * tabs does for a key it answers so the page does not scroll.
 */
export function prevented(element: Element, key: string): boolean {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
  element.dispatchEvent(event)
  return event.defaultPrevented
}
