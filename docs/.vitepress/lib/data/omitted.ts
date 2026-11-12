import { clamp } from '@vueuse/core'

import rendered from '../rendered/omissions.json' with { type: 'json' }

import type { CornerMark } from './corner.ts'
import * as numbers        from './numbers.ts'

/**
 * Every Openings game by the decade it was played in and by the higher of its
 * two ratings: the lowest rating of each bin, the games of each decade in each
 * bin with the unrated games last, the decades, and the floor the store keeps
 * them at.
 */
export interface FloorCounts {
  bins    : readonly number[]
  counts  : readonly (readonly number[])[]
  decades : readonly string[]
  floor   : number
}


/**
 * Where the grid of decade by rating, the margin of each rating's games from
 * `edge` on, the strip of each decade's share kept, and the axis sit at a
 * width.
 */
export interface FloorLayout {
  cell   : number
  edge   : number
  gap    : number
  grid   : number
  height : number
  left   : number
  margin : number
  row    : number
  strip  : number
  width  : number
}


/**
 * What one floor keeps of the Openings games, and of each decade's.
 */
export interface Kept {
  decades : readonly number[]
  kept    : number
  total   : number
  under   : number
  unrated : number
}


/**
 * Why the index keeps or leaves out a game, as a key of `Tally`.
 */
export type Kind = (typeof KINDS)[number]['key']


/**
 * The counts `scotch render docs` writes for the Games Left Out page.
 */
export interface Omissions {
  files    : readonly Tally[]
  floor    : FloorCounts
  sections : readonly Tally[]
}

/**
 * One count the ledger draws as a segment: its kind and its section.
 */
export interface Segment {
  kind    : Kind
  section : string
}


/**
 * The games one section's files or one file holds, split into the games the
 * index keeps and the games it leaves out under each reason.
 */
export interface Tally {
  below   : number
  files   : number
  kept    : number
  name    : string
  repeat  : number
  section : string
  unread  : number
  variant : number
}


/**
 * The marks the grid of the rating floor carries in its corner.
 */
export const FLOOR_MARKS: readonly CornerMark[] = [
  { key: 'up',   label: 'At or above the floor', tone: 'var(--sc-data-link)' },
  { key: 'down', label: 'Under the floor',       tone: 'var(--sc-data-fill)' },
  { key: 'none', label: 'Rated on neither side', tone: 'var(--sc-data-tint)' },
  { key: null,   label: 'Darker, more games',    tone: 'var(--sc-data-ramp)' }
]
/**
 * The lowest floor the grid's floor drags to.
 */
const LOWEST = 1800
/**
 * The counts the index holds, as `scotch render docs` last wrote them.
 */
export const OMISSIONS: Omissions = rendered
/**
 * Each kind of count the ledger splits a section's games into, in the order its
 * bars draw them, beside its label and the word a segment wide enough to hold
 * it names its count with.
 */
export const KINDS = [
  { key: 'kept', label: 'Kept in the index', word: 'kept' },
  { key: 'below', label: `Under the ${numbers.counted(OMISSIONS.floor.floor)} floor`, word: 'under it' },
  { key: 'repeat', label: 'Repeats of a kept game', word: 'repeats' },
  { key: 'unread', label: 'Moves that cannot be read', word: 'unread' },
  { key: 'variant', label: 'Starting off the standard position', word: 'variants' }
] as const
/**
 * The floors the grid's floor drags between, every rated bin from `LOWEST` up.
 */
export const floors: readonly number[] = OMISSIONS.floor.bins.filter(low => low >= LOWEST)
/**
 * The marks the ledger carries in its corner, one per kind, each swatch taking
 * the color the ledger's stylesheet gives that kind.
 */
export const ledgerMarks: readonly CornerMark[] = KINDS.map(({ key, label }) => ({
  key   : key,
  label : label,
  tone  : `var(--sc-data-${key})`
}))
/**
 * Every segment the ledger draws, a section at a time and each section's kinds
 * in the order `KINDS` names them, leaving out a kind a section holds none of.
 */
export const segments: readonly Segment[] = OMISSIONS.sections.flatMap(ledger => KINDS
  .filter(({ key }) => ledger[key] > 0)
  .map(({ key }) => ({ kind: key, section: ledger.section })))

/**
 * Finds the floor a pointer at `y` pixels down the grid sets, the floor
 * standing on the edge between two rows of ratings nearest the pointer, held
 * between the floors `floors` names.
 */
