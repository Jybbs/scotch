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
    expect(squares.pieceMarkup(piece)).not.toContain(squares.HALO)
  })

  it.each(['p', 'n', 'b', 'r', 'q', 'k'] as Piece[])('draws the black %s over a ringed copy', piece => {
    const markup = squares.pieceMarkup(piece)
    const inner  = pieces[piece].replace(/ id="[^"]*"/u, '')
    expect(markup).toContain(`<g class="${squares.HALO}">${inner}</g>${inner}</svg>`)
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

  it.each([
    ['the piece the move reaching the ply set down full', '61', squares.OPACITIES.differing, 'b', 54],
    ['a piece on a square the two share faint', '0', squares.OPACITIES.shared, 'R', 0]
  ])('draws %s', (_, key, opacity, piece, square) => {
    expect(placed.get(key)).toEqual({ ghost: false, opacity, piece, square })
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
  it.each([
    ['groups the squares a ply marks by their mark', 18, { both: [35], stored: [44, 50], submitted: [40] }],
    ['leaves out a mark no square takes', 6, { stored: [11, 28], submitted: [12, 27] }]
  ])('%s', (_, ply, grouped) => {
    expect(squares.squaresOf(squares.marksAt(methods, ply))).toEqual(grouped)
  })
})

describe('MARK_NAMES', () => {
  it.each(squares.MARKS)('names the %s mark as prose', mark => {
    expect(squares.MARK_NAMES[mark]).toReadAsProse()
  })
})
