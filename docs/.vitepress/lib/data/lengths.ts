import { clamp } from '@vueuse/core'

import * as numbers from './numbers.ts'
import { STORE }    from './store.ts'

/**
 * The tuning the two charts of game lengths share: the move past which every
 * game counts as one, the move both open on, the moves the charts draw, the
 * moves on either side of each move the bands average over, and the two moves
 * the sentence beside the bands compares, a game ending by `short` counting as
 * short and one running past `late` as long.
 */
export interface Chart {
  late      : number
  limit     : number
  opening   : number
  plotted   : number
  short     : number
  smoothing : number
}

export type Outcome = (typeof OUTCOMES)[number]['key']

/**
 * Where the bands, the bars beneath them, and the axis sit at a width.
 */
export interface SharesLayout {
  bands  : { height: number, top: number }
  bars   : { height: number, top: number }
  height : number
  left   : number
  plot   : number
  width  : number
}

/**
 * The tuning both charts read.
 */
export const CHART: Chart = { late: 60, limit: 120, opening: 40, plotted: 100, short: 25, smoothing: 2 }
/**
 * The results a stored game ends in, each under the key a band takes, the move
 * the band's name sits over, chosen where the band runs widest, the name a
 * reader meets, and the `Result` tag it reads.
 */
export const OUTCOMES = [
  { key: 'w', labeled: 70, name: 'White won', result: '1-0' },
  { key: 'd', labeled: 14, name: 'Drawn',     result: '1/2-1/2' },
  { key: 'b', labeled: 70, name: 'Black won', result: '0-1' }
] as const
/**
 * The moves the axes of both charts name.
 */
export const TICKS = [1, 20, 40, 60, 80, 100] as const

/**
 * Sums the counts from the index `from` to the index `to`, both included.
 */
function between(counts: readonly number[], from: number, to: number): number {
  return numbers.summed(counts.slice(from, to + 1))
}

/**
 * Finds the height of the middle of one band at a move, from the shares the
 * results take there.
 */
export function bandMiddle(
  kind   : number,
  layout : Pick<SharesLayout, 'bands'>,
  share  : readonly number[]
): number {
  return bandY(layout, numbers.summed(share.slice(0, kind)) + share[kind]! / 2)
}

/**
 * Finds the place a result's band takes among the bands, in the order
 * `OUTCOMES` names the results.
 */
export function bandOf(outcome: Outcome): number {
  return OUTCOMES.findIndex(entry => entry.key === outcome)
}

/**
 * Writes the outline of one band, its top edge running along the moves and its
 * bottom edge running back, each band stacked on the ones before it.
 */
export function bandPath(shares: readonly number[][], kind: number, layout: SharesLayout): string {
  const low  = shares.map(share => numbers.summed(share.slice(0, kind)))
  const high = shares.map((share, move) => low[move]! + share[kind]!)
  const at   = (value: number, move: number): [number, number] =>
    [moveX(layout, move + 1, shares.length), bandY(layout, value)]

  const top  = high.map((value, move) => at(value, move))
  const back = low.map((value, move) => at(value, move)).toReversed()

  return numbers.pathThrough(top, back)
}

/**
 * Finds the height a share of the games reaches on the bands.
 */
export function bandY(layout: Pick<SharesLayout, 'bands'>, share: number): number {
  return layout.bands.top + (1 - share) * layout.bands.height
}

/**
 * Finds the share of the games ending by `chart.short` that are drawn and the
 * share of those running past `chart.late` that are drawn.
 */
export function drawnShares(
  endings : readonly number[][],
  chart   : Chart = CHART
): { late: number, short: number } {
  const kind  = bandOf('d')
  const drawn = endings.map(counts => counts[kind]!)
  const games = endings.map(counts => numbers.summed(counts))

  return {
    late  : between(drawn, chart.late + 1, chart.limit) / between(games, chart.late + 1, chart.limit),
    short : between(drawn, 0, chart.short) / between(games, 0, chart.short)
  }
}

/**
 * Counts the games ending in each result at each number of moves from 0 to
 * `chart.limit`, in the order `OUTCOMES` names the results, the last entry
 * holding every game playing `chart.limit` moves or more.
 */
export function endingsOf(store = STORE, chart = CHART): number[][] {
  const columns = OUTCOMES.map(outcome => store.results.indexOf(outcome.result))
  const pick    = (counts: readonly number[] = []): number[] => columns.map(column => counts[column] ?? 0)
  const tail    = store.moves.slice(chart.limit).map(counts => pick(counts))

  return [
    ...Array.from({ length: chart.limit }, (_, move) => pick(store.moves[move])),
    numbers.summedColumns(tail, OUTCOMES.length)
  ]
}

/**
 * Finds the move of the column a point of the bands falls in, held inside the
 * moves the chart draws.
 */
export function moveAt(layout: Pick<SharesLayout, 'left' | 'plot'>, x: number, chart = CHART): number {
  return clamp(Math.round((x - layout.left) / layout.plot * chart.plotted + 0.5), 1, chart.plotted)
}

/**
 * Names a number of moves the way the charts read it, the last counting every
 * game past it.
 */
export function moveName(move: number, chart = CHART): string {
  return move >= chart.limit ? `${chart.limit}+` : String(move)
}

/**
 * Finds the horizontal position of a move on a chart's axis, each of the
 * `plotted` moves centered in its own share of the plot.
 */
export function moveX(
  layout  : Pick<SharesLayout, 'left' | 'plot'>,
  move    : number,
  plotted : number = CHART.plotted
): number {
  return layout.left + (move - 0.5) / plotted * layout.plot
}

/**
 * Lays the bands, the bars beneath them, and the axis out across a width,
 * leaving room on the left for the shares the gridlines name.
 */
export function sharesLayout(width: number): SharesLayout {
  const bands = { height: 190, top: 8 }
  const bars  = { height: 58, top: bands.top + bands.height + 18 }
  const left  = 36

  return { bands, bars, height: bars.top + bars.height + 22, left, plot: width - left - 8, width }
}

/**
 * Shares the games ending at each move the charts draw among the results, each
 * move's shares read over the games ending within `chart.smoothing` moves of
 * it, so a move with few games draws no spike.
 */
export function sharesOf(endings: readonly number[][], chart = CHART): number[][] {
  return Array.from({ length: chart.plotted }, (_, index) => {
    const move   = index + 1
    const around = endings.slice(Math.max(1, move - chart.smoothing), move + chart.smoothing + 1)
    const counts = numbers.summedColumns(around, OUTCOMES.length)
    const games  = numbers.summed(counts) || 1
    return counts.map(count => count / games)
  })
}

/**
 * Writes the readings beneath the bands for one move, its name, the games
 * ending there, and each result's share of them beside its count.
 */
export function sharesReading(endings: readonly number[][], move: number, chart = CHART): string[][] {
  const counts = endings[move]!
  const games  = numbers.summed(counts)

  return [
    ['Move', moveName(move, chart)],
    ['Ending here', numbers.counted(games)],
    ...OUTCOMES.map(({ name }, kind) =>
      [name, numbers.percent(counts[kind]! / Math.max(1, games)), numbers.counted(counts[kind]!)])
  ]
}

/**
 * Writes the sentence beside the bands, comparing how often a short game is
 * drawn with how often a long one is.
 */
export function sharesSummary(endings: readonly number[][], chart = CHART): string {
  const { late, short } = drawnShares(endings, chart)
  return `Of the stored games that end by move ${chart.short}, ${numbers.percent(short)} are drawn, `
       + `against ${numbers.percent(late)} of those that run past move ${chart.late}.`
}
