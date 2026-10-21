import { clamp } from '@vueuse/core'
import { type VNode, computed, defineComponent, h, shallowRef } from 'vue'

import { pointerAt, useChart } from '../../../lib/data/chart.ts'
import * as decades            from '../../../lib/data/decades.ts'
import { stepped }             from '../../../lib/data/keys.ts'
import { Plate }               from './plate.ts'

/**
 * Draws the shade over the picked cell, hidden while no cell is picked.
 */
function cursor(layout: decades.StripLayout, picked: number | null): VNode {
  const at = picked ?? 0
  return h('div', {
    class : ['sc-data-cursor', { 'sc-data-on': picked !== null }],
    style : {
      height    : `${layout.band.height}px`,
      top       : `${layout.band.top}px`,
      transform : `translate3d(${layout.starts[at]}px, 0, 0)`,
      width     : `${decades.cellWidth(layout, at)}px`
    }
  })
}

/**
 * Draws the strip at its layout: each cell shaded by its games against the
 * busiest cell's, the first and third quarters ruled, the median marked by a
 * rule and a pawn, and the axis naming the cells `stripTicks` finds.
 */
function stripSvg(strip: decades.Strip, layout: decades.StripLayout): VNode {
  const { band, height, starts, width } = layout
  const [first, median, third]          = strip.quartiles
  const peak                            = Math.max(...strip.decades.map(decade => decade.games))
  const shade                           = (games: number): string =>
      `color-mix(in oklab, var(--sc-data-link) ${Math.round(6 + 84 * Math.sqrt(games / peak))}%, `
    + 'var(--sc-data-page))'

  return h('svg', {
    'aria-hidden' : 'true',
    class         : 'sc-data-svg',
    height        : height,
    viewBox       : `0 0 ${width} ${height}`,
    width         : width
  }, [
    ...strip.decades.map((decade, index) => h('rect', {
      height : band.height,
      style  : { fill: shade(decade.games) },
      width  : decades.cellWidth(layout, index),
      x      : starts[index]!,
      y      : band.top
    })),
    ...[first, third].map(index => h('rect', {
      class  : 'sc-data-rule',
      height : band.height + 8,
      width  : 1,
      x      : decades.cellMiddle(layout, index),
      y      : band.top - 8
    })),
    h('rect', {
      class  : 'sc-data-median',
      height : band.height + 6,
      width  : 1,
      x      : decades.cellMiddle(layout, median),
      y      : band.top - 6
    }),
    h('path', {
      class     : 'sc-data-pawn',
      d         : decades.pawn,
      transform : decades.pawnAt(decades.cellMiddle(layout, median) + 0.5, band.top - 8)
    }),
    ...decades.stripTicks(strip).map(index => h('text', {
      class         : 'sc-data-axis',
      'text-anchor' : 'middle',
      x             : decades.cellMiddle(layout, index) + 0.5,
      y             : height - 4
    }, strip.decades[index]!.label))
  ])
}

/**
 * The strip of decades: one cell per decade shaded by the games it holds
 * against the busiest, the decades holding the first and third quarters of the
 * dated games ruled, the median decade marked by a pawn, and a reading of the
 * decade a pointer or the arrow keys pick.
 */
export const Decades = defineComponent({
  name  : 'ScotchDecades',
  setup : () => {
    const strip   = decades.stripOf()
    const last    = strip.decades.length - 1
    const picked  = shallowRef<number | null>(null)
    const focused = computed(() => picked.value ?? strip.quartiles[1])

    const { chart, layout, sized, style } = useChart(width =>
      decades.stripLayout(strip.decades.length, width))

    const pointed = (event: PointerEvent): void => {
      const share  = pointerAt(event).x / layout.value.width
      picked.value = clamp(Math.floor(share * strip.decades.length), 0, last)
    }

    const keyed = (event: KeyboardEvent): void => {
      const to = stepped(last, event.key, 0, focused.value)
      if (to === undefined) return
      event.preventDefault()
      picked.value = to
    }

    return (): VNode => h(Plate, {
      big  : strip.decades[strip.quartiles[1]]!.name,
      line : decades.stripReading(strip, picked.value),
      say  : decades.stripSummary(strip)
    }, () => h('div', {
      'aria-label'     : 'Decades',
      'aria-valuemax'  : last,
      'aria-valuemin'  : 0,
      'aria-valuenow'  : focused.value,
      'aria-valuetext' : decades.stripReading(strip, focused.value),
      class            : 'sc-data-chart sc-data-decades',
      onBlur           : () => { picked.value = null },
      onKeydown        : keyed,
      onPointerdown    : pointed,
      onPointerleave   : (event: PointerEvent) => { if (event.pointerType !== 'touch') picked.value = null },
      onPointermove    : pointed,
      ref              : chart,
      role             : 'slider',
      style            : style.value,
      tabindex         : 0
    }, sized.value ? [stripSvg(strip, layout.value), cursor(layout.value, picked.value)] : []))
  }
})
