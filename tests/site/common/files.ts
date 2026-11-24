import { type DOMWrapper, flushPromises } from '@vue/test-utils'

/**
 * Builds a match file holding `text`.
 */
export function fileOf(text: string, name = 'game.json'): File {
  return new File([text], name, { type: 'application/json' })
}

/**
 * Picks `files` in the intake's file picker, as a reader choosing them in the
 * dialog does, and waits for them to be read.
 *
 * Returns:
 *   The picker's input.
 */
export async function picked(
  wrapper : { find: (selector: string) => DOMWrapper<Element> },
  files   : readonly File[]
): Promise<HTMLInputElement> {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { configurable: true, value: files })
  await input.trigger('change')
  await flushPromises()
  return input.element as HTMLInputElement
}
