import { type VNode, defineComponent, h, shallowRef } from 'vue'

import { pointerAt, useChart } from '../../../lib/data/chart.ts'
import { dimmed }              from '../../../lib/data/corner.ts'
import { stepped }             from '../../../lib/data/keys.ts'
import * as numbers            from '../../../lib/data/numbers.ts'
import * as parting            from '../../../lib/data/parting.ts'
import { Corner }              from './corner.ts'
import { Plate, axisLabel }    from './plate.ts'

/**
 * Every stored game's parting, which the chart draws.
 */
const every = parting.SHARED.every
/**
 * The largest share of the stored games first standing alone at any one move,
 * which every bar of the strip is drawn against.
 */
const most = Math.max(...every.alone.map((_, move) => parting.aloneAt(every, move)))

/**
 * Draws the strip beneath the line, a bar per move as tall as the share of
 * the stored games first standing alone there, the bar at `move` lit.
 */
function bars(layout: parting.PartingLayout, lit: string | null, move: number): VNode[] {
  const wide = layout.plot / parting.LAST_MOVE * 0.66
  return every.alone.map((_, at) => {
    const tall = Math.max(0.8, parting.aloneAt(every, at) / most * layout.strip)
    return h('rect', {
      'class'  : ['sc-data-parting-bar', dimmed('alone', lit), { 'sc-data-on': at === move }],
      'data-k' : 'alone',
      'height' : numbers.tenth(tall),
      'rx'     : 1,
      'width'  : numbers.tenth(wide),
      'x'      : numbers.tenth(parting.moveOn(layout, at) - wide / 2),
      'y'      : numbers.tenth(layout.base - tall)
    })
  })
}

/**
 * Draws the line at `move`, the dot where it meets the share still sharing,
 * and that share beside the dot, turned to the left past move 30.
 */
function cursor(layout: parting.PartingLayout, move: number): VNode[] {
  const x     = numbers.tenth(parting.moveOn(layout, move))
  const y     = shareY(layout, parting.sharingAt(every, move))
  const right = move > 30
  return [
    h('line', { class: 'sc-data-parting-cursor', x1: x, x2: x, y1: layout.top - 4, y2: layout.base }),
    h('circle', { class: 'sc-data-parting-dot', cx: x, cy: y, r: 4.5 }),
    h('text', {
      'class'       : 'sc-data-parting-tag',
      'text-anchor' : right ? 'end' : 'start',
      'x'           : x + (right ? -9 : 9),
      'y'           : Math.max(layout.top + 18, y - 9)
    }, numbers.percent(parting.sharingAt(every, move)))
  ]
}

/**
 * Draws the share still sharing at each move as a filled line over the grid
 * of its quarters.
 */
function curve(layout: parting.PartingLayout, lit: string | null): VNode[] {
  const points = every.sharing.map((_, move): [number, number] => [
    parting.moveOn(layout, move),
    shareY(layout, parting.sharingAt(every, move))
  ])
  const floor = shareY(layout, 0)
  const foot  = [[parting.moveOn(layout, parting.LAST_MOVE), floor], [layout.left, floor]] as const
  return [
    h('path', {
      'class'  : ['sc-data-parting-area', dimmed('sharing', lit)],
      'd'      : numbers.pathThrough(points, foot),
      'data-k' : 'sharing'
    }),
    h('path', {
      'class'  : ['sc-data-parting-line', dimmed('sharing', lit)],
      'd'      : numbers.pathThrough(points),
      'data-k' : 'sharing'
    })
  ]
}

/**
 * Draws the rules at none, half, and all of the stored games still playing,
 * each named at the left, the base of the strip, and the moves beneath.
 */
