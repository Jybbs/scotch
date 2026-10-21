import { describe, expect, it } from 'vitest'

import measures                       from './fixtures/measures.json' with { type: 'json' }
import { Field }                     from '../../../lib/front/field.ts'
import type { Mote, Way }            from '../../../lib/front/motes.ts'
import type { Box, Point }            from '../../../lib/front/layout.ts'
import { makeWay }                    from '../../../lib/front/ways.ts'
import { crowded, fieldOf, front }    from '../../common/front.ts'

interface Made {
  field : Field
  motes : Mote[]
  ways  : ReturnType<typeof makeWay>
}

/**
 * Lists the pieces given a way beside their ways.
 */
function given(motes: Mote[]): { piece: Mote, way: Way }[] {
  return motes.flatMap(piece => piece.way ? [{ piece, way: piece.way }] : [])
}

/**
 * Counts the pieces given a way whose spot stands within reach of the home of
 * another piece given one.
 */
function intoHomes(field: Field, moved: { piece: Mote, way: Way }[]): number {
  return moved.filter(({ piece, way }) => moved.some(other => other.piece !== piece
    && !field.apart([way.tx, way.ty], [other.piece.hx, other.piece.hy]))).length
}

/**
 * Lays the field out on one of the measured pages and finds every way.
 */
function madeOn(name: keyof typeof measures): Made {
  const field = fieldOf(measures[name])
  const motes = field.placed()
  return { field, motes, ways: makeWay(field, motes) }
}

/**
 * Moves a box of the wide page to center it on a page 980 pixels wide.
 */
function shifted(box: Box): Box {
  return { ...box, x: box.x - (measures.wide.W - 980) / 2 }
}

describe('makeWay', () => {
  it.each([['wide', 39], ['narrow', 9]] as const)(
    "makes way for every piece in the oval's path on the %s page",
    (page, made) => {
      expect(madeOn(page).ways).toEqual({ lost: 0, made })
    }
  )

  it('gives a way only to a loose piece standing within reach of a place on the oval', () => {
    const { field, motes } = madeOn('wide')
    const ways             = given(motes)
    expect(ways.map(({ piece }) => piece.k)).toAllEqual(-1)
    expect(Math.max(...ways.flatMap(({ way }) => way.near.map(place => place.d))))
      .toBeLessThan(field.clearance)
  })

  it('moves each such piece clear of every place on the oval and apart from every other spot', () => {
    const { field, motes } = madeOn('wide')
    const spots            = given(motes).map(({ way }): Point => [way.tx, way.ty])
    expect(spots.map(spot => field.free(spot))).toAllEqual(true)
    expect(crowded(field, spots)).toEqual([])
  })

  it('lists the places a piece stands near, the nearest first', () => {
    const near = given(madeOn('wide').motes).map(({ way }) => way.near.map(place => place.d))
    expect(near).toEqual(near.map(distances => distances.toSorted((a, b) => a - b)))
  })
})

describe('makeWay, the spots it finds', () => {
  it('lets a piece make way to a spot within reach of its own home', () => {
    const { field, motes } = madeOn('wide')
    expect(given(motes).some(({ piece, way }) => !field.apart([way.tx, way.ty], [piece.hx, piece.hy])))
      .toBe(true)
  })

  it('lets a piece make way into the home a piece ahead of it in the path leaves', () => {
    const field = fieldOf({
      ...measures.wide,
      W     : 980,
      lock  : shifted(measures.wide.lock),
      parts : measures.wide.parts.map(box => shifted(box))
    })
    const motes = field.placed()
    makeWay(field, motes)
    expect(intoHomes(field, given(motes))).toBeGreaterThan(0)
  })

  it('counts a piece with no free spot as lost', () => {
    const field = fieldOf(measures.wide)
    const motes = field.placed()
    const boxed = new Field({ ...measures.wide, P: 0 }, front, field.plan)
    boxed.homes.push(...field.homes)
    expect(makeWay(boxed, motes).lost).toBeGreaterThan(0)
  })
})
