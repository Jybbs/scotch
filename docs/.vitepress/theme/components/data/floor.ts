import { type ShallowRef, type VNode, defineComponent, h, shallowRef } from 'vue'

import { pointerAt, useChart } from '../../../lib/data/chart.ts'
import { dimmed }              from '../../../lib/data/corner.ts'
import { stepped }             from '../../../lib/data/keys.ts'
import * as numbers            from '../../../lib/data/numbers.ts'
import * as omitted            from '../../../lib/data/omitted.ts'
import { Corner }              from './corner.ts'
import { Plate, axisLabel }    from './plate.ts'

/**
 * What one cell of the grid stands for at the floor drawn: a rating that
 * reaches it, one under it, or no rating at all.
 */
type FloorSide = 'down' | 'none' | 'up'

/**
 * The counts the grid draws from.
 */
const counts = omitted.OMISSIONS.floor
/**
 * The largest count of any one cell, which every cell is shaded against.
 */
const most = Math.max(...counts.counts.flat())
/**
 * The games of each row of ratings across every decade, the unrated row last.
 */
const rows = counts.bins.map((_, bin) => numbers.summed(counts.counts.map(decade => decade[bin]!)))
  .concat(numbers.summed(counts.counts.map(decade => decade.at(-1)!)))

/**
 * Draws one rect at `x` and `y` of the grid's cell size or a width of its own.
 */
function box(attrs: Record<string, unknown>, layout: omitted.FloorLayout, x: number, y: number): VNode {
  return h('rect', { height: layout.row - 1, rx: 1, width: numbers.tenth(layout.cell - 1), x, y, ...attrs })
}

/**
 * Draws every cell of the grid, a column per decade and a row per bin of
 * ratings, the highest on top and the unrated row apart beneath them, each
 * shaded by its games on a log scale and colored by where it stands.
 */
function cells(floor: number, layout: omitted.FloorLayout, lit: string | null): VNode[] {
  return counts.counts.flatMap((decade, column) => decade.flatMap((count, bin) => {
    if (!count) return []
    const standing = standingOf(bin, floor)
    return [box({
      'class'  : ['sc-data-floor-cell', dimmed(standing, lit)],
      'data-k' : standing,
      'style'  : { '--sc-data-level': omitted.levelOf(count, most).toFixed(3) }
    }, layout, numbers.tenth(layout.left + column * layout.cell), rowY(bin, layout))]
  }))
}

/**
 * Builds the calls a drag and a key set the floor through, a press capturing
 * the pointer until it lifts.
 */
function dragging(floor: ShallowRef<number>, layout: () => omitted.FloorLayout): Record<string, unknown> {
  let held = false
  const set = (event: PointerEvent): void => { floor.value = omitted.floorAt(layout(), pointerAt(event).y) }
  return {
    onKeydown: (event: KeyboardEvent) => {
      const at = stepped(omitted.floors.length - 1, event.key, 0, omitted.floors.indexOf(floor.value))
      if (at === undefined) return
      event.preventDefault()
      floor.value = omitted.floors[at]!
    },
    onPointercancel : () => { held = false },
    onPointerdown   : (event: PointerEvent) => {
      held = true
      const target = event.currentTarget as Element
      target.setPointerCapture(event.pointerId)
      set(event)
    },
    onPointermove : (event: PointerEvent) => { if (held) set(event) },
    onPointerup   : () => { held = false }
  }
}

/**
 * Draws the labels of the grid: the ratings each 500 apart beside the rows,
 * leaving out one the floor's own label covers, the unrated row's name, every
 * other decade beneath the strip, and the captions of the strip and the
 * margin.
 */
function labels(floor: number, layout: omitted.FloorLayout): VNode[] {
  const every   = layout.width < 480 ? 4 : 2
  const line    = rowY(counts.bins.indexOf(floor), layout) + layout.row
  const ratings = counts.bins.flatMap((low, bin) => {
    const y = rowY(bin, layout) + layout.row / 2 + 3
    if ((low % 500 && low !== 1) || Math.abs(y - line) < 14) return []
    return [axisLabel(low === 1 ? 'Under 1000' : String(low), layout.left - 8, y)]
  })
  return [
    ...ratings,
    axisLabel('Unrated', layout.left - 8, rowY(counts.bins.length, layout) + layout.row / 2 + 3),
    axisLabel('Reaching', layout.left - 8, layout.grid + layout.strip - 6),
    axisLabel('All decades', layout.edge, layout.height - 6, 'start'),
    ...counts.decades.flatMap((name, column) => column % every === 1
      ? [axisLabel(name, layout.left + (column + 0.5) * layout.cell, layout.height - 6, 'middle')]
      : [])
  ]
}

/**
 * Draws the margin beside the grid, a bar per row of the games it holds across
 * every decade against the row holding the most.
 */
