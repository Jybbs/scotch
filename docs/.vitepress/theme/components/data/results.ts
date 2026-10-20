import { clamp } from '@vueuse/core'
import { type ShallowRef, type VNode, defineComponent, h, shallowRef } from 'vue'

import { pointerAt, useChart }         from '../../../lib/data/chart.ts'
import { stepped }                     from '../../../lib/data/keys.ts'
import * as lengths                    from '../../../lib/data/lengths.ts'
import { useGlide, useMove }           from '../../../lib/data/move.ts'
import * as numbers                    from '../../../lib/data/numbers.ts'
import { Plate, moveTicks, moverLine } from './plate.ts'

/**
 * The counts the chart draws: the games ending in each result at each move, the
 * shares the bands take, and the games ending at each move.
 */
interface Counts {
  endings : number[][]
  shares  : number[][]
  totals  : number[]
}

/**
 * The caption over the bars, in capitals as every other axis label is set.
 */
const CAPTION = 'GAMES ENDING AT EACH MOVE'

/**
 * Draws the names of the bands, each at the middle of its band over the move
 * its outcome's `labeled` names.
 */
function bandNames(layout: lengths.SharesLayout, shares: readonly number[][]): VNode {
  return h('g', { class: 'sc-data-band-names' }, lengths.OUTCOMES.map(({ key, labeled, name }, kind) => {
    const share = shares[labeled - 1]!
    return h('text', {
      class         : `sc-data-band-name sc-data-band-name-${key}`,
      'text-anchor' : 'middle',
      x             : numbers.tenth(lengths.moveX(layout, labeled, shares.length)),
      y             : numbers.tenth(lengths.bandMiddle(kind, layout, share) + 4)
    }, name)
  }))
}

/**
 * Draws one band per result, every band but the one shown alone dimmed where
 * one is.
 */
function bands(
  layout : lengths.SharesLayout,
  only   : lengths.Outcome | null,
  shares : readonly number[][]
): VNode[] {
  return lengths.OUTCOMES.map(({ key }, kind) => h('g', {
    class: ['sc-data-band-group', { 'sc-data-off': only !== null && only !== key }]
  }, [h('path', { class: `sc-data-band sc-data-band-${key}`, d: lengths.bandPath(shares, kind, layout) })]))
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
      class  : 'sc-data-count',
      height : tall,
      width  : numbers.tenth(wide),
      x      : numbers.tenth(lengths.moveX(layout, index + 1) - wide / 2),
      y      : layout.bars.top + layout.bars.height - tall
    })
  })
}

/**
 * Reads the shares the bands take and the games ending at each move from the
 * games ending in each result at each move.
 */
function countsOf(endings: number[][]): Counts {
  return { endings, shares: lengths.sharesOf(endings), totals: endings.map(ending => numbers.summed(ending)) }
}

/**
 * Draws the gridlines across the bands at each quarter of the games, each named
 * by its share at the left.
 */
function gridlines(layout: lengths.SharesLayout): VNode[] {
  return [0.25, 0.5, 0.75].flatMap(share => {
    const y = Math.round(lengths.bandY(layout, share))
    return [
      h('rect', { class: 'sc-data-grid', height: 1, width: layout.plot, x: layout.left, y }),
      h('text', {
        class         : 'sc-data-axis',
        'text-anchor' : 'end',
        x             : layout.left - 6,
        y             : y + 4
      }, numbers.percent(share))
    ]
  })
}

/**
 * Draws the line at the move the chart follows and the thumb on it at the
 * middle of the drawn band, or of the band shown alone.
 */
