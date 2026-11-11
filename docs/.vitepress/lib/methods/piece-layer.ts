import * as motion  from './motion.ts'
import * as squares from './squares.ts'

/**
 * The pieces of a board's layer, each node kept by the name it holds, so a
 * piece moves from square to square as one node and a piece that changes, as a
 * pawn does when it promotes, is drawn again in place.
 */
export class PieceLayer {
  readonly #layer : HTMLElement
  readonly #nodes = new Map<string, HTMLElement>()

  /**
   * Takes over a board's layer of pieces, reading each piece node the drawing
   * holds by its name.
   *
   * Args:
   *   board : The board holding the layer.
   */
  constructor(board: HTMLElement) {
    this.#layer = board.querySelector<HTMLElement>('.sc-run-layer')!
    for (const node of this.#layer.querySelectorAll<HTMLElement>('.sc-run-piece')) {
      this.#nodes.set(node.dataset.id!, node)
    }
  }

  #nodeOf(id: string, placed: squares.Placed): HTMLElement {
    const found = this.#nodes.get(id)
    if (found?.dataset.piece === placed.piece) return found
    const node = found ?? document.createElement('span')
    Object.assign(node, { className: 'sc-run-piece', innerHTML: squares.pieceMarkup(placed.piece) })
    node.dataset.id    = id
    node.dataset.piece = placed.piece
    node.toggleAttribute('data-ghost', placed.ghost)
    this.#layer.append(node)
    this.#nodes.set(id, node)
    return node
  }

  /**
   * Moves each piece to its square and fades out every piece a position no
   * longer holds.
   *
   * Args:
   *   placed  : Each piece the position holds, by its name.
   *   how     : The motion, or `undefined` to place the pieces at once.
   *   running : The animations the board holds until its next step.
   */
  place(placed: ReadonlyMap<string, squares.Placed>, how: motion.How | undefined, running: Animation[]): void {
    for (const [id, at] of placed) {
      const target = { opacity: at.opacity, transform: squares.squareAt(at.square) }
      motion.moveNode(this.#nodeOf(id, at), how, running, target)
    }
    for (const [id, node] of this.#nodes) {
      if (!placed.has(id)) motion.moveNode(node, how, running, { opacity: 0 })
    }
  }
}
