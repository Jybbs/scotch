import { describe, expect, it } from 'vitest'

import * as trails from '../../../lib/viewer/trail.ts'

const { SQUARE } = trails

/**
 * Reads how near a trail passes a point, through the nearest of the points it
 * is laid through.
 */
function nearestTo(trail: trails.Trail, point: trails.Point): number {
  return Math.min(...Array.from({ length: trail.xy.length / 2 }, (_, at) =>
    Math.hypot(trail.xy[2 * at]! - point.x, trail.xy[2 * at + 1]! - point.y)))
}

describe('cornerOf', () => {
  it.each([
    [0, 'white', { x: 0, y: 7 * SQUARE }],
    [63, 'white', { x: 7 * SQUARE, y: 0 }],
    [0, 'black', { x: 7 * SQUARE, y: 0 }],
    [12, 'black', { x: 3 * SQUARE, y: SQUARE }]
  ] as const)('stands square %i at the corner from %s’s side', (square, facing, corner) => {
    expect(trails.cornerOf(square, facing)).toEqual(corner)
  })

  it('draws from White’s side unless turned', () => {
    expect(trails.cornerOf(9)).toEqual(trails.cornerOf(9, 'white'))
  })
})

describe('Trail', () => {
  const bent = new trails.Trail([0, 0, 30, 0, 30, 40])

  it('runs the length of every segment', () => {
    expect([bent.total, bent.start, bent.end]).toEqual([70, { x: 0, y: 0 }, { x: 30, y: 40 }])
  })

  it.each([
    [0, { x: 0, y: 0 }],
    [3 / 7, { x: 30, y: 0 }],
    [5 / 7, { x: 30, y: 20 }],
    [1, { x: 30, y: 40 }],
    [-1, { x: 0, y: 0 }],
    [2, { x: 30, y: 40 }]
  ])('writes the point at share %d of its length, held to its ends', (share, point) => {
    const at = bent.at(share, { x: Number.NaN, y: Number.NaN })
    expect(at.x).toBeCloseTo(point.x)
    expect(at.y).toBeCloseTo(point.y)
  })

  it('stands still at its start where it holds one point or no length', () => {
    expect(new trails.Trail([5, 6]).at(0.5, { x: 0, y: 0 })).toEqual({ x: 5, y: 6 })
    expect(new trails.Trail([5, 6, 5, 6]).at(0.5, { x: 0, y: 0 })).toEqual({ x: 5, y: 6 })
  })

  it('walks back from a share of its length to its start through each point it passed', () => {
    const back = bent.back(5 / 7)
    expect(back.total).toBeCloseTo(50)
    expect([back.start.x, back.start.y]).toEqual([30, expect.closeTo(20)])
    expect(back.end).toEqual({ x: 0, y: 0 })
    expect([...back.xy]).toEqual([30, expect.closeTo(20), 30, 0, 0, 0])
  })

  it('joins a trail starting where it ends into one', () => {
    const joined = bent.join(new trails.Trail([30, 40, 30, 50]))
    expect([joined.total, joined.end]).toEqual([80, { x: 30, y: 50 }])
  })
})

describe('trailOf', () => {
  it('lays a straight line between the two corners for every piece but a knight', () => {
    const line = trails.trailOf(12, false, 28)
    expect([line.start, line.end, line.total]).toEqual([trails.cornerOf(12), trails.cornerOf(28), 2 * SQUARE])
  })

  it.each([
    ['two ranks then one file', 1, 18, { x: trails.cornerOf(1).x, y: trails.cornerOf(18).y }],
    ['two files then one rank', 1, 11, { x: trails.cornerOf(11).x, y: trails.cornerOf(1).y }]
  ])('lays a knight’s L as %s, cutting its corner on a curve', (_, from, to, corner) => {
    const knight  = trails.trailOf(from, true, to)
    const nearest = nearestTo(knight, corner)
    expect([knight.start, knight.end]).toEqual([trails.cornerOf(from), trails.cornerOf(to)])
    expect(knight.total).toBeGreaterThan(Math.hypot(SQUARE, 2 * SQUARE))
    expect(knight.total).toBeLessThan(3 * SQUARE)
    expect(nearest).toBeGreaterThan(1)
    expect(nearest).toBeLessThan(8)
  })

  it('lays a straight line between two squares no knight’s move joins', () => {
    expect(trails.trailOf(52, true, 60).total).toBe(SQUARE)
  })

  it('lays a trail from Black’s side between the turned corners', () => {
    const turned = trails.trailOf(12, false, 28, 'black')
    expect([turned.start, turned.end]).toEqual([trails.cornerOf(12, 'black'), trails.cornerOf(28, 'black')])
  })
})

describe('laidOut', () => {
  it('lays each traveler’s trail out, a knight’s along its L', () => {
    const laid = trails.laidOut('k7/8/8/8/8/8/8/KN6', 'k7/8/8/8/8/2N5/8/K7', 'white')
    expect(laid.travels.map(({ from, to }) => [from, to])).toEqual([[1, 18]])
    expect(laid.travels[0]!.trail.total).toBeGreaterThan(Math.hypot(SQUARE, 2 * SQUARE))
  })

  it('lays a pawn promoting to a knight in a straight line', () => {
    const laid = trails.laidOut('k7/4P3/8/8/8/8/8/K7', 'k3N3/8/8/8/8/8/8/K7', 'white')
    expect(laid.travels[0]!.trail.total).toBe(SQUARE)
  })
})
