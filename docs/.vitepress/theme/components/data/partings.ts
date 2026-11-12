import { type VNode, defineComponent, h, shallowRef } from 'vue'

import { pointerAt, useChart } from '../../../lib/data/chart.ts'
import { dimmed }              from '../../../lib/data/corner.ts'
import * as numbers            from '../../../lib/data/numbers.ts'
import * as parting            from '../../../lib/data/parting.ts'
import { Corner }              from './corner.ts'
import { Plate, axisLabel }    from './plate.ts'

/**
 * Each decade's parting, the earliest first, one row of the grid each.
 */
const decades = parting.SHARED.decades
/**
 * The columns of the grid, one per move drawn.
 */
const columns = parting.LAST_MOVE + 1

/**
 * Draws a row of the grid per decade, a cell per move shaded by the share of
 * the decade's games still sharing a position there, and a tick at the move
 * half of them stand alone by.
 */
function cells(layout: parting.PartingsLayout, lit: string | null): VNode[] {
  return decades.flatMap((decade, row) => [
    ...decade.sharing.map((_, move) => h('rect', {
      class  : ['sc-data-partings-cell', dimmed('cells', lit)],
      height : layout.row - 1.4,
      rx     : 1,
      style  : { '--sc-data-level': parting.sharingAt(decade, move).toFixed(3) },
      width  : numbers.tenth(Math.max(0, layout.cell - 0.8)),
      x      : numbers.tenth(layout.left + move * layout.cell),
      y      : row * layout.row
    })),
    h('rect', {
      'class'  : ['sc-data-partings-half', dimmed('half', lit)],
      'data-k' : 'half',
      'height' : layout.row + 0.6,
      'width'  : 2,
      'x'      : numbers.tenth(parting.columnOn(layout, Math.min(decade.half, parting.LAST_MOVE)) - 1),
      'y'      : row * layout.row - 1
    })
  ])
}

/**
 * Draws the line at the move picked down the grid and the line beneath it, the
 * box round the decade picked, and the dot where the line of that decade meets
 * the move.
 */
function cursor(cell: parting.PartingCell, layout: parting.PartingsLayout): VNode[] {
  const x = numbers.tenth(parting.columnOn(layout, cell.move))
  const y = lineY(layout, parting.sharingAt(decades[cell.decade]!, cell.move))
  return [
    h('rect', {
      class  : 'sc-data-partings-row',
      height : layout.row,
      rx     : 2,
      width  : numbers.tenth(layout.cell * columns + 2),
      x      : layout.left - 1,
      y      : cell.decade * layout.row - 0.5
    }),
    h('line', { class: 'sc-data-partings-cursor', x1: x, x2: x, y1: 0, y2: layout.line + layout.tall }),
    h('circle', { class: 'sc-data-partings-dot', cx: x, cy: y, r: 4 })
  ]
}

/**
 * Draws the names of the decades beside the rows, the decade picked in bold,
 * the rules at none, half, and all of the games still playing beside the line,
 * and the moves beneath it.
 */
function frame(cell: parting.PartingCell, layout: parting.PartingsLayout): VNode[] {
  const base = layout.height - 6
  return [
    ...decades.map((decade, row) => h('text', {
      'class'       : ['sc-data-partings-name', { 'sc-data-on': row === cell.decade }],
      'text-anchor' : 'end',
      'x'           : layout.left - 8,
      'y'           : row * layout.row + layout.row / 2 + 3
    }, decade.name)),
    ...[0, 0.5, 1].flatMap(share => {
      const y = lineY(layout, share)
      return [
        h('rect', { class: 'sc-data-grid', height: 1, width: layout.cell * columns, x: layout.left, y }),
        axisLabel(numbers.percent(share), layout.left - 8, y + 3)
      ]
    }),
    ...parting.MOVE_TICKS.map(at => axisLabel(String(at), parting.columnOn(layout, at), base, 'middle')),
    axisLabel('move', layout.left - 8, base)
  ]
}

/**
 * Draws every stored game's line and the line of the decade picked over it,
 * each the share still sharing a position at each move.
 */