function markers(
  layout : lengths.SharesLayout,
  only   : lengths.Outcome | null,
  shares : readonly number[][],
  shown  : number
): VNode[] {
  const share = shares[clamp(Math.round(shown), 1, lengths.CHART.plotted) - 1]!
  const kind  = lengths.bandOf(only ?? 'd')
  const x     = lengths.moveX(layout, shown)
  const y     = lengths.bandMiddle(kind, layout, share)

  return [
    moverLine(layout.bars.top + layout.bars.height - layout.bands.top, x, layout.bands.top),
    h('i', {
      class : 'sc-data-thumb',
      style : { transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)` }
    })
  ]
}

/**
 * Draws the chart at its layout: the bands, their gridlines and names, the bars
 * beneath them, and the axis of moves, every band but the one shown alone
 * dimmed where one is.
 */
function sharesSvg(counts: Counts, layout: lengths.SharesLayout, only: lengths.Outcome | null): VNode {
  const { bars, height, left, plot, width } = layout

  return h('svg', {
    'aria-hidden' : 'true',
    class         : ['sc-data-svg', { 'sc-data-isolated': only !== null }],
    height        : height,
    viewBox       : `0 0 ${width} ${height}`,
    width         : width
  }, [
    ...bands(layout, only, counts.shares),
    ...gridlines(layout),
    bandNames(layout, counts.shares),
    h('text', { class: 'sc-data-axis sc-data-caption', x: left, y: bars.top - 5 }, CAPTION),
    ...countBars(layout, counts.totals),
    h('rect', { class: 'sc-data-base', height: 1, width: plot, x: left, y: bars.top + bars.height }),
    ...moveTicks(layout, height - 6)
  ])
}

/**
 * Writes the slider attributes of the chart for the move it follows, naming the
 * games ending there.
 */
function slider(move: number, totals: readonly number[]): Record<string, number | string> {
  return {
    'aria-label'     : 'Move',
    'aria-valuemax'  : lengths.CHART.plotted,
    'aria-valuemin'  : 1,
    'aria-valuenow'  : move,
    'aria-valuetext' : `move ${move}, ${numbers.counted(totals[move]!)} games end here`
  }
}

/**
 * Draws the buttons that show one result's band alone, each pressed while its
 * band is the one shown and pressed again to show every band.
 */
function toggles(only: ShallowRef<lengths.Outcome | null>): VNode[] {
  return [
    h('span', { class: 'sc-data-tools-caption' }, 'Show one'),
    ...lengths.OUTCOMES.map(({ key, name }) => h('button', {
      'aria-pressed' : only.value === key,
      class          : 'sc-data-toggle',
      onClick        : () => { only.value = only.value === key ? null : key },
      type           : 'button'
    }, [h('i', { 'aria-hidden': 'true', class: `sc-data-swatch sc-data-swatch-${key}` }), h('span', name)]))
  ]
}

/**
 * The result's share at each length: three bands sharing the games ending at
 * each move among White's wins, draws, and Black's wins, always filling the
 * plot, over a count of the games ending at each move. A reader moves along the
 * moves with a pointer, a finger, or the arrow keys, the move shared with the
 * ridges of the decades, and shows one result alone through its button.
 */
export const Results = defineComponent({
  name  : 'ScotchResults',
  setup : () => {
    const counts   = countsOf(lengths.endingsOf())
    const move     = useMove()
    const only     = shallowRef<lengths.Outcome | null>(null)
    const dragging = shallowRef(false)
    const glide    = useGlide(move)

    const { chart, layout, sized, style } = useChart(lengths.sharesLayout)

    const pointed = (event: PointerEvent): void => {
      if (event.pointerType === 'touch' && event.type === 'pointerdown') dragging.value = true
      if (event.pointerType === 'touch' && !dragging.value) return
      glide.quick.value = true
      move.value        = lengths.moveAt(layout.value, pointerAt(event).x)
    }

    const keyed = (event: KeyboardEvent): void => {
      const to = stepped(lengths.CHART.plotted, event.key, 1, move.value)
      if (to === undefined) return
      event.preventDefault()
      glide.quick.value = false
      move.value        = to
    }

    return (): VNode => h(Plate, {
      big      : numbers.percent(lengths.drawnShares(counts.endings).short),
      readings : lengths.sharesReading(counts.endings, move.value),
      say      : lengths.sharesSummary(counts.endings)
    }, {
      tools   : () => toggles(only),
      default : () => h('div', {
        ...slider(move.value, counts.totals),
        class           : 'sc-data-chart sc-data-results',
        onKeydown       : keyed,
        onPointercancel : () => { dragging.value = false },
        onPointerdown   : pointed,
        onPointermove   : pointed,
        onPointerup     : () => { dragging.value = false },
        ref             : chart,
        role            : 'slider',
        style           : style.value,
        tabindex        : 0
      }, sized.value ? [
        sharesSvg(counts, layout.value, only.value),
        ...markers(layout.value, only.value, counts.shares, glide.shown.value)
      ] : [])
    })
  }
})
