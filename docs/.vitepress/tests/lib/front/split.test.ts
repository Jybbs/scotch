// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { frontOf }    from '../../../lib/front/example.ts'
import { SplitBoard } from '../../../lib/front/split.ts'
import * as squares   from '../../../lib/methods/squares.ts'

const { stored, submitted } = frontOf().example

/**
 * Lays out a board at a position of a line, its pieces each under the number
 * it keeps.
 */
function boardAt(ply: number, line = submitted): HTMLElement {
  const board = document.createElement('div')
  const layer = document.createElement('div')
  const mark  = document.createElement('i')
  layer.className = 'sc-run-layer'
  mark.className  = 'sc-front-landed'
  for (const { id, piece, square } of line[ply]!.standing) {
    const node = document.createElement('span')
    Object.assign(node.dataset, { id: String(id), piece })
    Object.assign(node.style, { opacity: '1', transform: squares.squareAt(square) })
    node.className = 'sc-run-piece'
    layer.append(node)
  }
  board.append(mark, layer)
  return board
}

/**
 * Reads the square each piece of a board stands on and its opacity, by the
 * number it keeps.
 */
function shown(board: HTMLElement): Record<string, [string, string]> {
  return Object.fromEntries([...board.querySelectorAll<HTMLElement>('.sc-run-piece')]
    .map(node => [node.dataset.id!, [node.style.transform, node.style.opacity]]))
}

beforeEach(() => {
  const done = { cancel: vi.fn<() => void>(), playState: 'finished' } as unknown as Animation
  vi.spyOn(Element.prototype, 'animate').mockReturnValue(done)
})

describe('SplitBoard', () => {
  it('moves each piece to the square the position sets, glides included', () => {
    const board = boardAt(0)
    new SplitBoard(board).show(submitted[1]!, 'glide')
    const moved = Object.fromEntries(submitted[1]!.standing
      .map(({ id, square }) => [String(id), [squares.squareAt(square), '1']]))
    expect(shown(board)).toEqual(moved)
    expect(Element.prototype.animate).toHaveBeenCalled()
  })

  it('fades out a piece the position no longer holds', () => {
    const capture = 1 + stored.slice(1).findIndex((position, ply) =>
      position.standing.length < stored[ply]!.standing.length)
    const board   = boardAt(capture - 1, stored)
    new SplitBoard(board).show(stored[capture]!)
    expect(Object.values(shown(board)).filter(([, opacity]) => opacity === '0')).toHaveLength(1)
  })

  it('marks the square the last move landed on, and none at the start', () => {
    const board  = boardAt(0)
    const driver = new SplitBoard(board)
    const landed = board.querySelector<HTMLElement>('.sc-front-landed')!
    driver.show(submitted[1]!)
    expect(landed.style.transform).toBe(squares.squareAt(submitted[1]!.to!))
    driver.show(submitted[0]!)
    expect(landed.style.opacity).toBe('0')
  })

  it('draws a piece the board does not yet hold, such as a promoted one', () => {
    const board    = boardAt(1)
    const driver   = new SplitBoard(board)
    const position = { ...submitted[1]!, standing: [{ id: 99, piece: 'Q' as const, square: 27 }] }
    driver.show(position)
    const node = board.querySelector<HTMLElement>("[data-id='99']")!
    expect(node.dataset.piece).toBe('Q')
    expect(node.querySelector('.white.queen')).not.toBeNull()
  })

  it('redraws a piece whose number turns into another piece', () => {
    const board  = boardAt(1)
    const [kept] = submitted[1]!.standing
    new SplitBoard(board).show({ ...submitted[1]!, standing: [{ ...kept!, piece: 'Q' }] })
    expect(board.querySelector<HTMLElement>(`[data-id='${kept!.id}']`)!.dataset.piece).toBe('Q')
  })
})
