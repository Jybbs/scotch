import { type ShallowRef, type VNode, defineComponent, h, shallowRef } from 'vue'

import { pointerAt, useChart }         from '../../../lib/data/chart.ts'
import { stepped }                     from '../../../lib/data/keys.ts'
import * as lengths                    from '../../../lib/data/lengths.ts'
import { useGlide, useMove }           from '../../../lib/data/move.ts'
import * as numbers                    from '../../../lib/data/numbers.ts'
import { Corner }                      from './corner.ts'
import * as parts                      from './parts.ts'
import { Plate }                       from './plate.ts'
import * as shares                     from './shares.ts'

/**
 * The chart's column and the tone of each result's band, the black wins
 * deepened and the white wins lifted off the page.
 */
const TONES = 'grid gap-2 '
            + '[--sc-data-band-b:color-mix(in_oklab,var(--sc-data-black)_78%,var(--sc-data-page))] '
            + '[--sc-data-band-d:var(--sc-data-draw)] '
            + '[--sc-data-band-w:color-mix(in_oklab,var(--sc-data-ink)_6%,var(--sc-data-page))]'

/**
 * Reads the shares the bands take and the games ending at each move from the
 * games ending in each result at each move.
 */
function countsOf(endings: number[][]): shares.Counts {
  return { endings, shares: lengths.sharesOf(endings), totals: endings.map(ending => numbers.summed(ending)) }
}

/**
 * Draws the chart's corner legend, a mark per result lighting its band.
 */
function legend(lit: ShallowRef<string | null>): VNode {
  return h(Corner, {
    'items'        : lengths.RESULT_MARKS,
    'lit'          : lit.value,
    'onUpdate:lit' : (key: string | null) => { lit.value = key }
  })
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
 * The result's share at each length: three bands sharing the games ending at
 * each move among White's wins, draws, and Black's wins, always filling the
 * plot, over a count of the games ending at each move. A reader moves along the
 * moves with a pointer, a finger, or the arrow keys, the move shared with the
 * ridges of the decades, and lights one result's band through its mark in the
 * chart's corner.
 */
export const Results = defineComponent({
  name  : 'ScotchResults',
  setup : () => {
    const counts   = countsOf(lengths.endingsOf())
    const move     = useMove()
    const lit      = shallowRef<string | null>(null)
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
    }, () => h('div', { class: TONES }, [
      legend(lit),
      h('div', {
        ...slider(move.value, counts.totals),
        class           : [parts.CHART, 'cursor-crosshair touch-pan-y'],
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
        shares.drawing(counts, layout.value, lit.value),
        ...shares.markers(layout.value, lit.value, counts.shares, glide.shown.value)
      ] : [])
    ]))
  }
})
