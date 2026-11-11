import { type Entry, meanYear, movesOf } from './files.ts'
import * as numbers                      from './numbers.ts'

/**
 * A band of the Openings drawing between two places along every game the
 * section holds, its label, the band above it, and, on the last level, the
 * file it stands for.
 */
export interface Band {
  from    : number
  label   : string
  to      : number
  entry?  : Entry
  parent? : Band
}

/**
 * The Openings drawing's three levels, each first move, each reply under one,
 * and each file under a reply, beside the games they all hold.
 */
export interface Bands {
  files   : Band[]
  firsts  : Band[]
  replies : Band[]
  total   : number
}

/**
 * One Events file's brick: the box's corner and its size.
 */
interface Brick {
  height : number
  width  : number
  x      : number
  y      : number
}

/**
 * One Players archive's disc: its center and its radius.
 */
interface Disc {
  r : number
  x : number
  y : number
}

/**
 * The first and last year a drawing's axis spans.
 */
export type Years = readonly [number, number]

/**
 * The widths the drawings leave for their axis and their sides, in pixels,
 * beside the gap the swarm leaves between two discs, the scale it shrinks every
 * disc by while it rises too high, and the least scale it shrinks them to.
 */
export interface Layout {
  axis   : number
  gap    : number
  least  : number
  shrink : number
  side   : number
}

/**
 * A mark of a drawing at a box's pixels, the entry it stands for beside how
 * far the reveal lifts it from and the delay it enters after, in milliseconds.
 */
export interface Mark<Box> {
  box   : Box
  delay : number
  entry : Entry
  rise  : number
}

/**
 * The height of the axis the Players and Events drawings stand on, its labels
 * included, the gap the drawings leave at each side, and how the swarm spaces
 * and shrinks its discs.
 */
const LAYOUT: Layout = { axis: 26, gap: 0.7, least: 0.3, shrink: 0.92, side: 14 }
/**
 * The shade an Events file's brick takes by the heading PGN Mentor's page lists
 * it under, a tournament's where the heading names neither of the others.
 */
const STRENGTHS: Readonly<Record<string, number>> = {
  'Candidates and Interzonals' : 0.66,
  'Tournaments'                : 0.36,
  'World Championships'        : 1
}

/**
 * Groups entries by the move at `at` of their moves, busiest first.
 */
function grouped(under: readonly Entry[], at: number): { files: Entry[], games: number, move: string }[] {
  return [...Map.groupBy(under, entry => movesOf(entry.listed)[at] ?? '')]
    .map(([move, files]) => ({ files, games: numbers.summed(files.map(file => file.listed.games)), move }))
    .toSorted((a, b) => b.games - a.games)
}

/**
 * Lays the Openings out along every game they hold, each first move's band the
 * width of the games its files hold and the busiest first, each reply's band
 * beneath its first move's the same way, and each file beneath its reply, the
 * file holding the most games first.
 */
export function bandsOf(openings: readonly Entry[]): Bands {
  const bands: Bands = { files: [], firsts: [], replies: [], total: 0 }

  for (const first of grouped(openings, 0)) {
    const band: Band = { from: bands.total, label: `1.${first.move}`, to: 0 }
    for (const reply of grouped(first.files, 1)) {
      const label       = reply.move ? `1…${reply.move}` : '…'
      const under: Band = { from: bands.total, label, parent: band, to: 0 }
      for (const entry of reply.files.toSorted((a, b) => b.listed.games - a.listed.games)) {
        const from = bands.total
        bands.total += entry.listed.games
        bands.files.push({ entry, from, label: entry.stem, parent: under, to: bands.total })
      }
      under.to = bands.total
      bands.replies.push(under)
    }
    band.to = bands.total
    bands.firsts.push(band)
  }

  return bands
}

/**
 * Reads where a place along the Openings falls across a width, for the stretch
 * `domain` shows.
 */
export function bandX(domain: readonly [number, number], width: number, at: number, layout = LAYOUT): number {
  return layout.side + (at - domain[0]) / Math.max(1, domain[1] - domain[0]) * (width - 2 * layout.side)
}

/**
 * Stacks each Events file as a brick in the year the most of its games were
 * played, a World Championship lowest, then a Candidates or an Interzonal, then
 * a tournament, each shaded by the heading its file is listed under. A file
 * with no dated game takes no brick.
 */
