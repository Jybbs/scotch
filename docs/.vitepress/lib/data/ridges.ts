import { clamp } from '@vueuse/core'

import * as lengths          from './lengths.ts'
import * as numbers          from './numbers.ts'
import { STORE, type Store } from './store.ts'

/**
 * One ridge of the chart, the games of one decade or of every decade before the
 * first that takes a ridge of its own: its name, the label the axis sets it in
 * capitals, the phrase a sentence names its games by, the games it holds in all
 * and counted by moves up to `Chart.limit`, the height it rises to at each move
 * the chart draws as a share of its own peak, and the fewest moves a quarter,
 * half, and three quarters of its games end by.
 */
export interface Ridge {
  counts    : number[]
  games     : number
  heights   : number[]
  label     : string
  name      : string
  phrase    : string
  quartiles : [number, number, number]
}

/**
 * Where the ridges sit at a width, the room the names take on the left, the
 * pitch between two ridges' baselines, and the most a ridge rises.
 */
export interface RidgesLayout {
  height : number
  left   : number
  pitch  : number
  plot   : number
  rise   : number
  top    : number
  width  : number
}

/**
 * The first decade that takes a ridge of its own, the games of every earlier
 * decade sharing the first ridge.
 */
const FIRST_RIDGE = 1900

/**
 * Counts one ridge's games by moves, every game past `chart.limit` counting at
 * it.
 */
function clipped(moves: readonly number[], chart: lengths.Chart): number[] {
  return [...moves.slice(0, chart.limit), numbers.summed(moves.slice(chart.limit))]
}

function ridgeOf(moves: readonly number[], chart: lengths.Chart, name: string, phrase: string): Ridge {
  const counts = clipped(moves, chart)
  const raw    = Array.from({ length: chart.plotted + 1 }, (_, move) =>
    move ? counts[move - 1]! + 2 * counts[move]! + (counts[move + 1] ?? 0) : 0)
  const peak   = Math.max(...raw) || 1
  const totals = numbers.accumulated(counts)

  return {
    counts    : counts,
    games     : totals.at(-1)!,
    heights   : raw.map(value => value / peak),
    label     : name.toUpperCase(),
    name      : name,
    phrase    : phrase,
    quartiles : numbers.quartiles(totals)
  }
}

/**
 * Finds where the rule at a ridge's median stands, rising from the ridge's
 * baseline to 4 pixels above its line, and standing 4 pixels tall on the
 * baseline where the median falls past the moves the chart draws.
 */
export function medianRule(
  ridge  : Ridge,
  layout : RidgesLayout,
  row    : number
): { height: number, x: number, y: number } {
  const median = ridge.quartiles[1]
  const peak   = ridge.heights[median] ?? 0
  const base   = ridgeBase(layout, row)

  return {
    height : numbers.tenth(peak * layout.rise + 4),
    x      : numbers.tenth(lengths.moveX(layout, median, ridge.heights.length - 1) - 0.5),
    y      : numbers.tenth(base - peak * layout.rise - 4)
  }
}

/**
 * Finds the ridge and the move under a point of the chart, the ridge whose
 * baseline sits nearest beneath the point among `count` ridges and the move of
 * the column it falls in, each held inside the chart.
 */
export function ridgeAt(
  count  : number,
  layout : RidgesLayout,
  x      : number,
  y      : number,
  chart  : lengths.Chart = lengths.CHART
): { move: number, row: number } {
  return {
    move : lengths.moveAt(layout, x, chart),
    row  : clamp(Math.round((y - layout.top + 8) / layout.pitch), 0, count - 1)
  }
}

/**
 * Finds the height of a ridge's baseline, its row's place below the top.
 */
export function ridgeBase(layout: Pick<RidgesLayout, 'pitch' | 'top'>, row: number): number {
  return layout.top + row * layout.pitch
}

/**
 * Writes the outline of one ridge as a line along its heights, the line alone
 * where `closed` is false and closed back along its baseline otherwise.
 */
export function ridgePath(ridge: Ridge, layout: RidgesLayout, row: number, closed = false): string {
  const base   = ridgeBase(layout, row)
  const x      = (move: number): number => lengths.moveX(layout, move, ridge.heights.length - 1)
  const foot   = [[x(ridge.heights.length - 1), base], [x(1), base]] as const
  const points = ridge.heights.slice(1).map((height, index): [number, number] =>
    [x(index + 1), base - height * layout.rise])

  return numbers.pathThrough(points, closed ? foot : undefined)
}

/**
 * Writes the readings beneath the ridges for the picked ridge and move, its
 * name, its median, its middle half, and the share of its games ended by the
 * move.
 */
export function ridgeReading(ridge: Ridge, move: number, chart = lengths.CHART): string[][] {
  const [first, middle, third] = ridge.quartiles
  const ended                  = numbers.summed(ridge.counts.slice(0, move + 1)) / Math.max(1, ridge.games)

  return [
    ['Decade', ridge.name],
    ['Median move', String(middle)],
    ['Middle half', `${first} to ${third}`],
    ['Ended by the move', numbers.percent(ended), `by move ${lengths.moveName(move, chart)}`]
  ]
}

/**
 * Writes the sentence beside the picked ridge, setting its median against the
 * latest and the earliest medians among the ridges.
 */
export function ridgeSummary(ridges: readonly Ridge[], picked: number): string {
  const median   = (ridge: Ridge): number => ridge.quartiles[1]
  const latest   = ridges.reduce((best, ridge) => median(ridge) > median(best) ? ridge : best)
  const earliest = ridges.reduce((best, ridge) => median(ridge) < median(best) ? ridge : best)
  const ridge    = ridges[picked]!

  if (median(ridge) === median(latest)) {
    return `The games ${ridge.phrase} run longest, half of them ending by move ${median(ridge)}, `
         + `against move ${median(earliest)} for the games ${earliest.phrase}.`
  }
  if (median(ridge) === median(earliest)) {
    return `The games ${ridge.phrase} run shortest, half of them ending by move ${median(ridge)}, `
         + `against move ${median(latest)} for the games ${latest.phrase}.`
  }
  return `Half the games ${ridge.phrase} end by move ${median(ridge)}, against move ${median(latest)} `
       + `for the games ${latest.phrase} and move ${median(earliest)} for those ${earliest.phrase}.`
}

/**
 * Lays the ridges out across a width, leaving room on the left for their names
 * and below the last for the axis.
 */
export function ridgesLayout(count: number, width: number): RidgesLayout {
  const left  = 92
  const pitch = 24
  const rise  = 46
  const top   = rise + 4

  return { height: top + (count - 1) * pitch + 30, left, pitch, plot: width - left - 10, rise, top, width }
}

/**
 * Builds a ridge for each decade from `first` on and one for every decade
 * before it, the earliest first.
 */
export function ridgesOf(
  store : Store         = STORE,
  chart : lengths.Chart = lengths.CHART,
  first : number        = FIRST_RIDGE
): Ridge[] {
  const early = store.eras.filter(era => era.decade < first)
  const moves = numbers.summedColumns(early.map(era => era.moves))

  return [
    ...early.length > 0 ? [ridgeOf(moves, chart, `Before ${first}`, `played before ${first}`)] : [],
    ...store.eras
      .filter(era => era.decade >= first)
      .map(era => ridgeOf(era.moves, chart, era.name, `of the ${era.name}`))
  ]
}
