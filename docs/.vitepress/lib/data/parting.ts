import { clamp } from '@vueuse/core'

import rendered from '../rendered/shared.json' with { type: 'json' }

import type { CornerMark } from './corner.ts'
import { stepped }         from './keys.ts'
import * as numbers        from './numbers.ts'

/**
 * One opening line the stored games play from the start: the games playing it,
 * the placement it reaches, the games reaching that placement by any order of
 * moves, and its moves in SAN.
 */
export interface OpeningLine {
  games     : number
  placement : string
  reach     : number
  sans      : readonly string[]
}

/**
 * How one set of stored games parts from the rest, move by move: the games
 * first standing alone at each move, the games in the set, the move half of
 * them stand alone by, its name, and the games still playing and still
 * sharing a position at each move.
 */
export interface Parting {
  alone   : readonly number[]
  games   : number
  half    : number
  name    : string
  playing : readonly number[]
  sharing : readonly number[]
}

/**
 * One cell of the grid of each decade's parting: the place of its decade among
 * the decades, the topmost first, and its move.
 */
export interface PartingCell {
  decade : number
  move   : number
}

/**
 * Where the line of the share still sharing, the strip of the games parting at
 * each move beneath it, and the axis of moves sit at a width.
 */
export interface PartingLayout {
  base   : number
  height : number
  left   : number
  plot   : number
  strip  : number
  tall   : number
  top    : number
  width  : number
}

/**
 * Where the grid of each decade's share still sharing and the line of the
 * decade picked beneath it sit at a width.
 */
export interface PartingsLayout {
  cell   : number
  grid   : number
  height : number
  left   : number
  line   : number
  row    : number
  tall   : number
  width  : number
}

/**
 * The counts `scotch render docs` writes for the Shared Positions page: the
 * reach past which a position is crowded, each decade's parting and every
 * stored game's, and the opening lines the most stored games play.
 */
export interface Shared {
  crowd   : number
  decades : readonly Parting[]
  every   : Parting
  lines   : readonly OpeningLine[]
}

/**
 * The last move the charts of the page draw.
 */
export const LAST_MOVE = 40
/**
 * The moves the axis beneath each chart names.
 */
export const MOVE_TICKS = [0, 10, 20, 30, 40] as const
/**
 * The marks the grid of each decade's parting carries in its corner.
 */
export const PARTINGS_MARKS: readonly CornerMark[] = [
  { key: null, label: 'Darker, more still sharing', tone: 'var(--sc-data-ramp)' },
  { glyph: '|', key: 'half', label: 'Half alone by', tone: 'var(--sc-data-ink)' },
  { key: 'decade', label: 'The decade picked', tone: 'var(--sc-data-link)' },
  { key: 'every', label: 'Every stored game', tone: 'var(--sc-data-fill)' }
]
/**
 * The marks the chart of every stored game's parting carries in its corner.
 */
export const PARTING_MARKS: readonly CornerMark[] = [
  { key: 'sharing', label: 'Still sharing a position', tone: 'var(--sc-data-link)' },
  { key: 'alone', label: 'Standing alone from that move', tone: 'var(--sc-data-bar)' },
  { glyph: '|', key: 'half', label: 'Half alone by', tone: 'var(--sc-data-ink)' }
]
/**
 * The counts the index holds, as `scotch render docs` last wrote them.
 */
export const SHARED: Shared = rendered

/**
 * Reads the share of a set's games first standing alone at a move.
 */
export function aloneAt(parting: Parting, move: number): number {
  return parting.alone[move]! / parting.games
}

/**
 * Finds the move by which a share of a set's games stand alone, or `null` where
 * that share of them still shares a position at the last move drawn.
 */
export function aloneBy(parting: Parting, share: number): number | null {
  const parted = numbers.summed(parting.alone)
  const at     = numbers.reaching(numbers.accumulated([...parting.alone, parting.games - parted]), share)
  return at < parting.alone.length ? at : null
}

/**
 * Finds the cell of the grid a point `x` pixels across and `y` pixels down
 * stands in, a point under the grid keeping the decade of `cell` and taking
 * the move above it, held to the decades and the moves drawn.
 */
export function cellNear(
  cell    : PartingCell,
  layout  : PartingsLayout,
  x       : number,
  y       : number,
  decades : number = SHARED.decades.length
): PartingCell {
  return {
    decade : y < layout.grid ? clamp(Math.floor(y / layout.row), 0, decades - 1) : cell.decade,
    move   : clamp(Math.floor((x - layout.left) / layout.cell), 0, LAST_MOVE)
  }
}

