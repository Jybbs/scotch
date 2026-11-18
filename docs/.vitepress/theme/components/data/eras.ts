import { clamp } from '@vueuse/core'
import { type VNode, defineComponent, h, shallowRef, useId } from 'vue'

import { pointerAt, useChart }         from '../../../lib/data/chart.ts'
import { stepped }                     from '../../../lib/data/keys.ts'
import * as lengths                    from '../../../lib/data/lengths.ts'
import { useGlide, useMove }           from '../../../lib/data/move.ts'
import * as ridges                     from '../../../lib/data/ridges.ts'
import * as parts                      from './parts.ts'
import { Plate, moveTicks, moverLine } from './plate.ts'

/**
 * The ground of a ridge, deepened while its era is picked.
 */
const FILL = 'fill-[color-mix(in_oklab,var(--sc-data-link)_9%,var(--sc-data-page))] '
           + 'group-data-on/ridge:fill-[color-mix(in_oklab,var(--sc-data-link)_30%,var(--sc-data-page))]'
/**
 * The edge of a ridge, inked and thickened while its era is picked.
 */
const LINE = 'fill-none stroke-[color-mix(in_oklab,var(--sc-data-ink)_55%,var(--sc-data-page))] stroke-[1.2] '
           + 'group-data-on/ridge:stroke-(--sc-data-ink) group-data-on/ridge:stroke-[1.8]'
/**
 * A ridge, risen into place in its row's turn and lifted while its era is
 * picked.
 */
const RIDGE = [
  'group/ridge animate-rise transition-transform duration-settle ease-glide',
  '[animation-delay:calc(var(--sc-data-row)*var(--sc-duration-lag))] data-on:[transform:translate(0,-3px)]'
]

/**
 * Draws one ridge as an option of the list: its fill, its line, the rule at its
 * median, and its name beside it, lifted where it is picked.
 */
function ridgeDrawing(
  id     : string,
  layout : ridges.RidgesLayout,
  picked : number,
  ridge  : ridges.Ridge,
  row    : number
): VNode {
  const base   = ridges.ridgeBase(layout, row)
  const median = ridge.quartiles[1]

  return h('g', {
    'aria-label'    : `${ridge.name}, half ending by move ${median}`,
    'aria-selected' : row === picked,
    'class'         : RIDGE,
    'data-on'       : row === picked ? '' : undefined,
    'id'            : `${id}-${row}`,
    'role'          : 'option',
    'style'         : { '--sc-data-row': row }
  }, [
    h('path', { 'aria-hidden': 'true', 'class': FILL, 'd': ridges.ridgePath(ridge, layout, row, true) }),
    h('path', { 'aria-hidden': 'true', 'class': LINE, 'd': ridges.ridgePath(ridge, layout, row) }),
    h('rect', {
      'aria-hidden' : 'true',
      'class'       : 'fill-(--sc-data-link)',
      'width'       : 1.5,
      ...ridges.medianRule(ridge, layout, row)
    }),
    h('text', {
      'aria-hidden' : 'true',
      'class'       : [parts.AXIS, 'group-data-on/ridge:fill-(--sc-data-ink) group-data-on/ridge:font-bold'],
      'text-anchor' : 'end',
      'x'           : layout.left - 10,
      'y'           : base - 3
    }, ridge.label)
  ])
}

/**
 * Draws every ridge, the oldest at the top, over the axis of moves.
 */
function ridgesSvg(
  all    : readonly ridges.Ridge[],
  id     : string,
  layout : ridges.RidgesLayout,
  picked : number
): VNode {
  const { height, left, plot, width } = layout

  return h('svg', { class: parts.SVG, height, viewBox: `0 0 ${width} ${height}`, width }, [
    ...all.map((ridge, row) => ridgeDrawing(id, layout, picked, ridge, row)),
    h('rect', {
      'aria-hidden' : 'true',
      class         : 'fill-(--sc-data-ink)',
      height        : 1,
      width         : plot,
      x             : left,
      y             : height - 24
    }),
    ...moveTicks(layout, height - 8)
  ])
}

/**
 * The games of each decade as ridges, the oldest at the top, each rising where
 * that decade's games most often end and drawn to its own height with its
 * median ruled through it. A reader picks a ridge with a pointer or the up and
 * down arrows to read it whole and moves along the moves with a pointer or the
 * left and right arrows, the move shared with the chart of results by length.
 */
export const Eras = defineComponent({
  name  : 'ScotchEras',
  setup : () => {
    const all    = ridges.ridgesOf()
    const move   = useMove()
    const picked = shallowRef(all.length - 1)
    const id     = useId()
    const glide  = useGlide(move)

    const { chart, layout, sized, style } = useChart(width => ridges.ridgesLayout(all.length, width))

    const pointed = (event: PointerEvent): void => {
      const { x, y } = pointerAt(event)
      const at       = ridges.ridgeAt(all.length, layout.value, x, y)
      picked.value   = at.row
      if (x < layout.value.left) return
      glide.quick.value = true
      move.value        = at.move
    }

    const keyed = (event: KeyboardEvent): void => {
      const row  = { ArrowDown: picked.value + 1, ArrowUp: picked.value - 1 }[event.key]
      const step = stepped(lengths.CHART.plotted, event.key, 1, move.value, false)
      if (row === undefined && step === undefined) return
      event.preventDefault()
      glide.quick.value = false
      picked.value      = clamp(row ?? picked.value, 0, all.length - 1)
      move.value        = step ?? move.value
    }

    return (): VNode => h(Plate, {
      big      : String(all[picked.value]!.quartiles[1]),
      readings : ridges.ridgeReading(all[picked.value]!, move.value),
      say      : ridges.ridgeSummary(all, picked.value)
    }, () => h('div', {
      'aria-activedescendant' : `${id}-${picked.value}`,
      'aria-label'            : 'Decades. Up and Down pick a decade, Left and Right move along the moves.',
      class                   : [parts.CHART, 'cursor-crosshair touch-pan-y'],
      onKeydown               : keyed,
      onPointerdown           : pointed,
      onPointermove           : pointed,
      ref                     : chart,
      role                    : 'listbox',
      style                   : style.value,
      tabindex                : 0
    }, sized.value ? [
      ridgesSvg(all, id, layout.value, picked.value),
      moverLine(layout.value.height - 24, lengths.moveX(layout.value, glide.shown.value))
    ] : []))
  }
})
