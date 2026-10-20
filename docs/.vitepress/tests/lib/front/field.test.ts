import { describe, expect, it } from 'vitest'

import measures                             from './fixtures/measures.json' with { type: 'json' }
import { GAMES, moteId }                    from '../../../lib/front/example.ts'
import * as field                           from '../../../lib/front/field.ts'
import { gapBetween, layout }               from '../../../lib/front/layout.ts'
import { crowded, fieldOf, front, looseOf } from '../../common/front.ts'

const plan = layout(measures.wide, front.shared)

/**
 * Keeps the moves of an arc the oval shows and drops every move past them.
 */
function cut(arc: typeof front.top): typeof front.top {
  return { ...arc, moves: arc.moves.slice(0, front.shown) }
}

/**
 * Measures the narrowest gap between the lockup and any loose piece at the
 * farthest its drift and its push carry it.
 */
function narrowest(laid: field.Field): number {
  const reach = { x: field.FIELD.drift.x + field.FIELD.push, y: field.FIELD.drift.y + field.FIELD.push }
  const size  = laid.plan.loose
  return Math.min(...looseOf(laid.placed()).flatMap(piece => laid.measure.parts.map(part => gapBetween({
    h : size + 2 * reach.y,
    w : size + 2 * reach.x,
    x : piece.hx - size / 2 - reach.x,
    y : piece.hy - size / 2 - reach.y
  }, part))))
}

describe('Field.placed on the settled pages', () => {
  it.each([['wide', 306], ['narrow', 127]] as const)('lays the settled field on the %s page', (page, n) => {
    expect(looseOf(fieldOf(measures[page]).placed())).toHaveLength(n)
  })

  it("places both games' pieces of every ply the oval shows after the loose pieces", () => {
    const motes = fieldOf(measures.wide).placed()
    const ids   = GAMES.flatMap(game => Array.from({ length: front.shown }, (_, k) => moteId(game, k)))
    expect(motes.slice(-ids.length).map(piece => piece.id)).toEqual(ids)
  })

  it('drifts every piece no farther than the settled drift across and down', () => {
    const { x, y } = field.FIELD.drift
    const motes    = fieldOf(measures.wide).placed()
    expect(Math.max(...motes.map(piece => piece.ax))).toBeLessThanOrEqual(x)
    expect(Math.max(...motes.map(piece => piece.ay))).toBeLessThanOrEqual(y)
    expect(Math.min(...motes.flatMap(piece => [piece.ax, piece.ay]))).toBeGreaterThan(0)
  })

  it("records each piece's home at its place among the homes taken", () => {
    const laid  = fieldOf(measures.wide)
    const motes = laid.placed()
    expect(motes.map(piece => laid.homes[piece.home])).toEqual(motes.map(piece => [piece.hx, piece.hy]))
  })

  it('repeats its layout for the same seed', () => {
    expect(fieldOf(measures.wide).placed()).toEqual(fieldOf(measures.wide).placed())
  })

  it.each(['wide', 'narrow'] as const)('keeps every two homes on the %s page apart enough to drift', page => {
    const laid = fieldOf(measures[page])
    expect(crowded(laid, laid.placed().map(piece => [piece.hx, piece.hy]))).toEqual([])
  })

  it.each(['wide', 'narrow'] as const)('keeps every loose piece on the %s page clear of the lockup', page => {
    expect(narrowest(fieldOf(measures[page]))).toBeGreaterThan(0)
  })

  it("cycles the stored game's other moves through the loose pieces", () => {
    const rest  = front.bot.moves.slice(front.shown).map(move => move.kind)
    const kinds = looseOf(fieldOf(measures.wide).placed()).map(piece => piece.kind)
    expect(kinds.slice(0, rest.length)).toEqual(rest)
  })
})

describe('Field.placed on made-up games', () => {
  it("follows the stored game's other moves with the line's past the oval", () => {
    const top   = { ...front.top, moves: [...front.top.moves, { kind: 'r' as const, san: 'Rd1' }] }
    const laid  = new field.Field(measures.wide, { ...front, top }, plan)
    const after = looseOf(laid.placed())[front.bot.moves.length - front.shown]!
    expect([after.kind, after.game]).toEqual(['r', 'top'])
  })

  it('lays no loose piece where neither game plays a move past the oval', () => {
    const oval = { ...front, bot: cut(front.bot), top: cut(front.top) }
    expect(looseOf(new field.Field(measures.wide, oval, plan).placed())).toEqual([])
  })
})

describe('Field.near', () => {
  it('falls back to the place itself where no spot is free', () => {
    const wall = { h: 5000, w: 5000, x: -2000, y: -2000 }
    const laid = new field.Field({ ...measures.wide, parts: [wall] }, front, plan)
    expect(laid.near([12, 34])).toEqual([12, 34])
  })
})

describe('Field.open and Field.free', () => {
  it.each([[2, 200], [1100, 200]])("refuses a spot at %d, %d too near the page's side", (x, y) => {
    expect(fieldOf(measures.wide).open([x, y])).toBe(false)
  })

  it('refuses a spot on the wordmark and takes one far below the lockup', () => {
    expect(fieldOf(measures.wide).open([551, 140])).toBe(false)
    expect(fieldOf(measures.wide).open([551, 900])).toBe(true)
  })

  it('refuses a spot on a place of the oval', () => {
    const laid = fieldOf(measures.wide)
    expect(laid.free(laid.plan.slots[0]!)).toBe(false)
  })
})