/**
 * Steps a cell of the grid by a key, the up and down arrows moving between the
 * decades and every key `stepped` answers moving along the moves.
 *
 * Returns:
 *   The cell the key moves to, or `undefined` for a key the grid does not
 *   answer.
 */
export function cellStepped(
  cell    : PartingCell,
  key     : string,
  decades : number = SHARED.decades.length
): PartingCell | undefined {
  const rows: Partial<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 }
  const by = rows[key]
  if (by !== undefined) return { decade: clamp(cell.decade + by, 0, decades - 1), move: cell.move }
  const move = stepped(LAST_MOVE, key, 0, cell.move, false)
  return move === undefined ? undefined : { decade: cell.decade, move }
}

/**
 * Finds the pixel across the grid the middle of a move's column stands at.
 */
export function columnOn(layout: Pick<PartingsLayout, 'cell' | 'left'>, move: number): number {
  return layout.left + (move + 0.5) * layout.cell
}

/**
 * Writes the moves the middle half of a set's games part between, a dash
 * standing for a share they never reach by the last move drawn.
 */
export function middleHalf(parting: Parting): string {
  const [first, last] = [aloneBy(parting, 0.25), aloneBy(parting, 0.75)]
  return `${first ?? '–'} to ${last ?? '–'}`
}

/**
 * Finds the move nearest a point `x` pixels across a chart whose plot starts
 * at `left` and runs `plot` pixels, held to the moves drawn.
 */
export function moveNear(layout: Pick<PartingLayout, 'left' | 'plot'>, x: number): number {
  return clamp(Math.round((x - layout.left) / layout.plot * LAST_MOVE), 0, LAST_MOVE)
}

/**
 * Finds the pixel across a chart a move stands at.
 */
export function moveOn(layout: Pick<PartingLayout, 'left' | 'plot'>, move: number): number {
  return layout.left + move / LAST_MOVE * layout.plot
}

/**
 * Lays the line of every stored game's share still sharing across `width`, the
 * strip of the games parting at each move beneath it, shorter on a phone.
 */
export function partingLayout(width: number): PartingLayout {
  const left = 40
  const tall = width < 480 ? 150 : 210
  const top  = 14

  return {
    base   : top + tall + 14 + 40,
    height : top + tall + 14 + 40 + 22,
    left   : left,
    plot   : Math.max(0, width - left - 14),
    strip  : 40,
    tall   : tall,
    top    : top,
    width  : width
  }
}

/**
 * Writes the sentence the chart of every stored game's parting reads at a move.
 */
export function partingSentence(move: number, parting: Parting = SHARED.every): string {
  return `At move ${move}, ${numbers.percent(sharingAt(parting, move))} of the stored games still playing `
       + 'stand in a position another stored game reaches, and '
       + `${numbers.percent(aloneAt(parting, move), 1)} of every stored game first stands alone there.`
}

/**
 * Lays the grid of each decade's share still sharing across `width`, a row per
 * decade and a column per move, and the line of the decade picked beneath it.
 */
export function partingsLayout(width: number, decades: number = SHARED.decades.length): PartingsLayout {
  const narrow = width < 480
  const left   = narrow ? 70 : 80
  const row    = narrow ? 13 : 16
  const tall   = narrow ? 110 : 140
  const grid   = decades * row

  return {
    cell   : Math.max(0, (width - left - 14) / (LAST_MOVE + 1)),
    grid   : grid,
    height : grid + 26 + tall + 22,
    left   : left,
    line   : grid + 26,
    row    : row,
    tall   : tall,
    width  : width
  }
}

/**
 * Writes the sentence the grid of each decade's parting reads at a decade and
 * a move.
 */
export function partingsSentence(move: number, parting: Parting): string {
  return `Half the games of the ${parting.name} stand alone by move ${parting.half}, the middle half `
       + `parting between moves ${middleHalf(parting).replace(' to ', ' and ')}, and at move ${move}, `
       + `${numbers.percent(sharingAt(parting, move))} of them still share a position.`
}

/**
 * Reads the share of a set's games still playing at a move that stand in a
 * position another stored game reaches, 0 where none still play.
 */
export function sharingAt(parting: Parting, move: number): number {
  const playing = parting.playing[move]!
  return playing ? parting.sharing[move]! / playing : 0
}
