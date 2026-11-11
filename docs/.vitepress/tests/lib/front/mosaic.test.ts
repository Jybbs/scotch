import { describe, expect, it } from 'vitest'

import { MOSAIC_TUNING, insideOf, mosaicOf, ringsOf } from '../../../lib/front/mosaic.ts'

const SQUARE   = '<svg viewBox="0 0 50 50"><path d="M0 0H50V50H0Z"/></svg>'
const TRIANGLE = '<svg viewBox="0 0 50 50"><path d="M0 0L50 50H0Z"/></svg>'

describe('ringsOf', () => {
  it('reads each closed ring of a path in absolute commands', () => {
    expect(ringsOf('M0 0H10V10L0 10Z M20 20H30V30Z')).toEqual([
      [[0, 0], [10, 0], [10, 10], [0, 10]],
      [[20, 20], [30, 20], [30, 30]]
    ])
  })

  it('draws a quadratic curve in straight steps ending on its end point', () => {
    const [ring] = ringsOf('M0 0Q10 0 10 10Z')
    expect(ring).toHaveLength(9)
    expect(ring![4]).toEqual([7.5, 2.5])
    expect(ring!.at(-1)).toEqual([10, 10])
  })
})

describe('insideOf', () => {
  const inside = insideOf(ringsOf('M0 0H10V10H0Z M2 2V8H8V2Z'))

  it.each([[1, 1, true], [5, 5, false], [11, 5, false]] as const)(
    'reads the point at %i, %i as inside the mark: %s', (x, y, held) => {
      expect(inside(x, y)).toBe(held)
    })

  it('reads a second point on a row it has already read', () => {
    expect([inside(1, 5), inside(9, 5), inside(5, 5)]).toEqual([true, true, false])
  })

  it('reads a ring wound the same way as the one around it as filled under the nonzero rule', () => {
    expect(insideOf(ringsOf('M0 0H10V10H0Z M2 2H8V8H2Z'))(5, 5)).toBe(true)
  })
})

describe('mosaicOf', () => {
  it('reads the box and the path the drawing writes', () => {
    const mosaic = mosaicOf(SQUARE)
    expect(mosaic.box).toEqual({ height: 50, width: 50, x: 0, y: 0 })
    expect(mosaic.path).toBe('M0 0H50V50H0Z')
    expect(mosaic.size).toBe(MOSAIC_TUNING.cell)
  })

  it('fills every cell the mark covers whole with two different pieces, a white and a black', () => {
    const { cells } = mosaicOf(SQUARE)
    expect(cells).toHaveLength(4)
    for (const cell of cells) {
      expect(cell.cut).toBe(false)
      expect(cell.white).toMatch(/^[KQRBNP]$/u)
      expect(cell.black).toBe(cell.black.toLowerCase())
      expect(cell.black.toUpperCase()).not.toBe(cell.white)
    }
  })

  it("cuts a cell the outline crosses, its white piece in the mark's lower left part", () => {
    const cut = mosaicOf(TRIANGLE).cells.find(cell => cell.left + cell.top === 0)!
    expect(cut.cut).toBe(true)
    expect(cut.within![0]).toBeLessThan(cut.outside![0])
    expect(cut.within![1]).toBeGreaterThan(cut.outside![1])
  })

  it("sets both pieces of a cut cell the mark fills whole at the cell's middle", () => {
    const middle = MOSAIC_TUNING.cell / 2
    for (const cell of mosaicOf(SQUARE, { ...MOSAIC_TUNING, whole: 2 }).cells) {
      expect(cell.cut).toBe(true)
      expect(cell.outside).toEqual([middle, middle])
    }
  })

  it('leaves out a cell the outline only grazes', () => {
    expect(mosaicOf(TRIANGLE).cells.map(cell => [cell.left, cell.top])).not.toContainEqual([25, 0])
  })

  it('pours from the foot of the mark to its top, spread across the scroll', () => {
    const { cells } = mosaicOf(SQUARE, { ...MOSAIC_TUNING, jitter: 0 })
    const order     = cells.toSorted((a, b) => a.at - b.at).map(cell => cell.y)
    expect(order[0]).toBeGreaterThan(order.at(-1)!)
    expect(Math.min(...cells.map(cell => cell.at))).toBe(MOSAIC_TUNING.first)
  })

  it('lays the mark out the same way on every call', () => {
    expect(mosaicOf()).toEqual(mosaicOf())
  })
})