function lines(cell: parting.PartingCell, layout: parting.PartingsLayout, lit: string | null): VNode[] {
  const path = (set: parting.Parting): string => numbers.pathThrough(set.sharing.map((_, move) => [
    parting.columnOn(layout, move),
    lineY(layout, parting.sharingAt(set, move))
  ]))
  return [
    h('path', {
      'class'  : ['sc-data-partings-every', dimmed('every', lit)],
      'd'      : path(parting.SHARED.every),
      'data-k' : 'every'
    }),
    h('path', {
      'class'  : ['sc-data-partings-line', dimmed('decade', lit)],
      'd'      : path(decades[cell.decade]!),
      'data-k' : 'decade'
    })
  ]
}

/**
 * Finds the height a share of a decade's games stands at on the line beneath
 * the grid.
 */
function lineY(layout: parting.PartingsLayout, share: number): number {
  return numbers.tenth(layout.line + (1 - share) * layout.tall)
}

/**
 * Draws the grid and the line beneath it at a cell as one slider the pointer
 * and the arrow keys move across, every part but the one `lit` names dimmed.
 */
function plot(
  calls  : Record<string, unknown>,
  cell   : parting.PartingCell,
  layout : parting.PartingsLayout,
  lit    : string | null
): VNode {
  const decade = decades[cell.decade]!
  return h('svg', {
    'aria-label'     : 'Each decade’s share of its games still sharing a position at each move',
    'aria-valuemax'  : parting.LAST_MOVE,
    'aria-valuemin'  : 0,
    'aria-valuenow'  : cell.move,
    'aria-valuetext' : parting.partingsSentence(cell.move, decade),
    'class'          : 'sc-data-svg',
    'height'         : layout.height,
    'role'           : 'slider',
    'tabindex'       : 0,
    'viewBox'        : `0 0 ${layout.width} ${layout.height}`,
    'width'          : layout.width,
    ...calls
  }, [
    ...cells(layout, lit),
    ...frame(cell, layout),
    ...lines(cell, layout, lit),
    ...cursor(cell, layout)
  ])
}

/**
 * Each decade's share of its games still sharing a position at each move as a
 * row of shaded cells, a tick at the move half of them stand alone by, over the
 * line of the decade picked drawn against every stored game's, a reader picking
 * a decade and a move with a pointer, a finger, or the arrow keys.
 */
export const SharedPartings = defineComponent({
  name  : 'ScotchSharedPartings',
  setup : () => {
    const cell = shallowRef<parting.PartingCell>({ decade: decades.length - 1, move: 10 })
    const lit  = shallowRef<string | null>(null)

    const { chart, layout, sized, style } = useChart(parting.partingsLayout)

    const pointed = (event: PointerEvent): void => {
      const { x, y } = pointerAt(event)
      cell.value     = parting.cellNear(cell.value, layout.value, x, y)
    }
    const calls = {
      onKeydown: (event: KeyboardEvent) => {
        const to = parting.cellStepped(cell.value, event.key)
        if (to === undefined) return
        event.preventDefault()
        cell.value = to
      },
      onPointerdown : pointed,
      onPointermove : pointed
    }

    return (): VNode => {
      const decade = decades[cell.value.decade]!
      const share  = numbers.percent(parting.sharingAt(decade, cell.value.move))
      return h(Plate, {
        big      : share,
        readings : [
          ['Decade', decade.name],
          ['At move', String(cell.value.move)],
          ['Still sharing', share],
          ['Half alone by', `move ${decade.half}`],
          ['Middle half parts', parting.middleHalf(decade)]
        ],
        say: parting.partingsSentence(cell.value.move, decade)
      }, () => h('div', { class: 'sc-data-partings' }, [
        h(Corner, {
          'items'        : parting.PARTINGS_MARKS,
          'lit'          : lit.value,
          'onUpdate:lit' : (key: string | null) => { lit.value = key }
        }),
        h('div', { class: 'sc-data-chart', ref: chart, style: style.value }, sized.value
          ? [plot(calls, cell.value, layout.value, lit.value)]
          : [])
      ]))
    }
  }
})
