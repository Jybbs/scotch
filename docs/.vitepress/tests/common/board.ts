import { vi } from 'vitest'

/**
 * Stands a board and its key at boxes of their own, the key 16 pixels under a
 * board 240 pixels on a side.
 */
export function standBoard(board: Element, key: Element): void {
  vi.spyOn(board, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 240, 240))
  vi.spyOn(key, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 356, 240, 60))
}
