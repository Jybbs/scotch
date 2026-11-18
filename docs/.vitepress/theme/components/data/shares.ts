import { clamp }        from '@vueuse/core'
import { type VNode, h } from 'vue'

import { dimmed }               from '../../../lib/data/corner.ts'
import * as lengths             from '../../../lib/data/lengths.ts'
import * as numbers             from '../../../lib/data/numbers.ts'
import * as parts               from './parts.ts'
import { moveTicks, moverLine } from './plate.ts'

/**
 * The counts the chart draws: the games ending in each result at each move, the
 * shares the bands take, and the games ending at each move.
 */
export interface Counts {
  endings : number[][]
  shares  : number[][]
  totals  : number[]
}

/**
 * The fill of each result's band, the white wins edged against the page.
 */
const BANDS = {
  b : 'fill-(--sc-data-band-b)',
  d : 'fill-(--sc-data-band-d)',
  w : 'fill-(--sc-data-band-w) stroke-data-edge stroke-[0.6]'
} as const
/**
 * The caption over the bars, in capitals as every other axis label is set.
 */
const CAPTION = 'GAMES ENDING AT EACH MOVE'
/**
 * The color of each result's name over its band.
 */
const NAMES = { b: 'fill-ground', d: 'fill-dark', w: 'fill-(--sc-data-ink)' } as const

/**
 * Draws the names of the bands, each at the middle of its band over the move
 * its outcome's `labeled` names.
 */
function bandNames(layout: lengths.SharesLayout, lit: string | null, shares: readonly number[][]): VNode {
  const names = lengths.OUTCOMES.map(({ key, labeled, name }, kind) => {
    const share = shares[labeled - 1]!
    return h('text', {
      'class'       : ['font-body text-[0.7rem]/[normal] font-semibold', NAMES[key]],
      'text-anchor' : 'middle',
      'x'           : numbers.tenth(lengths.moveX(layout, labeled, shares.length)),
      'y'           : numbers.tenth(lengths.bandMiddle(kind, layout, share) + 4)
    }, name)
  })
  return h('g', { class: { 'opacity-30': lit !== null } }, names)
}

/**
 * Draws one band per result, every band but the one its corner mark lights
 * dimmed while one is lit.
 */
function bands(
  layout : lengths.SharesLayout,
  lit    : string | null,
  shares : readonly number[][]
): VNode[] {
  return lengths.OUTCOMES.map(({ key }, kind) => h('g', {
    'class'    : 'transition-opacity duration-settle ease-glide data-off:opacity-16',
    'data-k'   : key,
    'data-off' : dimmed(key, lit)
  }, [h('path', { class: BANDS[key], d: lengths.bandPath(shares, kind, layout) })]))
}

/**
 * Draws the bars beneath the bands, one per move, each as tall as the games
 * ending there against the move most games end at.
 */
function countBars(layout: lengths.SharesLayout, totals: readonly number[]): VNode[] {
  const plotted = lengths.CHART.plotted
  const counts  = totals.slice(1, plotted + 1)
  const peak    = Math.max(...counts)
  const wide    = Math.max(1, layout.plot / plotted - 1)

  return counts.map((games, index) => {
    const tall = Math.max(1, Math.round(games / peak * layout.bars.height))
    return h('rect', {
      class  : 'fill-[color-mix(in_oklab,var(--sc-data-ink)_38%,var(--sc-data-page))]',
      height : tall,
      width  : numbers.tenth(wide),
      x      : numbers.tenth(lengths.moveX(layout, index + 1) - wide / 2),
      y      : layout.bars.top + layout.bars.height - tall
    })
  })
}

/**
 * Draws the gridlines across the bands at each quarter of the games, each named
 * by its share at the left.
 */
function gridlines(layout: lengths.SharesLayout): VNode[] {
  return [0.25, 0.5, 0.75].flatMap(share => {
    const y = Math.round(lengths.bandY(layout, share))
    return [
      h('rect', { class: 'fill-(--sc-data-rule)', height: 1, width: layout.plot, x: layout.left, y }),
      h('text', {
        class         : parts.AXIS,
        'text-anchor' : 'end',
        x             : layout.left - 6,
        y             : y + 4
      }, numbers.percent(share))
    ]
  })
}

/**
 * Draws the line at the move the chart follows and the thumb on it at the
 * middle of the drawn band, or of the band a corner mark lights.
 */
export function markers(
  layout : lengths.SharesLayout,
  lit    : string | null,
  shares : readonly number[][],
  shown  : number
): VNode[] {
  const share = shares[clamp(Math.round(shown), 1, lengths.CHART.plotted) - 1]!
  const kind  = lengths.bandOf(lit ?? 'd')
  const x     = lengths.moveX(layout, shown)
  const y     = lengths.bandMiddle(kind, layout, share)

  return [
    moverLine(layout.bars.top + layout.bars.height - layout.bands.top, x, layout.bands.top),
    h('i', {
      class : 'pointer-events-none absolute top-0 left-0 -mt-[5px] -ml-[5px] size-2.5 rounded-full '
            + 'bg-(--sc-data-page) [box-shadow:0_0_0_2px_var(--sc-data-ink)] will-change-transform',
      style : { transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)` }
    })
  ]
}

/**
 * Draws the chart at its layout: the bands, their gridlines and names, the bars
 * beneath them, and the axis of moves, every band but the one a corner mark
 * lights dimmed while one is lit.
 */
export function drawing(counts: Counts, layout: lengths.SharesLayout, lit: string | null): VNode {
  const { bars, height, left, plot, width } = layout

  return h('svg', {
    'aria-hidden' : 'true',
    class         : parts.SVG,
    height        : height,
    viewBox       : `0 0 ${width} ${height}`,
    width         : width
  }, [
    ...bands(layout, lit, counts.shares),
    ...gridlines(layout),
    bandNames(layout, lit, counts.shares),
    h('text', {
      class : 'fill-(--sc-data-quiet) font-code text-[0.54rem] font-medium tracking-[0.1em] tabular-nums',
      x     : left,
      y     : bars.top - 5
    }, CAPTION),
    ...countBars(layout, counts.totals),
    h('rect', { class: 'fill-(--sc-data-ink)', height: 1, width: plot, x: left, y: bars.top + bars.height }),
    ...moveTicks(layout, height - 6)
  ])
}
