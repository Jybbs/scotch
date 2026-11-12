import { clamp } from '@vueuse/core'

import rendered from '../rendered/tags.json' with { type: 'json' }

import type { CornerMark } from './corner.ts'
import * as numbers        from './numbers.ts'

/**
 * One cell of the grid of tags: the place of its column among `COLUMNS` and of
 * its tag among the names the index counts.
 */
export interface Carried {
  column : number
  tag    : number
}

/**
 * Where the two bands of dates and ratings and the decades beneath them sit at
 * a width.
 */
export interface DatedLayout {
  band   : number
  cell   : number
  height : number
  left   : number
  width  : number
}

/**
 * The games of one decade, or of every decade, missing one tag, beside the
 * files holding the most of them, the most first.
 */
export interface Gap {
  decade  : string
  files   : readonly Held[]
  missing : number
  tag     : string
}

/**
 * The games of one gap that one file holds, beside the file's path on the
 * provider's site.
 */
interface Held {
  count : number
  path  : string
}

/**
 * The games of one decade, or of every decade, by the precision of their
 * `Date` tag, by the ratings they carry, and by each tag they carry with a
 * value, beside their count and the decade's name.
 */
export interface TagCounts {
  dates   : { day: number, month: number, none: number, year: number }
  games   : number
  name    : string
  ratings : { both: number, neither: number, one: number }
  tags    : Readonly<Record<string, number>>
}

/**
 * The counts `scotch render docs` writes for the Tags page: each decade's,
 * every stored game's, each decade's gap in each tag, and the tags counted.
 */
export interface Tags {
  decades : readonly TagCounts[]
  every   : TagCounts
  gaps    : readonly Gap[]
  names   : readonly string[]
}

/**
 * The marks the grid of tags carries in its corner.
 */
export const CARRIED_MARKS: readonly CornerMark[] = [
  { key: 'gap', label: 'A gap, darker as more games leave the tag empty', tone: 'var(--sc-data-link)' },
  { key: 'carried', label: 'Carried by nearly every game', tone: 'var(--sc-data-held)' }
]
/**
 * The marks the bands of dates and ratings carry in its corner, the darkest
 * standing for a game dated to the day or rated on both sides.
 */
export const DATED_MARKS: readonly CornerMark[] = [
  { key: 'full', label: 'To the day, both ratings', tone: 'var(--sc-data-link)' },
  { key: 'part', label: 'To the month, one rating', tone: 'var(--sc-data-fill)' },
  { key: 'bare', label: 'The year alone or no date, neither rating', tone: 'var(--sc-data-tint)' }
]
/**
 * The share of a column's games missing a tag under which the grid draws the
 * tag as carried.
 */
const GAP = 0.005
/**
 * The counts the index holds, as `scotch render docs` last wrote them.
 */
export const TAGS: Tags = rendered
/**
 * The columns of the grid and the bands, each decade and then every stored
 * game.
 */
export const COLUMNS: readonly TagCounts[] = [...TAGS.decades, TAGS.every]

/**
 * Writes the sentence the grid of tags reads at one cell.
 */
export function carriedSentence(cell: Carried): string {
  const column = COLUMNS[cell.column]!
  const tag    = TAGS.names[cell.tag]!
  const gap    = gapOf(cell)
  const games  = column === TAGS.every ? 'stored games' : `games of the ${column.name}`
  const [most] = gap.files
  const files  = most ? `, the most of them in ${most.path}` : ''
  return `Of the ${numbers.counted(column.games)} ${games}, ${numbers.counted(gap.missing)} carry no `
       + `${tag} tag with a value${files}.`
}

/**
 * Steps a cell of the grid by a key, the left and right arrows moving between
 * the columns and the up and down arrows between the tags.
 *
 * Returns:
 *   The cell the key moves to, held to the grid, or `undefined` for a key the
 *   grid does not answer.
 */
export function carriedStepped(cell: Carried, key: string): Carried | undefined {
  const steps: Partial<Record<string, [number, number]>> = {
    ArrowDown  : [0, 1],
    ArrowLeft  : [-1, 0],
    ArrowRight : [1, 0],
    ArrowUp    : [0, -1]
  }
  const by = steps[key]
  if (!by) return undefined
  return {
    column : clamp(cell.column + by[0], 0, COLUMNS.length - 1),
    tag    : clamp(cell.tag + by[1], 0, TAGS.names.length - 1)
  }
}

/**
 * Finds the decade whose column a point `x` pixels across the bands falls in,
 * held to the decades drawn.
 */
export function datedAt(layout: DatedLayout, x: number): number {
  return clamp(Math.floor((x - layout.left) / layout.cell), 0, TAGS.decades.length - 1)
}

/**
 * Lays the two bands of dates and ratings out across `width`, a column per
 * decade, shorter on a phone.
 */
export function datedLayout(width: number): DatedLayout {
  const narrow = width < 480
  const band   = narrow ? 74 : 96
  const left   = narrow ? 50 : 70

  return {
    band   : band,
    cell   : Math.max(0, (width - left - 8) / TAGS.decades.length),
    height : 4 + 2 * band + 16 + 22,
    left   : left,
    width  : width
  }
}

/**
 * Splits a decade's games into the three tiers the bands draw, by the
 * precision of their date and by the ratings they carry.
 *
 * Returns:
 *   The share of the games in each tier, the fullest first, for the dates and
 *   then the ratings.
 */
export function datedParts(column: TagCounts): { dates: number[], ratings: number[] } {
  const { dates, games, ratings } = column
  return {
    dates   : [dates.day, dates.month, dates.year + dates.none].map(count => count / games),
    ratings : [ratings.both, ratings.one, ratings.neither].map(count => count / games)
  }
}

/**
 * Writes the sentence the bands read at one column.
 */
export function datedSentence(column: TagCounts): string {
  const { dates, ratings } = datedParts(column)
  const games               = column === TAGS.every ? 'stored games' : `games of the ${column.name}`
  return `Of the ${numbers.counted(column.games)} ${games}, ${numbers.percent(dates[0]!)} carry a date `
       + `naming the day and ${numbers.percent(ratings[0]!)} carry both ratings, while `
       + `${numbers.percent(ratings[2]!)} carry neither.`
}

/**
 * Finds the games of a cell's column missing its tag, beside the files holding
 * the most of them, which every stored game's column lists none of.
 */
export function gapOf(cell: Carried): Gap {
  const column = COLUMNS[cell.column]!
  const tag    = TAGS.names[cell.tag]!
  return TAGS.gaps.find(gap => gap.decade === column.name && gap.tag === tag)
    ?? { decade: column.name, files: [], missing: column.games - (column.tags[tag] ?? 0), tag }
}

/**
 * Reads whether a cell of the grid is a gap, its tag missing from at least
 * `GAP` of its column's games.
 */
export function isGap(cell: Carried): boolean {
  return missingShare(cell) >= GAP
}

/**
 * Reads the share of a cell's column missing its tag.
 */
export function missingShare(cell: Carried): number {
  const column = COLUMNS[cell.column]!
  return Math.max(0, 1 - (column.tags[TAGS.names[cell.tag]!] ?? 0) / column.games)
}