export function floorAt(layout: FloorLayout, y: number, counts: FloorCounts = OMISSIONS.floor): number {
  const edge = clamp(Math.round(y / layout.row), 1, counts.bins.length)
  const low  = counts.bins[counts.bins.length - edge]!
  return clamp(low, floors[0]!, floors.at(-1)!)
}

/**
 * Lays the grid of the rating floor out across `width`, a row per rating bin
 * with the highest on top and the unrated row apart beneath them, a margin of
 * each row's games beside the grid, and the strip of each decade's share kept
 * beneath it, narrower on a phone.
 */
export function floorLayout(width: number, counts: FloorCounts = OMISSIONS.floor): FloorLayout {
  const narrow = width < 480
  const left   = narrow ? 52 : 62
  const margin = narrow ? 46 : 92
  const row    = narrow ? 14 : 16
  const gap    = 10
  const grid   = (counts.bins.length + 1) * row + gap
  const strip  = 30
  const cell   = Math.max(0, (width - left - margin - 10) / counts.decades.length)

  return {
    cell   : cell,
    edge   : left + counts.decades.length * cell + 10,
    gap    : gap,
    grid   : grid,
    height : grid + strip + 22,
    left   : left,
    margin : margin,
    row    : row,
    strip  : strip,
    width  : width
  }
}

/**
 * Writes the sentence the grid of the rating floor reads at one floor.
 */
export function floorSentence(floor: number, kept: Kept): string {
  return `At a floor of ${numbers.counted(floor)}, the index keeps ${numbers.counted(kept.kept)} of the `
       + `${numbers.counted(kept.total)} Openings games dated to a decade, leaving out `
       + `${numbers.counted(kept.under)} under the floor and ${numbers.counted(kept.unrated)} rated on `
       + 'neither side.'
}

/**
 * Finds the files of one section holding games of one kind, the most first,
 * each as its path on the provider's site beside its count.
 */
export function holding(
  kind    : Kind,
  section : string,
  files   : readonly Tally[] = OMISSIONS.files
): [string, number][] {
  return files
    .filter(file => file.section === section && file[kind] > 0)
    .map((file): [string, number] => [file.name, file[kind]])
    .toSorted((one, other) => other[1] - one[1])
}

/**
 * Counts what a floor keeps of the Openings games, a game kept where the
 * higher of its ratings reaches the floor and the unrated games, counted last
 * in each decade, never kept.
 */
export function keptAt(floor: number, counts: FloorCounts = OMISSIONS.floor): Kept {
  const reaching = counts.bins.map(low => low >= floor)
  const decades  = counts.counts.map(row => numbers.summed(row.filter((_, bin) => reaching[bin])))
  const total    = numbers.summed(counts.counts.map(row => numbers.summed(row)))
  const unrated  = numbers.summed(counts.counts.map(row => row.at(-1)!))
  const kept     = numbers.summed(decades)

  return { decades, kept, total, under: total - kept - unrated, unrated }
}

/**
 * Writes the sentence the ledger reads for the count of one kind in one
 * section.
 */
export function ledgerSentence(kind: Kind, ledger: Tally): string {
  const count = numbers.counted(ledger[kind])
  const of    = `of the ${numbers.counted(readOf(ledger))} games ${sectionFiles(ledger.section)} hold`
  const says  = {
    below   : `are rated under the ${numbers.counted(OMISSIONS.floor.floor)} floor on both sides`,
    kept    : 'reach the index',
    repeat  : 'repeat a game the index already keeps from another file',
    unread  : 'hold moves the reader cannot play',
    variant : 'start from a position other than the standard one'
  }

  return `${count} ${of} ${says[kind]}.`
}

/**
 * Shades a count of games against the largest count of the grid on a log
 * scale, so a cell holding one game stays visible beside one holding a
 * hundred thousand, 0 for an empty cell and 1 for the largest.
 */
export function levelOf(count: number, most: number): number {
  return Math.log10(count + 1) / Math.log10(most + 1)
}

/**
 * Counts the games a section's files or a file holds, kept or left out.
 */
export function readOf(ledger: Tally): number {
  return numbers.summed(KINDS.map(({ key }) => ledger[key]))
}

/**
 * Names a section's files in the sentence the ledger reads, the Events
 * section's as files and every other as archives.
 */
export function sectionFiles(section: string): string {
  return `the ${section} ${section === 'Events' ? 'files' : 'archives'}`
}

/**
 * Finds the place among `segments` of the segment `step` segments past a
 * cell, held at the first and the last.
 */
export function segmentPast(cell: Segment, step: number): number {
  const at = segments.findIndex(({ kind, section }) => kind === cell.kind && section === cell.section)
  return clamp(at + step, 0, segments.length - 1)
}
