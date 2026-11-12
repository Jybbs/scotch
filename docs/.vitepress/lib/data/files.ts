import rendered from '../rendered/files.json' with { type: 'json' }

import * as numbers   from './numbers.ts'
import type { Rank }  from './store.ts'

/**
 * The facts the card reads off one file: the share of its busiest decade each
 * decade's cell is shaded at, its games, an opening's moves, the files of its
 * section, its place among them by games, and the decades the scale under the
 * cells names beside the cell each one sits under.
 */
export interface Card {
  cells : number[]
  games : number
  moves : string[]
  of    : number
  rank  : number
  scale : (readonly [string, number])[]
}

/**
 * One file as the list draws it, its section and its file name without the
 * extension beside what `scotch render docs` wrote for it.
 */
export interface Entry {
  listed  : Listed
  section : Section
  stem    : string
}

/**
 * One file `sources.toml` declares, as `scotch render docs` writes it beside
 * the games the store holds from it: their count by the decade they were
 * played in, the path its address names under the host, the heading and the
 * name PGN Mentor's page gives it, the moves an opening's archive opens with,
 * its section, and the year the most of its games were played in.
 */
export interface Listed {
  decades : Readonly<Record<string, number | undefined>>
  file    : string
  games   : number
  group   : string | null
  moves   : string | null
  section : string
  title   : string
  year    : number | null
}

/**
 * A section of PGN Mentor's files page, in the order the file list's tabs name
 * them.
 */
export type Section = (typeof SECTIONS)[number]

/**
 * The hue each section's marks and its card's rail take, a series of the
 * palette apiece.
 */
export const HUES = {
  Events   : 'var(--sc-series-2)',
  Openings : 'var(--sc-series-3)',
  Players  : 'var(--sc-series-1)'
} as const
/**
 * The sentence each section's drawing carries beneath it.
 */
export const LEGENDS = {
  Events   : 'Each brick is one event file in the year most of its games were played, solid for a World '
           + 'Championship, half for a Candidates or an Interzonal, and light for a tournament.',
  Openings : 'Each band is a first move, then a reply, then the files under it, as wide as the games the '
           + 'store holds from them. Press a band to open it, and press it again to step back.',
  Players  : 'Each disc is one player’s archive, set at the mean year of its games and sized by the games '
           + 'the store holds from it.'
} as const
/**
 * Every file the list draws, as `scotch render docs` last wrote them.
 */
export const LISTED: readonly Listed[] = rendered
/**
 * The sections of PGN Mentor's files page, in the order the store reads them.
 */
export const SECTIONS = ['Players', 'Events', 'Openings'] as const

/**
 * Reads the card's facts for one entry against every entry and the decades the
 * cells span: a Players or an Openings file's cells shaded by the games of each
 * decade against its busiest, an event's one decade full, and an opening's
 * moves, beside its place among its section's files by games.
 */
export function cardOf(decades: readonly number[], entries: readonly Entry[], entry: Entry): Card {
  const counts = decades.map(decade => entry.listed.decades[String(decade)] ?? 0)
  const top    = Math.max(1, ...counts)
  const year   = entry.listed.year
  const cells  = entry.section === 'Events'
    ? decades.map(decade => year !== null && decade === Math.floor(year / 10) * 10 ? 1 : 0)
    : counts.map(count => count ? 0.18 + 0.82 * count / top : 0)
  const lit    = decades.filter((_, at) => cells[at])
  const ranked = sectionOf(entries, entry.section)
    .toSorted((a, b) => b.listed.games - a.listed.games || a.stem.localeCompare(b.stem))
  const named  = (decade: number, label: string): readonly [string, number] =>
    [label, decades.indexOf(decade)]
  const [low, high] = [lit[0], lit.at(-1)]

  return {
    cells : cells,
    games : entry.listed.games,
    moves : entry.section === 'Openings' ? (entry.listed.moves ?? '').split(/\s+/u).filter(Boolean) : [],
    of    : ranked.length,
    rank  : ranked.indexOf(entry),
    scale : low === undefined || high === undefined || entry.section === 'Openings'
      ? []
      : entry.section === 'Events' || low === high
        ? [named(low, entry.section === 'Events' ? String(year) : `${low}s`)]
        : [named(low, `${low}s`), named(high, `${high}s`)]
  }
}

/**
 * Lists the decades every file's games are counted in, from the earliest any
 * file holds games of to the latest.
 */
export function decadesOf(entries: readonly Entry[]): number[] {
  const held = entries.flatMap(entry => Object.keys(entry.listed.decades).map(Number))
  if (held.length === 0) return []
  const low  = Math.min(...held)
  return Array.from({ length: (Math.max(...held) - low) / 10 + 1 }, (_, step) => low + step * 10)
}