function frame(layout: parting.PartingLayout): VNode[] {
  const foot = layout.height - 6
  return [
    ...[0, 0.5, 1].flatMap(share => {
      const y = shareY(layout, share)
      return [
        h('rect', { class: 'sc-data-grid', height: 1, width: layout.plot, x: layout.left, y }),
        axisLabel(numbers.percent(share), layout.left - 6, y + 3)
      ]
    }),
    h('rect', { class: 'sc-data-base', height: 1, width: layout.plot, x: layout.left, y: layout.base }),
    ...parting.MOVE_TICKS.map(move => axisLabel(String(move), parting.moveOn(layout, move), foot, 'middle')),
    axisLabel('move', layout.left - 12, foot)
  ]
}

/**
 * Draws the rule at the move half the stored games stand alone by, named
 * beside it.
 */
function half(layout: parting.PartingLayout, lit: string | null): VNode {
  const x = numbers.tenth(parting.moveOn(layout, every.half))
  return h('g', { 'class': ['sc-data-parting-half', dimmed('half', lit)], 'data-k': 'half' }, [
    h('line', { x1: x, x2: x, y1: layout.top, y2: layout.base }),
    h('text', { x: x + 6, y: layout.top + 4 }, `half alone by move ${every.half}`)
  ])
}

/**
 * Draws the chart at `move` as a slider the pointer and the arrow keys move
 * along, every part but the one `lit` names dimmed.
 */
function plot(
  calls  : Record<string, unknown>,
  layout : parting.PartingLayout,
  lit    : string | null,
  move   : number
): VNode {
  return h('svg', {
    'aria-label'     : 'The share of the stored games still sharing a position at each move',
    'aria-valuemax'  : parting.LAST_MOVE,
    'aria-valuemin'  : 0,
    'aria-valuenow'  : move,
    'aria-valuetext' : parting.partingSentence(move),
    'class'          : 'sc-data-svg',
    'height'         : layout.height,
    'role'           : 'slider',
    'tabindex'       : 0,
    'viewBox'        : `0 0 ${layout.width} ${layout.height}`,
    'width'          : layout.width,
    ...calls
  }, [
    ...frame(layout),
    ...curve(layout, lit),
    half(layout, lit),
    ...bars(layout, lit, move),
    ...cursor(layout, move)
  ])
}

/**
 * Finds the height a share of the stored games stands at on the line.
 */
function shareY(layout: parting.PartingLayout, share: number): number {
  return numbers.tenth(layout.top + (1 - share) * layout.tall)
}

/**
 * Every stored game's share still sharing a position at each move as a filled
 * line, over a strip of the share first standing alone at each move, a reader
 * moving along the moves with a pointer, a finger, or the arrow keys and the
 * marks in the corner naming each part.
 */
export const SharedParting = defineComponent({
  name  : 'ScotchSharedParting',
  setup : () => {
    const lit  = shallowRef<string | null>(null)
    const move = shallowRef(10)

    const { chart, layout, sized, style } = useChart(parting.partingLayout)

    const pointed = (event: PointerEvent): void => {
      move.value = parting.moveNear(layout.value, pointerAt(event).x)
    }
    const keyed = (event: KeyboardEvent): void => {
      const to = stepped(parting.LAST_MOVE, event.key, 0, move.value)
      if (to === undefined) return
      event.preventDefault()
      move.value = to
    }
    const calls = { onKeydown: keyed, onPointerdown: pointed, onPointermove: pointed }

    return (): VNode => h(Plate, {
      big      : numbers.percent(parting.sharingAt(every, move.value)),
      readings : [
        ['Move', String(move.value)],
        ['Still sharing', numbers.percent(parting.sharingAt(every, move.value))],
        ['Stand alone here', numbers.percent(parting.aloneAt(every, move.value), 1)],
        ['Half alone by', `move ${every.half}`]
      ],
      say: parting.partingSentence(move.value)
    }, () => h('div', { class: 'sc-data-parting' }, [
      h(Corner, {
        'items'        : parting.PARTING_MARKS,
        'lit'          : lit.value,
        'onUpdate:lit' : (key: string | null) => { lit.value = key }
      }),
      h('div', { class: 'sc-data-chart', ref: chart, style: style.value }, sized.value
        ? [plot(calls, layout.value, lit.value, move.value)]
        : [])
    ]))
  }
})
