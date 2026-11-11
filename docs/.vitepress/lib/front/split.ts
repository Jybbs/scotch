import type { Position } from '../methods/example.ts'
import * as motion       from '../methods/motion.ts'
import { PieceLayer }    from '../methods/piece-layer.ts'
import * as squares      from '../methods/squares.ts'

/**
 * Reads each piece a position holds as the board's layer places it, by the
 * number it keeps from the line's first position.
 */
export function placedOf(position: Position): Map<string, squares.Placed> {
  return new Map(position.standing.map(({ id, piece, square }) =>
    [String(id), { ghost: false, opacity: 1, piece, square }]))
}

/**
 * Moves one board of the split from one position to another once it is drawn,
 * each piece kept mounted under the number it keeps from the line's first
 * position, so a move glides its piece from one square to the next and a
 * captured piece fades as the capturing piece glides onto its square, beside
 * the mark on the square the last move landed on.
 */
export class SplitBoard {
  readonly #board   : HTMLElement
  readonly #pieces  : PieceLayer
  readonly #running : Animation[] = []

  /**
   * Takes over a board as drawn, reading each piece node it holds by its name.
   *
   * Args:
   *   board : The board, holding its layer of pieces and the landed mark.
   */
  constructor(board: HTMLElement) {
    this.#board  = board
    this.#pieces = new PieceLayer(board)
  }

  /**
   * Moves the board to a position, ending first whatever a step before it left
   * running.
   *
   * Args:
   *   position : The position to show.
   *   how      : The motion, or `undefined` to write the position at once.
   */
  show(position: Position, how?: motion.How): void {
    motion.settleAll(this.#running)
    this.#pieces.place(placedOf(position), how, this.#running)
    const landed = this.#board.querySelector<HTMLElement>('.sc-front-landed')!
    const to     = position.to
    motion.moveNode(landed, how, this.#running, to === null ? { opacity: 0 } : {
      opacity   : 1,
      transform : squares.squareAt(to)
    })
  }
}