function margin(floor: number, layout: omitted.FloorLayout, lit: string | null): VNode[] {
  const peak = Math.max(...rows)
  return rows.map((games, bin) => {
    const standing = standingOf(bin, floor)
    return h('rect', {
      'class'  : ['sc-data-floor-cell', dimmed(standing, lit)],
      'data-k' : standing,
      'height' : layout.row - 4,
      'style'  : { '--sc-data-level': '1' },
      'width'  : numbers.tenth(Math.max(1, games / peak * layout.margin)),
      'x'      : numbers.tenth(layout.edge),
      'y'      : rowY(bin, layout) + 1.5
    })
  })
}

/**
 * Finds the height a row of ratings starts at, the highest row on top and the
 * unrated row, which `bins.length` names, apart beneath the rest.
 */
function rowY(bin: number, layout: omitted.FloorLayout): number {
  const rated = counts.bins.length
  return bin === rated ? rated * layout.row + layout.gap : (rated - 1 - bin) * layout.row
}

/**
 * Draws the floor as a rule across the grid and the margin at the edge under
 * the floor's row, beside its rating in a pill over the axis.
 */
function rule(floor: number, layout: omitted.FloorLayout): VNode {
  const y = rowY(counts.bins.indexOf(floor), layout) + layout.row
  return h('g', { class: 'sc-data-floor-rule', transform: `translate(0 ${y})` }, [
    h('rect', { height: 2, width: layout.width - layout.left + 6, x: layout.left - 4, y: -1 }),
    h('rect', { class: 'sc-data-floor-pill', height: 18, rx: 9, width: layout.left - 10, x: 0, y: -9 }),
    h('text', { 'text-anchor': 'middle', 'x': (layout.left - 10) / 2, 'y': 3.5 }, numbers.counted(floor))
  ])
}

/**
 * Reads where a row of ratings stands at a floor, the unrated row, which
 * `bins.length` names, standing apart.
 */
function standingOf(bin: number, floor: number): FloorSide {
  if (bin === counts.bins.length) return 'none'
  return counts.bins[bin]! >= floor ? 'up' : 'down'
}

/**
 * Draws the strip beneath the grid, a bar per decade of the share of its games
 * reaching the floor.
 */
function strip(kept: omitted.Kept, layout: omitted.FloorLayout): VNode[] {
  const tall = layout.strip - 10
  return kept.decades.flatMap((games, column) => {
    const share = games / numbers.summed(counts.counts[column]!)
    const x     = numbers.tenth(layout.left + column * layout.cell)
    const width = numbers.tenth(layout.cell - 1)
    return [
      h('rect', { class: 'sc-data-floor-track', height: tall, width, x, y: layout.grid + 6 }),
      h('rect', {
        class  : 'sc-data-floor-kept',
        height : numbers.tenth(share * tall),
        width  : width,
        x      : x,
        y      : numbers.tenth(layout.grid + 6 + tall - share * tall)
      })
    ]
  })
}

/**
 * The Openings games as a grid of the decade each was played in by the higher
 * of its two ratings, shaded by its games on a log scale, with a margin of
 * each rating's games across every decade and a strip under each decade of
 * the share kept, all following a floor dragged up or down the grid.
 */
export const RatingFloor = defineComponent({
  name  : 'ScotchRatingFloor',
  setup : () => {
    const floor                           = shallowRef(counts.floor)
    const lit                             = shallowRef<string | null>(null)
    const { chart, layout, sized, style } = useChart(omitted.floorLayout)
    const handlers                        = dragging(floor, () => layout.value)

    return (): VNode => {
      const kept = omitted.keptAt(floor.value)
      return h(Plate, {
        big      : numbers.percent(kept.kept / kept.total),
        readings : [
          ['Floor', numbers.counted(floor.value)],
          ['Kept', numbers.counted(kept.kept)],
          ['Under the floor', numbers.counted(kept.under)],
          ['Unrated', numbers.counted(kept.unrated)]
        ],
        say: omitted.floorSentence(floor.value, kept)
      }, () => h('div', { class: 'sc-data-floor' }, [
        h(Corner, {
          'items'        : omitted.FLOOR_MARKS,
          'lit'          : lit.value,
          'onUpdate:lit' : (key: string | null) => { lit.value = key }
        }),
        h('div', { class: 'sc-data-chart', ref: chart, style: style.value }, sized.value
          ? [h('svg', {
              'aria-label'    : 'The Openings games by decade and by the higher of their two ratings',
              'aria-valuemax' : omitted.floors.at(-1),
              'aria-valuemin' : omitted.floors[0],
              'aria-valuenow' : floor.value,
              'class'         : 'sc-data-svg',
              'height'        : layout.value.height,
              'role'          : 'slider',
              'tabindex'      : 0,
              'viewBox'       : `0 0 ${layout.value.width} ${layout.value.height}`,
              'width'         : layout.value.width,
              ...handlers
            }, [
              ...cells(floor.value, layout.value, lit.value),
              ...margin(floor.value, layout.value, lit.value),
              ...strip(kept, layout.value),
              ...labels(floor.value, layout.value),
              rule(floor.value, layout.value)
            ])]
          : [])
      ]))
    }
  }
})
