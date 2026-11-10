import store from '../rendered/store.json' with { type: 'json' }

import { hexOf, type Token } from '../identity/tokens.ts'

export interface File {
  counts : number[]
  games  : number
  hex    : string
  name   : string
  token  : Token
}

/**
 * How the chart lays out: its height, the rows under and over its lines, and the
 * column its counts stand in.
 */
export const CHART = { foot: 18, height: 214, left: 36, right: 8, top: 8 } as const

/**
 * The decades any charted file holds a game in, the earliest first.
 */
export const DECADES = [...new Set(store.charted.flatMap(file => Object.keys(file.decades).map(Number)))]
  .toSorted((first, second) => first - second)
/**
 * Each charted file, with its games by decade and the palette series it takes.
 */
export const FILES: readonly File[] = store.charted.map((file, index) => ({
  counts : DECADES.map(decade => (file.decades as Record<string, number | undefined>)[decade] ?? 0),
  games  : file.games,
  hex    : hexOf(`series_${index + 1}` as Token),
  name   : file.name,
  token  : `series_${index + 1}` as Token
}))
/**
 * The most games any charted file holds in one decade.
 */
const PEAK = Math.max(...FILES.flatMap(file => file.counts))

/**
 * Runs a smooth line through a list of points, each span a cubic with level
 * handles at its middle.
 */
export function curveOf(points: readonly (readonly [number, number])[]): string {
  return points.map(([x, y], index) => {
    if (index === 0) return `M${x.toFixed(1)} ${y.toFixed(1)}`
    const [previousX, previousY] = points[index - 1]!
    const middle                 = (previousX + x) / 2
    return `C${middle.toFixed(1)} ${previousY.toFixed(1)} ${middle.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join('')
}

/**
 * Keeps a file's decades from one before its first game to one past its last, so
 * a line draws no stretch along the axis.
 */
export function spanOf({ counts }: File): readonly [number, number] {
  const first = counts.findIndex(count => count > 0)
  const last  = counts.findLastIndex(count => count > 0)
  return [Math.max(0, first - 1), Math.min(counts.length - 1, last + 1)]
}

function traced(file: File, point: (column: number, count: number) => readonly [number, number]): string {
  const [first, last] = spanOf(file)
  return curveOf(file.counts.slice(first, last + 1).map((count, place) => point(first + place, count)))
}

/**
 * Rounds a step between two rows of the chart up to one, two, five, or ten times
 * a power of ten.
 */
export function stepOf(value: number): number {
  const base = 10 ** Math.floor(Math.log10(value))
  const lead = value / base
  if (lead > 5) return 10 * base
  if (lead > 2) return 5 * base
  return (lead > 1 ? 2 : 1) * base
}

/**
 * Lays the lines out at a width: where each decade stands, how tall each count
 * stands given each file's weight, each line's path, the rows behind them, and
 * the decades the axis labels.
 *
 * Args:
 *   width   : The chart's width in pixels.
 *   weights : How far each file stands switched on, from 0 to 1.
 */
export function linesAt(width: number, weights: readonly number[]): {
  axis : { anchor: string, label: number, x: number }[]
  rows : { label: number, seen: boolean, y: number }[]
  ys   : (value: number) => number
  xs   : (index: number) => number
  ds   : string[]
} {
  const { foot, height, left, right, top } = CHART

  const xs   = (index: number): number => left + index / (DECADES.length - 1) * (width - left - right)
  const most = Math.max(1, ...FILES.map((file, index) => Math.max(...file.counts) * weights[index]!))
  const ys   = (value: number): number => height - foot - value / most * (height - foot - top)
  const step = Math.max(1, stepOf(most / 2.6))
  const skip = width < 480 ? 4 : 2

  return {
    axis : DECADES.flatMap((decade, index) => index % skip ? [] : [{
      anchor : ['start', 'middle', 'end'][index === 0 ? 0 : index === DECADES.length - 1 ? 2 : 1]!,
      label  : decade,
      x      : xs(index)
    }]),
    ds   : FILES.map(file => traced(file, (column, count) => [xs(column), ys(count)])),
    rows : [0, 1, 2].map(index => ({ label: step * index, seen: ys(step * index) >= top - 6, y: ys(step * index) })),
    xs   : xs,
    ys   : ys
  }
}

/**
 * Writes each file's small line for its switch, in the switch's 100-by-40 box,
 * every file drawn to one scale.
 */
export function sparksOf(): string[] {
  return FILES.map(file => traced(file, (column, count) => [
    column / (DECADES.length - 1) * 100,
    40 - count / PEAK * 38 - 1
  ]))
}