/**
 * Reads each listed file as an entry under its section, in the order they are
 * listed.
 */
export function entriesOf(listed: readonly Listed[] = LISTED): Entry[] {
  return listed.map(file => ({
    listed  : file,
    section : file.section as Section,
    stem    : (file.file.split('/').at(-1) ?? file.file).replace(/\.(?:zip|pgn)$/iu, '')
  }))
}

/**
 * Names what the card's sub line sets beside the path: a player's decades from
 * the first to the last, or the heading any other file is listed under.
 */
export function heading(entry: Entry): string {
  if (entry.section !== 'Players') return entry.listed.group ?? entry.section
  const decades = Object.keys(entry.listed.decades).map(Number).toSorted((a, b) => a - b)
  if (decades.length === 0) return 'Undated'
  return decades[0] === decades.at(-1) ? `${decades[0]}s` : `${decades[0]}s–${decades.at(-1)}s`
}

/**
 * Writes the line beneath the files the store keeps the most games from, naming
 * the files and the games where no row is picked and the picked row's games and
 * share otherwise.
 */
export function largestReading(count: number, picked: number | null, rows: readonly Rank[]): string {
  const total = numbers.summed(rows.map(row => row.games))
  if (picked === null) {
    return `Read from ${numbers.counted(count)} files · ${numbers.counted(total)} games indexed`
  }
  const { games, name } = rows[picked]!
  return `${name} · ${numbers.counted(games)} games · ${numbers.percent(games / total, 1)} of the store`
}

/**
 * Writes the sentence beside the count of every stored game, naming the files
 * it is read from and the share held by those the store keeps the most games
 * from.
 */
export function largestSummary(count: number, rows: readonly Rank[]): string {
  const top = rows.filter(row => !row.others)
  return `Games indexed from ${numbers.counted(count)} files, the top ${top.length} holding `
       + `${numbers.percent(top.at(-1)?.held ?? 0, 1)} of them and every other file the rest.`
}

/**
 * Checks whether an entry's file name or its name holds `query`, which the find
 * field lowers, every entry matching an empty one.
 */
export function matches(entry: Entry, query: string): boolean {
  return !query || [entry.stem, entry.listed.title].some(name => name.toLowerCase().includes(query))
}

/**
 * Finds the mean year of a file's games, each counted at the middle of its
 * decade, or `null` where none is dated.
 */
export function meanYear(listed: Listed): number | null {
  const counted = Object.entries(listed.decades)
    .map(([decade, games]) => [Number(decade) + 5, games ?? 0] as const)
  const games = numbers.summed(counted.map(([, count]) => count))
  return games ? numbers.summed(counted.map(([year, count]) => year * count)) / games : null
}

/**
 * Splits an opening's moves into the moves its archive opens with, leaving out
 * each move number, so `1.e4 c5 2.Nf3` reads `e4`, `c5`, and `Nf3`.
 */
export function movesOf(listed: Listed): string[] {
  return (listed.moves ?? '').replaceAll(',', ' ')
    .split(/\s+/u)
    .map(move => move.replace(/^\d+\.+/u, ''))
    .filter(Boolean)
}

/**
 * Finds the entry a section opens on: a file filed under one name in two
 * sections where its section holds one, so the card's tab shows the other,
 * otherwise the latest World Championship for Events, and the file holding the
 * most games for any other section.
 */
export function opening(entries: readonly Entry[], section: Section): Entry | undefined {
  const under = sectionOf(entries, section)
  const twin  = under.find(entry => twinOf(entries, entry))
  if (twin) return twin
  if (section !== 'Events') return under.toSorted((a, b) => b.listed.games - a.listed.games)[0]
  return under
    .filter(entry => entry.listed.group === 'World Championships')
    .toSorted((a, b) => (a.listed.year ?? 0) - (b.listed.year ?? 0))
    .at(-1) ?? under[0]
}

/**
 * Lists the entries of one section.
 */
export function sectionOf(entries: readonly Entry[], section: Section): Entry[] {
  return entries.filter(entry => entry.section === section)
}

/**
 * Finds the entry of another section filed under the same file name, such as
 * `openings/Bird.zip` beside `players/Bird.zip`, or `null` where none is.
 */
export function twinOf(entries: readonly Entry[], entry: Entry): Entry | null {
  return entries.find(other => other.section !== entry.section && other.stem === entry.stem) ?? null
}

/**
 * Reads the years the Players and Events drawings span, from five years before
 * the first decade `decades` holds to the end of the last.
 */
export function yearsOf(decades: readonly number[]): readonly [number, number] {
  return [(decades[0] ?? 1850) - 5, (decades.at(-1) ?? 2020) + 10]
}
