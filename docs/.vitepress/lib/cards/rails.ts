import { mix }    from '../identity/colors.ts'
import { smooth } from '../motion/timing.ts'

/**
 * What the rails draw: the column the run opens on and how many columns it
 * holds, the colors of the two games, the run's color on a light column and on
 * a dark one, and the shade a game's square on a dark column is darkened
 * toward, beside how many columns the rails hold in all.
 */
export interface Rails {
  colors   : { run: readonly [string, string], shade: string, stored: string, submitted: string }
  length   : number
  start    : number
  columns? : number
}

/**
 * One square of the rails, its place and size in the rails' own units, which
 * run `RAILS.width` across, and the color it is filled in.
 */
interface Square {
  fill : string
  size : number
  x    : number
  y    : number
}

/**
 * How the rails are drawn in their own units: the columns over which the two
 * rails close and open, the columns they hold, the share of a column a square
 * fills, the height their center line sits at, the share a square shrinks by as
 * the two rails close, how far each game's squares stand from the center line
 * away from the run, the percent of a game's color a square on a dark column
 * keeps against the shade, and the width they span.
 */
export const RAILS = {
  close   : 3,
  columns : 24,
  fill    : 0.84,
  middle  : 64,
  shrink  : 0.45,
  spread  : 46,
  step    : 76,
  width   : 1000
} as const

/**
 * Reads how far the two rails have closed at a column, from 0 where they stand
 * apart to 1 through the run, easing shut over the columns before the run and
 * open again over the columns after it.
 */
export function merged(column: number, { length, start }: Pick<Rails, 'length' | 'start'>): number {
  const part = start + length
  if (column < start) return smooth((column - start + RAILS.close) / RAILS.close)
  return column < part ? 1 : 1 - smooth((column - part + 1) / RAILS.close)
}

/**
 * Lays out the rails as squares across `RAILS.columns` unless told otherwise,
 * the stored game's above the center line and the submitted game's below it,
 * drawing in toward one square per column through the run, a game's square on
 * every second column darkened toward the shade, and a run square on such a
 * column taking the run's color for a dark column.
 */
export function squares({ colors, columns = RAILS.columns, ...run }: Rails): Square[] {
  const width = RAILS.width / columns
  const full  = width * RAILS.fill
  const edge  = (width - full) / 2

  return Array.from({ length: columns }, (_, column) => {
    const share = merged(column, run)
    const dark  = column % 2 === 1
    const x     = column * width + edge
    const lead  = colors.run[Number(dark)]!
    const tone  = (color: string): string => dark ? mix(color, RAILS.step, colors.shade, 'srgb') : color

    if (share >= 0.999) return [{ fill: lead, size: full, x, y: RAILS.middle - full / 2 }]

    const size = full * (1 - RAILS.shrink * share)
    const lift = Math.max(RAILS.spread * (1 - share), size / 2 + 1.5)
    return [
      { fill: tone(colors.stored), size, x: x + (full - size) / 2, y: RAILS.middle - lift - size / 2 },
      { fill: tone(colors.submitted), size, x: x + (full - size) / 2, y: RAILS.middle + lift - size / 2 }
    ]
  }).flat()
}
