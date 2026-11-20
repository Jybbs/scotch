import * as motion  from './motion.ts'
import * as squares from './squares.ts'

/**
 * A piece of a board's layer, standing on the board's a8 corner until its
 * transform moves it, hidden until its opacity is written, its drawing filling
 * it, and a ghost's drawing hollow in the dark shade.
 */
export const PIECE = 'absolute top-0 left-0 size-[12.5%] opacity-0 will-change-[transform,opacity] '
                   + '[&_svg]:block [&_svg]:size-full data-ghost:[&_svg_*]:fill-transparent! '
                   + 'data-ghost:[&_svg_*]:stroke-dark!'

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
    this.#layer = board.querySelector<HTMLElement>('[data-layer]')!
    for (const node of this.#layer.querySelectorAll<HTMLElement>('[data-piece]')) {
      this.#nodes.set(node.dataset.id!, node)
    }
  }

  #nodeOf(id: string, placed: squares.Placed): HTMLElement {
    const found = this.#nodes.get(id)
    if (found?.dataset.piece === placed.piece) return found
    const node = found ?? document.createElement('span')
    Object.assign(node, { className: PIECE, innerHTML: squares.pieceMarkup(placed.piece) })
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
