import { type Example, cellOf }              from './example.ts'
import { type Measured, leaderAt, middleOf } from './key.ts'
import * as motion                           from './motion.ts'
import { PieceLayer }                        from './piece-layer.ts'
import * as squares                          from './squares.ts'

/**
 * The squares in the order a reader sees them, from a8 across to h8 and down to
 * h1, which the grids of squares and of washes lay out in.
 */
export const readingOrder = Array.from({ length: 64 }, (_, at) => (7 - Math.floor(at / 8)) * 8 + at % 8)

/**
 * Moves the Methods widget's board and its key from one ply to another once
 * they are drawn: each piece node kept mounted for the board's life, the wash
 * over each square, the stamp naming one position, and each mark's leader and
 * tag, which reach the board by the size it was last measured at.
 */
export class MatchBoard {
  readonly #board   : HTMLElement
  readonly #example : Example
  readonly #key     : HTMLElement
  readonly #pieces  : PieceLayer
  readonly #running : Animation[] = []
  #marks            : (squares.Mark | undefined)[]
  #measured?        : Measured

  /**
   * Takes over a board and its key as drawn at a ply, reading each piece node
   * the drawing holds by the name it keeps.
   *
   * Args:
   *   board   : The board, holding its washes, its layer of pieces, and its
   *     stamp.
   *   example : The line and the stored game the board draws.
   *   key     : The key beneath the board, holding a leader and a tag per mark.
   *   ply     : The ply the board is drawn at.
   */
  constructor(board: HTMLElement, example: Example, key: HTMLElement, ply: number) {
    this.#board   = board
    this.#example = example
    this.#key     = key
    this.#marks   = squares.marksAt(example, ply)
    this.#pieces  = new PieceLayer(board)
  }

  #partsOf(mark: squares.Mark): HTMLElement[] {
    return [...this.#key.querySelectorAll<HTMLElement>(`[data-kind='${mark}']`)]
  }

  #placeKey(how?: motion.How): void {
    const sorted = squares.squaresOf(this.#marks)
    for (const [row, mark] of squares.MARKS.entries()) {
      const square        = squares.nearest(sorted[mark] ?? [])
      const [leader, tag] = this.#partsOf(mark)
      const at            = this.#measured && square !== undefined
                          ? leaderAt(this.#measured, row, square)
                          : undefined
      motion.moveNode(leader!, how, this.#running, at ? { opacity: 1, transform: at.leader } : { opacity: 0 })
      motion.moveNode(tag!, how, this.#running, at ? { opacity: 1, transform: at.tag } : { opacity: 0 })
    }
  }

  /**
   * Measures the board's side and its reach down to the key, stretches each
   * leader from the board's top to the middle of its tag's row, and places the
   * key again with no motion, leaving it hidden while the board has no size.
   */
  measure(): void {
    const board = this.#board.getBoundingClientRect()
    if (!board.width) return
    this.#measured = { reach: this.#key.getBoundingClientRect().top - board.top, size: board.width }
    for (const [row, mark] of squares.MARKS.entries()) {
      const [leader, tag]  = this.#partsOf(mark)
      leader!.style.top    = `${-this.#measured.reach}px`
      leader!.style.height = `${this.#measured.reach + middleOf(row)}px`
      tag!.style.top       = `${middleOf(row)}px`
    }
    this.#placeKey()
  }

  /**
   * Moves the board and the key to a ply, ending first whatever a step before
   * it left running.
   *
   * Args:
   *   ply : The ply to show.
   *   how : The motion, or `undefined` to write the ply at once.
   */
  show(ply: number, how?: motion.How): void {
    motion.settleAll(this.#running)
    this.#pieces.place(squares.placedAt(this.#example, ply), how, this.#running)

    const washes = this.#board.querySelectorAll<HTMLElement>('.sc-run-wash')
    const marks  = squares.marksAt(this.#example, ply)
    for (const [at, square] of readingOrder.entries()) {
      const mark = marks[square]
      if (mark === this.#marks[square]) continue
      if (mark) washes[at]!.dataset.kind = mark
      motion.moveNode(washes[at]!, how, this.#running, { opacity: mark ? 1 : 0 })
    }
    this.#marks = marks

    const stamp = this.#board.querySelector<HTMLElement>('.sc-run-stamp')!
    motion.moveNode(stamp, how, this.#running, { opacity: cellOf(this.#example, ply) === 'run' ? 1 : 0 })
    this.#placeKey(how)
  }
}
