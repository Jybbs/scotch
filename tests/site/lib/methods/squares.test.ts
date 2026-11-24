import { describe, expect, it } from 'vitest'

import pieces         from '../../../../docs/.vitepress/lib/rendered/pieces.json' with { type: 'json' }
import { exampleOf }  from '../../../../docs/.vitepress/lib/methods/example.ts'
import * as squares   from '../../../../docs/.vitepress/lib/methods/squares.ts'
import type { Piece } from '../../../../docs/.vitepress/lib/site/pieces.ts'

const methods = exampleOf()

/**
 * Reads the squares a ply's marks name beside the mark each takes.
 */
function marked(ply: number): Record<number, squares.Mark> {
  const marks = squares.marksAt(methods, ply)
  return Object.fromEntries(marks.flatMap((mark, square) => mark ? [[square, mark]] : []))
}

describe('marksAt', () => {
  it.each([
    [
      'each square by the game standing a piece there the ply before the two games meet',
      6, { 11: 'stored', 12: 'submitted', 27: 'submitted', 28: 'stored' }
    ],
    [
      'a square both games stand different pieces on as both where they part',
      18, { 35: 'both', 40: 'submitted', 44: 'stored', 50: 'stored' }
    ],
    ['no square on the starting position', 0, {}]
  ])('marks %s', (_, ply, marks) => {
    expect(marked(ply)).toEqual(marks)
  })
})

describe('pieceMarkup', () => {
  it.each(Object.keys(pieces) as Piece[])('draws the %s with no id of its own', piece => {
    expect(squares.pieceMarkup(piece)).not.toMatch(/ id="/u)
  })

  it('draws a white piece once, with no ring', () => {
    expect(squares.pieceMarkup('P')).not.toContain(squares.HALO)
  })

  it('draws a black piece over a ringed copy', () => {
    const inner = pieces.p.replace(/ id="[^"]*"/u, '')
    expect(squares.pieceMarkup('p')).toContain(`<g class="${squares.HALO}">${inner}</g>${inner}</svg>`)
  })
})

describe('squareAt', () => {
  it.each([[0, 'translate(0%, 700%)'], [12, 'translate(400%, 600%)'], [63, 'translate(700%, 0%)']])(
    'stands a piece on square %i from a1 in the lower left',
    (square, transform) => {
      expect(squares.squareAt(square)).toBe(transform)
    }
  )
})

describe('MARK_NAMES', () => {
  it.each(squares.MARKS)('names the %s mark as prose', mark => {
    expect(squares.MARK_NAMES[mark]).toReadAsProse()
  })
})
