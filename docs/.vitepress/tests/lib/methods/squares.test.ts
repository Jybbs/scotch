import { describe, expect, it } from 'vitest'

import pieces         from '../../../lib/rendered/pieces.json' with { type: 'json' }
import { exampleOf }  from '../../../lib/methods/example.ts'
import * as squares   from '../../../lib/methods/squares.ts'
import type { Piece } from '../../../lib/site/pieces.ts'

const methods = exampleOf()

/**
 * Reads the squares a ply's marks name beside the mark each takes.
 */
function marked(ply: number): Record<number, squares.Mark> {
  const marks = squares.marksAt(methods, ply)
  return Object.fromEntries(marks.flatMap((mark, square) => mark ? [[square, mark]] : []))
}

describe('marksAt', () => {
  it('marks each square by the game standing a piece there the ply before the two games meet', () => {
    expect(marked(6)).toEqual({ 11: 'stored', 12: 'submitted', 27: 'submitted', 28: 'stored' })
  })

  it('marks a square both games stand different pieces on as both where they part', () => {
    expect(marked(18)).toEqual({ 35: 'both', 40: 'submitted', 44: 'stored', 50: 'stored' })
  })

  it('marks no square on the starting position', () => {
    expect(marked(0)).toEqual({})
  })
})

describe('nearest', () => {
  it.each([
    [[50, 44], 44],
    [[9, 12], 12],
    [[8, 11, 15], 11],
    [[], undefined]
  ])('names %j at %j, the lowest rank first and the middle files next', (list, square) => {
    expect(squares.nearest(list)).toBe(square)
  })
})

describe('pieceMarkup', () => {
  it.each(Object.keys(pieces) as Piece[])('draws the %s with no id of its own', piece => {
    expect(squares.pieceMarkup(piece)).not.toMatch(/ id="/u)
  })

  it.each(['P', 'N', 'B', 'R', 'Q', 'K'] as Piece[])('draws the white %s once, with no ring', piece => {
    expect(squares.pieceMarkup(piece)).not.toContain('sc-run-halo')
  })

  it.each(['p', 'n', 'b', 'r', 'q', 'k'] as Piece[])('draws the black %s over a ringed copy', piece => {
    const markup = squares.pieceMarkup(piece)
    const inner  = pieces[piece].replace(/ id="[^"]*"/u, '')
    expect(markup).toContain(`<g class="sc-run-halo">${inner}</g>${inner}</svg>`)
  })
})

describe('placedAt', () => {
  const placed = squares.placedAt(methods, 6)

  it("draws each square's piece full where the two games differ", () => {
    expect([placed.get('11'), placed.get('12')]).toEqual([
      { ghost: false, opacity: squares.OPACITIES.differing, piece: 'P', square: 27 },
      { ghost: false, opacity: squares.OPACITIES.differing, piece: 'P', square: 12 }
    ])
  })

  it('draws the piece the move reaching the ply set down full', () => {
    expect(placed.get('61'))
      .toEqual({ ghost: false, opacity: squares.OPACITIES.differing, piece: 'b', square: 54 })
  })

  it('draws a piece on a square the two share faint', () => {
    expect(placed.get('0'))
      .toEqual({ ghost: false, opacity: squares.OPACITIES.shared, piece: 'R', square: 0 })
  })

  it("draws the stored game's piece on each square the two differ on as a ghost", () => {
    expect([...placed].filter(([, at]) => at.ghost)).toEqual([
      ['g11', { ghost: true, opacity: squares.OPACITIES.ghost, piece: 'P', square: 11 }],
      ['g12', { ghost: true, opacity: squares.OPACITIES.ghost, piece: 'P', square: 28 }]
    ])
  })

  it('draws no ghost where the two games stand on one position', () => {
    expect([...squares.placedAt(methods, 7).values()].some(at => at.ghost)).toBe(false)
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

describe('squaresOf', () => {
  it('groups the squares a ply marks by their mark', () => {
    expect(squares.squaresOf(squares.marksAt(methods, 18)))
      .toEqual({ both: [35], stored: [44, 50], submitted: [40] })
  })

  it('leaves out a mark no square takes', () => {
    expect(squares.squaresOf(squares.marksAt(methods, 6))).toEqual({ stored: [11, 28], submitted: [12, 27] })
  })
})

describe('MARK_NAMES', () => {
  it.each(squares.MARKS)('names the %s mark as prose', mark => {
    expect(squares.MARK_NAMES[mark]).toReadAsProse()
  })
})
