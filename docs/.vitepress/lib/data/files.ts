import { FIRST_CELL, NAMED }              from './decades.ts'
import * as numbers                       from './numbers.ts'
import { type Archive, type Rank, STORE } from './store.ts'

/**
 * One archive of the store as the rating list shows it: the player it is named
 * for, the address it is fetched from, the games the store holds from it, and
 * those games counted by decade.
 */
export type Player = Archive

/**
 * The decades a player's curve runs across, from the first decade at or past
 * `FIRST_CELL` the store holds games of to the last.
 */
export interface Span {
  high : number
  low  : number
}

/**
 * The box each player's curve is drawn on, in the units of its `viewBox`.
 */
export const CURVE = { height: 22, width: 120 } as const
/**
 * The years the axis beneath the curves names where the span reaches them, the
 * first decade the curves draw a point for and each one `NAMED` holds.
 */
export const MARKED = [FIRST_CELL, ...NAMED] as const

/**
 * Reads a player's initial, the first letter of the name the archive is filed
 * under.
 */
function initialOf(player: Player): string {
  return player.name.charAt(0).toUpperCase()
}

/**
 * Finds the initial whose archives hold the most games, which the rating list
 * opens on.
 */
export function busiest(players: readonly Player[]): string {
  const filed = Map.groupBy(players, player => initialOf(player))
  const games = (initial: string): number => numbers.summed(filed.get(initial)!.map(player => player.games))
  return [...filed.keys()].reduce((best, initial) => games(initial) > games(best) ? initial : best)
}

/**
 * Writes the outline of a player's curve on the box `CURVE` sets, one point per
 * decade of `span` at the height the player's games of that decade reach
 * against the busiest decade the span draws, the line alone where `closed` is
 * false and closed along the box's foot otherwise.
 */
export function curvePath(player: Player, span: Span, closed = false): string {
  const decades = Array.from({ length: (span.high - span.low) / 10 + 1 }, (_, step) => span.low + step * 10)
  const games   = decades.map(decade => player.decades[String(decade)] ?? 0)
  const top     = Math.max(1, ...games)
  const points  = decades.map((decade, step): [number, number] => [
    yearAt(span, decade) * CURVE.width / 100,
    CURVE.height - 0.5 - games[step]! / top * 18.5
  ])
  const foot = [[CURVE.width, CURVE.height], [0, CURVE.height]] as const

  return numbers.pathThrough(points, closed ? foot : undefined)
}

/**
 * Finds the decades the curves run across in the store.
 */
export function curveSpan(store = STORE, earliest = FIRST_CELL): Span {
  const decades = store.eras.map(era => era.decade)
  return { high: Math.max(...decades), low: decades.find(decade => decade >= earliest) ?? earliest }
}

/**
 * Lists the initials the archives are filed under, in alphabetical order.
 */
export function initialsOf(players: readonly Player[]): string[] {
  return [...new Set(players.map(player => initialOf(player)))].toSorted()
}

/**
 * Writes the line beneath the archives the store keeps the most games from,
 * naming the archives and the games where no row is picked and the picked row's
 * games and share otherwise.
 */
export function largestReading(archives: number, picked: number | null, rows: readonly Rank[]): string {
  const total = numbers.summed(rows.map(row => row.games))
  if (picked === null) {
    return `Read from ${numbers.counted(archives)} archives · ${numbers.counted(total)} games indexed`
  }
  const { games, name } = rows[picked]!
  return `${name} · ${numbers.counted(games)} games · ${numbers.percent(games / total, 1)} of the store`
}

/**
 * Writes the sentence beside the count of every stored game, naming the
 * archives it is read from and the share held by those the store keeps the most
 * games from.
 */
export function largestSummary(archives: number, rows: readonly Rank[]): string {
  const top = rows.filter(row => !row.others)
  return `Games indexed from ${numbers.counted(archives)} archives, the top ${top.length} holding `
       + `${numbers.percent(top.at(-1)?.held ?? 0, 1)} of them and every other archive the rest.`
}

/**
 * Names the decades a player's games run across, or the one decade they all
 * fall in, for the title a row of the rating list carries.
 */
export function playedSpan(player: Player): string {
  const decades = Object.keys(player.decades)
    .map(Number)
    .toSorted((a, b) => a - b)
  const first   = decades[0]
  const last    = decades.at(-1)
  if (first === undefined) return player.name
  return `${player.name}, played ${first === last ? `in the ${first}s` : `${first}s to ${last}s`}`
}

/**
 * Reads every archive of the store as a player named for the file, in the order
 * of their names.
 */
export function playersOf(store = STORE): Player[] {
  return store.files.toSorted((a, b) => a.name.localeCompare(b.name))
}

/**
 * Ranks the archives filed under one initial by their games, the most first.
 */
export function rankedUnder(players: readonly Player[], initial: string): Player[] {
  return players.filter(player => initialOf(player) === initial).toSorted((a, b) => b.games - a.games)
}

/**
 * Finds how far across the curves a year stands, as a percentage of the span
 * from its first decade to its last.
 */
export function yearAt(span: Span, year: number): number {
  return (year - span.low) / Math.max(1, span.high - span.low) * 100
}
