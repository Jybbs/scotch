/**
 * Where a leader and its tag stand once the widget has measured the board.
 */
interface Leader {
  leader : string
  tag    : string
}

/**
 * How the leaders reach the board, as the side of the board in pixels and the
 * distance from the board's top down to the top of the key beneath it.
 */
export interface Measured {
  reach : number
  size  : number
}

/**
 * How the key lays its tags out beneath the board: the pixels from the key's
 * top to the middle of the first tag, the pixels between the middles of two
 * tags, the gap a tag keeps beside its leader, how far a tag set under its
 * leader drops, and the shares of the board's width left of which a tag sits
 * right of its leader and right of which it sits left of it.
 */
export const KEY_LAYOUT = { drop: 8, first: 7, gap: 6, left: 0.383, pitch: 18, right: 0.617 } as const

/**
 * Places a leader and its tag for one square at the board's measured size, the
 * leader rising from the middle of the tag's row to the square's lower edge and
 * the tag sitting beside it, or centered under it near the board's middle
 * files.
 *
 * Args:
 *   measured : The board's side and the reach from its top to the key's.
 *   row      : The tag's row in the key, counted from 0.
 *   square   : The square the leader names, counted from 0 at a1.
 */
export function leaderAt(measured: Measured, row: number, square: number): Leader {
  const cell   = measured.size / 8
  const x      = (square % 8 + 0.5) * cell
  const bottom = (8 - Math.floor(square / 8)) * cell
  const total  = measured.reach + middleOf(row)
  const at     = `translate3d(${x.toFixed(2)}px, 0, 0)`
  const leader = `${at} scaleY(${((total - bottom) / total).toFixed(4)})`

  if (x < KEY_LAYOUT.left * measured.size) {
    return { leader, tag: `translate3d(${(x + KEY_LAYOUT.gap).toFixed(2)}px, 0, 0)` }
  }
  if (x > KEY_LAYOUT.right * measured.size) {
    return { leader, tag: `translate3d(${(x - KEY_LAYOUT.gap).toFixed(2)}px, 0, 0) translateX(-100%)` }
  }
  return { leader, tag: `${at} translateX(-50%) translateY(${KEY_LAYOUT.drop}px)` }
}

/**
 * Reads the pixels from the key's top to the middle of a tag's row.
 */
export function middleOf(row: number): number {
  return KEY_LAYOUT.first + row * KEY_LAYOUT.pitch
}
