// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import { PieceLayer } from '../../../lib/methods/piece-layer.ts'
import * as squares   from '../../../lib/methods/squares.ts'

/**
 * Lays out a board whose layer holds a white pawn under the name `a` on a2.
 */
function board(): HTMLElement {
  const drawn = document.createElement('div')
  const layer = document.createElement('div')
  const pawn  = document.createElement('span')
  layer.className = 'sc-run-layer'
  pawn.className  = 'sc-run-piece'
  Object.assign(pawn.dataset, { id: 'a', piece: 'P' })
  Object.assign(pawn.style, { opacity: '1', transform: squares.squareAt(8) })
  layer.append(pawn)
  drawn.append(layer)
  return drawn
}

/**
 * Places one piece under a name at full opacity on a square.
 */
function placing(id: string, piece: squares.Placed['piece'], square: number): Map<string, squares.Placed> {
  return new Map([[id, { ghost: false, opacity: 1, piece, square }]])
}

describe('PieceLayer', () => {
  it('moves a piece it already holds as the same node', () => {
    const drawn = board()
    const pawn  = drawn.querySelector<HTMLElement>('.sc-run-piece')!
    new PieceLayer(drawn).place(placing('a', 'P', 16), undefined, [])
    expect(drawn.querySelector('.sc-run-piece')).toBe(pawn)
    expect(pawn.style.transform).toBe(squares.squareAt(16))
  })

  it('draws a piece that changes again in place, as a pawn that promotes', () => {
    const drawn = board()
    const pawn  = drawn.querySelector<HTMLElement>('.sc-run-piece')!
    new PieceLayer(drawn).place(placing('a', 'Q', 56), undefined, [])
    expect([...drawn.querySelectorAll('.sc-run-piece')]).toEqual([pawn])
    expect(pawn.dataset.piece).toBe('Q')
    expect(pawn.innerHTML).not.toBe('')
  })

  it('adds a piece it does not hold and fades out one the position leaves out', () => {
    const drawn = board()
    new PieceLayer(drawn).place(placing('b', 'n', 57), undefined, [])
    const opacities = Object.fromEntries([...drawn.querySelectorAll<HTMLElement>('.sc-run-piece')]
      .map(node => [node.dataset.id!, node.style.opacity]))
    expect(opacities).toEqual({ a: '0', b: '1' })
  })
})