export function bricks(
  events : readonly Entry[],
  height : number,
  width  : number,
  years  : Years,
  layout : Layout = LAYOUT
): (Mark<Brick> & { shade: number })[] {
  const column  = (width - 2 * layout.side) / (years[1] - years[0])
  const dated   = events.filter(entry => entry.listed.year !== null)
  const piled   = Map.groupBy(dated, entry => entry.listed.year ?? 0)
  const tallest = Math.max(1, ...[...piled.values()].map(pile => pile.length))
  const tall    = Math.min(8, (height - layout.axis - 14) / tallest)

  return [...piled].toSorted(([a], [b]) => a - b).flatMap(([year, pile]) => pile
    .toSorted((a, b) => shadeOf(b) - shadeOf(a) || a.stem.localeCompare(b.stem))
    .map((entry, place) => ({
      box   : {
        height : tall - 0.8,
        width  : Math.max(1, column - 0.6),
        x      : yearX(width, years, year, layout),
        y      : height - layout.axis - 1 - (place + 1) * tall
      },
      delay : Math.round((year - years[0]) * 5 + place * 8),
      entry : entry,
      rise  : tall * 3,
      shade : shadeOf(entry)
    })))
}

/**
 * Lists the years the axis beneath the Players and Events drawings names, each
 * half century it spans.
 */
export function namedYears(years: Years): number[] {
  const first = Math.ceil(years[0] / 50) * 50
  return Array.from({ length: Math.floor((years[1] - first) / 50) + 1 }, (_, step) => first + step * 50)
}

/**
 * Reads the shade an Events file's brick takes.
 */
export function shadeOf(entry: Entry): number {
  return STRENGTHS[entry.listed.group ?? ''] ?? 0.36
}

/**
 * Sets each Players archive's disc at the mean year of its games, sized by the
 * games the store holds, the largest placed first and each later one moved up
 * or down half a pixel at a time until it overlaps none placed before it, every
 * radius shrunk while the swarm would rise past the drawing's half height. An
 * archive with no dated game takes no disc.
 */
export function swarm(
  height  : number,
  players : readonly Entry[],
  width   : number,
  years   : Years,
  layout  : Layout = LAYOUT
): Mark<Disc>[] {
  const base = (height - layout.axis - 2) / 2
  const most = Math.max(1, ...players.map(entry => entry.listed.games))
  const laid = (scale: number): Mark<Disc>[] => {
    const placed: Mark<Disc>[] = []
    const discs  = players.flatMap(entry => {
      const year = meanYear(entry.listed)
      if (year === null) return []
      const r = (1.5 + 5 * Math.sqrt(entry.listed.games / most)) * scale
      return [{ entry, r, x: yearX(width, years, year, layout) }]
    }).toSorted((a, b) => b.r - a.r)

    for (const { entry, r, x } of discs) {
      let y         = base
      const crowded = (): boolean =>
        placed.some(({ box }) => Math.hypot(box.x - x, box.y - y) < box.r + r + layout.gap)
      for (let step = 1; crowded(); step++) y = base + (step % 2 ? 1 : -1) * Math.ceil(step / 2) * 0.5
      placed.push({ box: { r, x, y }, delay: Math.round(x / width * 900), entry, rise: base - y })
    }

    return placed
  }

  let scale   = Math.min(1, Math.sqrt(width / 688))
  let placed  = laid(scale)
  const risen = (): boolean => placed.some(({ box }) => Math.abs(box.y - base) + box.r > base - 4)
  while (scale > layout.least && risen()) placed = laid(scale *= layout.shrink)
  return placed.toSorted((a, b) => a.box.x - b.box.x)
}

/**
 * Names the stretch the Openings drawing shows, from every opening to the
 * first move and the reply that fill it.
 */
export function trail(bands: Bands, domain: readonly [number, number]): string {
  const holds = (band: Band): boolean => band.from <= domain[0] && band.to >= domain[1]
  const first = domain[1] - domain[0] < bands.total ? bands.firsts.find(holds) : undefined
  const reply = bands.replies.find(band => band.from === domain[0] && band.to === domain[1])
  return ['All openings', first?.label, reply?.label].filter(Boolean).join('  ›  ')
}

/**
 * Reads where a year falls across a drawing's width.
 */
export function yearX(
  width  : number,
  years  : Years,
  year   : number,
  layout : Layout = LAYOUT
): number {
  return layout.side + (year - years[0]) / (years[1] - years[0]) * (width - 2 * layout.side)
}

/**
 * Reads the stretch a press of a band opens, which is the band itself, or the
 * band above it where it already fills the drawing, or every game from the top.
 */
export function zoomed(bands: Bands, band: Band, domain: readonly [number, number]): [number, number] {
  if (domain[0] !== band.from || domain[1] !== band.to) return [band.from, band.to]
  return band.parent ? [band.parent.from, band.parent.to] : [0, bands.total]
}
