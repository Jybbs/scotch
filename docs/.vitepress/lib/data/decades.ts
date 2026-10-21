import { DRAWINGS } from '../site/pieces.ts'
import * as numbers from './numbers.ts'
import { STORE }    from './store.ts'

/**
 * One cell of the strip, its short label under the axis, the name a reading
 * gives it, the dated games played in it, and the decade it holds, which the
 * first cell, gathering every earlier decade, leaves out.
 */
interface Decade {
  games   : number
  label   : string
  name    : string
  decade? : number
}

/**
 * The strip's cells, the dated games they hold together, the running total of
 * those games up to each cell, and the cells holding the first quarter, the
 * median, and the third quarter of them.
 */
export interface Strip {
  dated     : number
  decades   : Decade[]
  held      : number[]
  quartiles : [number, number, number]
}

/**
 * Where the strip's cells are drawn at a width, each cell starting on a whole
 * pixel, beside the strip's whole width and height and the band the cells fill.
 */
export interface StripLayout {
  band   : { height: number, top: number }
  height : number
  starts : number[]
  width  : number
}

/**
 * The first decade the strip gives a cell of its own and the rating list's
 * curves draw a point for, the games of every earlier decade sharing the
 * strip's first cell and drawing no point.
 */
export const FIRST_CELL = 1850
/**
 * The decades the axes of the strip and the rating list name besides the first,
 * the strip's axis naming its last cell as well.
 */
export const NAMED = [1900, 1950, 2000] as const
/**
 * The narrowest a cell is drawn on whole pixels, below which every cell takes a
 * share of a pixel.
 */
const NARROWEST = 8
/**
 * The outline of the white pawn python-chess draws on its 45-unit square, which
 * marks the median decade.
 */
export const pawn = /\sd="([^"]+)"/u.exec(DRAWINGS.P)![1]!

/**
 * Names the decades holding the first quarter, the median, and the third
 * quarter of the dated games.
 */
function quartileNames(strip: Strip): string[] {
  return strip.quartiles.map(index => strip.decades[index]!.name)
}

/**
 * Finds the middle of a cell, on a whole pixel.
 */
export function cellMiddle(layout: StripLayout, index: number): number {
  const [start, end] = [layout.starts[index]!, layout.starts[index + 1]!]
  return start + Math.floor((end - start) / 2)
}

/**
 * Finds the width a cell is drawn at, a pixel short of where the next cell
 * starts and never below 0.
 */
export function cellWidth(layout: StripLayout, index: number): number {
  return Math.max(0, layout.starts[index + 1]! - layout.starts[index]! - 1)
}

/**
 * Writes the transform that stands the outline `pawn` holds on a baseline at
 * `base`, centered on `x` and `height` tall.
 */
export function pawnAt(x: number, base: number, height = 16): string {
  const scale = height / 31.5
  const left  = (x - 22.5 * scale).toFixed(2)
  const top   = (base - 40 * scale).toFixed(2)
  return `translate(${left} ${top}) scale(${scale.toFixed(4)})`
}

/**
 * Lays the strip out across a width, spacing the cells on whole pixels where
 * each can take at least the narrowest width and at a share of a pixel below
 * that, every edge rounded to a whole pixel.
 */
export function stripLayout(count: number, width: number): StripLayout {
  const pitch = width >= NARROWEST * count ? Math.floor(width / count) : width / count
  const band  = { height: 22, top: 30 }

  return {
    band   : band,
    height : band.top + band.height + 26,
    starts : Array.from({ length: count + 1 }, (_, index) => Math.round(index * pitch)),
    width  : Math.round(pitch * count)
  }
}

/**
 * Builds the strip from the games each decade holds, the games of every decade
 * before `first` gathered into one cell.
 */
export function stripOf(store = STORE, first = FIRST_CELL): Strip {
  const early   = store.eras.filter(era => era.decade < first)
  const decades = [
    {
      games : numbers.summed(early.flatMap(era => era.moves)),
      label : `<${first}`,
      name  : `Before ${first}`
    },
    ...store.eras
      .filter(era => era.decade >= first)
      .map(era => ({ decade: era.decade, games: numbers.summed(era.moves), label: era.name, name: era.name }))
  ]
  const held = numbers.accumulated(decades.map(decade => decade.games))

  return { dated: held.at(-1)!, decades, held, quartiles: numbers.quartiles(held) }
}

/**
 * Writes the line beneath the strip, counting the dated games and naming the
 * decades holding each quarter where no cell is picked, and otherwise naming
 * the picked cell, its games, and the share of the dated games played by its
 * end.
 */
export function stripReading(strip: Strip, picked: number | null): string {
  const [first, middle, third] = quartileNames(strip)
  if (picked === null) {
    return `${numbers.counted(strip.dated)} dated games · quartiles in the ${first}, ${middle}, and ${third}`
  }
  const decade = strip.decades[picked]!
  const share  = numbers.percent(strip.held[picked]! / strip.dated, 1)
  return `${decade.name} · ${numbers.counted(decade.games)} games · ${share} played by its end`
}

/**
 * Writes the sentence beside the strip's median decade, naming the decade by
 * whose end half of the dated games were played and the decades holding the
 * middle half.
 */
export function stripSummary(strip: Strip): string {
  const [first, middle, third] = quartileNames(strip)
  return `Half of the stored games with a known date were played by the end of the ${middle}, `
       + `and the middle half between the ${first} and the ${third}.`
}

/**
 * Finds the cells the axis names, meaning the first, each decade `NAMED` holds,
 * and the last.
 */
export function stripTicks(strip: Strip): number[] {
  const named = NAMED.map(decade => strip.decades.findIndex(cell => cell.decade === decade))
  return [...new Set([0, ...named.filter(index => index > 0), strip.decades.length - 1])]
}
