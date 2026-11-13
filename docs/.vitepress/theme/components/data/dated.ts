import { type VNode, defineComponent, h, shallowRef } from 'vue'

import { pointerAt, useChart } from '../../../lib/data/chart.ts'
import { dimmed }              from '../../../lib/data/corner.ts'
import { stepped }             from '../../../lib/data/keys.ts'
import * as numbers            from '../../../lib/data/numbers.ts'
import * as tags               from '../../../lib/data/tags.ts'
import { Corner }              from './corner.ts'
import { Plate, axisLabel }    from './plate.ts'

/**
 * The tiers each band splits a decade's games into, the fullest on top, as the
 * keys of the corner marks naming them.
 */
const TIERS = ['full', 'part', 'bare'] as const

/**
 * Draws one band, a column per decade split into its three tiers from the top,
 * every tier but the one a lit mark names dimmed.
 */
function band(layout: tags.DatedLayout, lit: string | null, side: 'dates' | 'ratings', top: number): VNode[] {
  return tags.TAGS.decades.flatMap((decade, column) => {
    const shares = tags.datedParts(decade)[side]
    const starts = numbers.accumulated([0, ...shares])
    return TIERS.map((tier, at) => h('rect', {
      'class'  : ['sc-data-dated-cell', dimmed(tier, lit)],
      'data-k' : tier,
      'height' : numbers.tenth(shares[at]! * layout.band),
      'width'  : numbers.tenth(Math.max(0, layout.cell - 1.5)),
      'x'      : numbers.tenth(layout.left + column * layout.cell),
      'y'      : numbers.tenth(top + starts[at]! * layout.band)
    }))
  })
}

/**
 * Draws the bands as one slider the pointer and the arrow keys move across the
 * decades, every tier but the one `lit` names dimmed.
 */
function drawn(
  at     : number,
  calls  : Record<string, unknown>,
  layout : tags.DatedLayout,
  lit    : string | null
): VNode {
  const decade = tags.TAGS.decades[at]!
  return h('svg', {
    'aria-label'     : 'Each decade’s games by the precision of their date and by the ratings they carry',
    'aria-valuemax'  : tags.TAGS.decades.length - 1,
    'aria-valuemin'  : 0,
    'aria-valuenow'  : at,
    'aria-valuetext' : tags.datedSentence(decade),
    'class'          : 'sc-data-svg',
    'height'         : layout.height,
    'role'           : 'slider',
    'tabindex'       : 0,
    'viewBox'        : `0 0 ${layout.width} ${layout.height}`,
    'width'          : layout.width,
    ...calls
  }, plot(at, layout, lit))
}

/**
 * Draws both bands, their names, every third decade beneath them, and the box
 * round the decade picked.
 */
function plot(at: number, layout: tags.DatedLayout, lit: string | null): VNode[] {
  const lower = 4 + layout.band + 16
  return [
    axisLabel('Date', layout.left - 8, 4 + layout.band / 2),
    axisLabel('Ratings', layout.left - 8, lower + layout.band / 2),
    ...band(layout, lit, 'dates', 4),
    ...band(layout, lit, 'ratings', lower),
    ...tags.TAGS.decades.flatMap((decade, column) => column % 3
      ? []
      : [axisLabel(decade.name, layout.left + (column + 0.5) * layout.cell, layout.height - 6, 'middle')]),
    h('rect', {
      class  : 'sc-data-dated-box',
      height : 2 * layout.band + 20,
      rx     : 2,
      width  : numbers.tenth(layout.cell + 1),
      x      : numbers.tenth(layout.left + at * layout.cell - 1.2),
      y      : 2
    })
  ]
}

/**
 * Each decade's games as two bands, the upper split by how precisely their
 * `Date` tag dates them and the lower by the ratings they carry, a reader
 * moving across the decades with a pointer, a finger, or the arrow keys.
 */
export const DatedBands = defineComponent({
  name  : 'ScotchDatedBands',
  setup : () => {
    const at   = shallowRef(tags.TAGS.decades.findIndex(decade => decade.name === '1990s'))
    const last = tags.TAGS.decades.length - 1
    const lit  = shallowRef<string | null>(null)

    const { chart, layout, sized, style } = useChart(tags.datedLayout)

    const calls = {
      onKeydown: (event: KeyboardEvent) => {
        const to = stepped(last, event.key, 0, at.value, false)
        if (to === undefined) return
        event.preventDefault()
        at.value = to
      },
      onPointermove: (event: PointerEvent) => { at.value = tags.datedAt(layout.value, pointerAt(event).x) }
    }

    return (): VNode => {
      const decade             = tags.TAGS.decades[at.value]!
      const { dates, ratings } = tags.datedParts(decade)
      return h(Plate, {
        big      : decade.name,
        readings : [
          ['To the day', numbers.percent(dates[0]!)],
          ['To the month', numbers.percent(dates[1]!)],
          ['Both ratings', numbers.percent(ratings[0]!)],
          ['Neither', numbers.percent(ratings[2]!)]
        ],
        say: tags.datedSentence(decade)
      }, () => h('div', { class: 'sc-data-dated' }, [
        h(Corner, {
          'items'        : tags.DATED_MARKS,
          'lit'          : lit.value,
          'onUpdate:lit' : (key: string | null) => { lit.value = key }
        }),
        h('div', { class: 'sc-data-chart', ref: chart, style: style.value }, sized.value
          ? [drawn(at.value, calls, layout.value, lit.value)]
          : [])
      ]))
    }
  }
})
