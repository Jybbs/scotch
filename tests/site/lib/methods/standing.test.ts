import { describe, expect, it } from 'vitest'

import { exampleOf }       from '../../../../docs/.vitepress/lib/methods/example.ts'
import { framed, tracked } from '../../../../docs/.vitepress/lib/methods/standing.ts'
import { EXAMPLES }        from '../../../../docs/.vitepress/lib/viewer/examples.ts'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'

describe('framed', () => {
  const lines = framed(exampleOf().submitted)

  it('keeps each piece under the number it stands under at the first position', () => {
    expect(lines[1]!.find(({ id }) => id === '11')).toEqual({ gone: false, id: '11', piece: 'P', square: 27 })
  })

  it('keeps a captured piece on its last square, gone, from the ply it is taken on', () => {
    const taken = lines.findIndex(line => line.some(one => one.gone))
    const gone  = lines[taken]!.find(one => one.gone)!
    expect(lines[taken - 1]!.find(one => one.id === gone.id)).toEqual({ ...gone, gone: false })
    expect(lines.slice(taken).map(line => line.find(one => one.id === gone.id)!.gone)).not.toContain(false)
  })
})

describe('tracked', () => {
  it('names each piece of the first position once', () => {
    const [first] = tracked([START])
    expect(new Set(first!.map(one => one.id)).size).toBe(32)
  })

  it('keeps the name of a piece that moves', () => {
    const [first, second] = tracked([START, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR'])
    const pawn            = first!.find(one => one.square === 12)!
    expect(second!.find(one => one.id === pawn.id)).toEqual({ ...pawn, square: 28 })
  })

  it('keeps a captured piece named and gone on its last square', () => {
    const line  = tracked(['8/8/8/3p4/4P3/8/8/8', '8/8/8/3P4/8/8/8/8'])
    const taken = line[1]!.find(one => one.gone)!
    expect(taken).toMatchObject({ piece: 'p', square: 35 })
    const pawn  = line[0]!.find(one => one.piece === 'P')!
    expect(line[1]!.find(one => !one.gone)).toMatchObject({ id: pawn.id, square: 35 })
  })

  it('names a moved piece after the nearest piece of its kind that left a square', () => {
    const [first, second] = tracked(['8/8/8/8/8/8/8/N6N', '8/8/8/8/8/8/6N1/8'])
    const corner          = first!.find(one => one.square === 7)!
    expect(second!.find(one => !one.gone)).toEqual({ gone: false, id: corner.id, piece: 'N', square: 14 })
  })

  it('names a promoted piece after the pawn it was', () => {
    const line = tracked(['8/P7/8/8/8/8/8/8', 'Q7/8/8/8/8/8/8/8'])
    expect(line[1]).toEqual([{ gone: false, id: line[0]![0]!.id, piece: 'Q', square: 56 }])
  })

  it('names a piece no earlier piece accounts for by its ply and square', () => {
    expect(tracked(['8/8/8/8/8/8/8/8', 'Q7/8/8/8/8/8/8/8'])[1])
      .toEqual([{ gone: false, id: 'n1-56', piece: 'Q', square: 56 }])
  })

  it('follows every piece of the match the Viewer opens on through each of its plies', () => {
    const line = tracked(EXAMPLES.match.submitted.placements)
    expect(line).toHaveLength(EXAMPLES.match.submitted.placements.length)
    expect(line.every(position => new Set(position.map(one => one.id)).size === position.length)).toBe(true)
  })
})
