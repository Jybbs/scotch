import { squareName }                   from '../reference/pieces.ts'
import { type Piece, pieceKind, white } from '../site/pieces.ts'
import type { Hop }                     from './placements.ts'
import { type Facing, SQUARE }          from './trail.ts'

/**
 * Takes a move on a board from the pointer: a press on a piece of the side to
 * move picks its square, and a release on another square, or a press and a
 * release there after a first tap, moves the picked piece to it, so a drag and
 * two taps offer the same move. A press on another piece of the side to move
 * picks that piece instead, and a tap on the picked square lets it go.
 */
export class Picking {
  #held    = false
  #picked? : number

  /**
   * The square whose piece is picked, `undefined` while none is.
   */
  get picked(): number | undefined {
    return this.#picked
  }

  /**
   * Lets the picked piece go, as the board takes a new position.
   */
  drop(): void {
    this.#picked = undefined
    this.#held   = false
  }

  /**
   * Takes a press on a square of a position where White moves or Black does.
   *
   * Returns:
   *   The move the press makes, where a piece was picked and the square
   *     takes it.
   */
  press(square: number, standing: readonly (Piece | undefined)[], whiteMoves: boolean): Hop | undefined {
    const piece = standing[square]
    if (piece && white(piece) === whiteMoves) {
      this.#held   = square !== this.#picked
      this.#picked = this.#held ? square : undefined
      return undefined
    }
    return this.#take(square)
  }

  /**
   * Takes a release on a square, which moves the piece a press still holds
   * there where it is not the square the press picked.
   *
   * Returns:
   *   The move the release makes, where the press held a piece to another
   *     square.
   */
  release(square: number): Hop | undefined {
    const held = this.#held
    this.#held = false
    return held && square !== this.#picked ? this.#take(square) : undefined
  }

  #take(square: number): Hop | undefined {
    const from = this.#picked
    this.drop()
    return from === undefined ? undefined : { from, to: square }
  }
}

/**
 * Reads the square under a point of a board drawn on python-chess's 45-unit
 * squares and turned to face one side, `undefined` off the board.
 */
export function squareAt(x: number, y: number, facing: Facing): number | undefined {
  const [column, row] = [Math.floor(x / SQUARE), Math.floor(y / SQUARE)]
  if (column < 0 || column > 7 || row < 0 || row > 7) return undefined
  const at = (7 - row) * 8 + column
  return facing === 'black' ? 63 - at : at
}

/**
 * Writes a move made on the board as the letter of the piece it moves, none for
 * a pawn, the square it leaves, a hyphen, and the square it reaches.
 */
export function writtenOf(hop: Hop, standing: readonly (Piece | undefined)[]): string {
  const piece = standing[hop.from]
  const kind  = piece && pieceKind(piece) !== 'p' ? piece.toUpperCase() : ''
  return `${kind}${squareName(hop.from)}-${squareName(hop.to)}`
}
