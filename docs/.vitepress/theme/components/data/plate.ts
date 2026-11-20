import { type PropType, type VNode, defineComponent, h } from 'vue'

import * as lengths from '../../../lib/data/lengths.ts'
import { tenth }    from '../../../lib/data/numbers.ts'
import * as parts   from './parts.ts'

/**
 * The line of reading a plate ends on where it holds no readings.
 */
const LINE = 'm-0! min-h-10 font-code text-[0.65rem]/[20px]! font-medium tracking-[0.06em] '
           + 'text-(--sc-data-quiet) tabular-nums'
/**
 * The row of readings beneath a plate's chart, each a label over its value,
 * ruled above in the ink.
 */
const READ = 'm-0 grid grid-cols-[repeat(5,minmax(0,1fr))] gap-x-4 gap-y-2 border-t-[1.5px] '
           + 'border-t-(--sc-data-ink) pt-2.5 *:grid *:min-w-0 *:gap-px '
           + 'max-sm:grid-cols-[repeat(3,minmax(0,1fr))]'
/**
 * The row the plate's tools sit in, over its chart.
 */
const TOOLS = 'flex min-h-[30px] flex-wrap items-center gap-x-2.5 gap-y-2'
/**
 * The value of a reading, in figures of one width.
 */
const VALUE = 'm-0 min-h-5 font-code text-[0.82rem]/[20px] font-medium whitespace-nowrap tabular-nums'

/**
 * Draws one reading as a label over its value, the first reading's value in the
 * display face and any count beside a value in a smaller type.
 */
function reading([label, value, count]: readonly string[], index: number): VNode {
  return h('div', [
    h('dt', {
      class: 'font-code text-[0.6rem] font-medium tracking-[0.1em] text-(--sc-data-quiet) uppercase'
    }, label),
    h('dd', { class: VALUE }, [
      index > 0
        ? value
        : h('b', { class: 'font-display text-[1.05rem]/[20px] font-normal lining-nums tabular-nums' }, value),
      count ? h('small', { class: 'text-[0.7rem] text-(--sc-data-quiet)' }, ` ${count}`) : null
    ])
  ])
}

/**
 * Draws one label of a chart's axes in the code face at `x` and `y`, its end
 * at that point unless `anchor` sets it elsewhere.
 */
export function axisLabel(text: string, x: number, y: number, anchor = 'end'): VNode {
  return h('text', {
    'class'       : parts.AXIS,
    'text-anchor' : anchor,
    'x'           : tenth(x),
    'y'           : tenth(y)
  }, text)
}

/**
 * Draws the axis of moves beneath a chart at `y`, one label at each move
 * `TICKS` names, hidden from a screen reader.
 */
export function moveTicks(layout: Pick<lengths.SharesLayout, 'left' | 'plot'>, y: number): VNode[] {
  return lengths.TICKS.map(tick => h('text', {
    'aria-hidden' : 'true',
    class         : parts.AXIS,
    'text-anchor' : 'middle',
    x             : tenth(lengths.moveX(layout, tick)),
    y             : y
  }, String(tick)))
}

/**
 * Draws the line at the move a chart follows, `height` pixels tall from `top`
 * and standing at `x` to the tenth of a pixel.
 */
export function moverLine(height: number, x: number, top = 0): VNode {
  return h('i', {
    'aria-hidden' : 'true',
    'class'       : 'pointer-events-none absolute top-0 left-0 -ml-[0.5px] w-px bg-(--sc-data-ink) '
                  + 'will-change-transform',
    'data-mover'  : '',
    'style'       : { height: `${height}px`, top: `${top}px`, transform: `translate3d(${tenth(x)}px, 0, 0)` }
  })
}

/**
 * The plate every Data widget sits on: a figure in the display face beside the
 * sentence it reads as, the controls and the chart in its slots, and beneath
 * them either a row of readings, each a label over its value with an optional
 * count in a smaller type, or one line of reading where it is given one.
 */
export const Plate = defineComponent({
  name: 'ScotchDataPlate',

  props: {
    big      : { default: '', type: String },
    line     : { default: '', type: String },
    readings : { default: () => [], type: Array as PropType<readonly (readonly string[])[]> },
    say      : { default: '', type: String }
  },

  setup: (props, { slots }) => (): VNode => h('div', { class: parts.PLATE }, [
    props.big || props.say
      ? h('div', { class: parts.HEAD }, [
          h('span', { class: parts.BIG }, props.big),
          h('p', { class: parts.SAY }, props.say)
        ])
      : null,
    slots.tools ? h('div', { class: TOOLS }, slots.tools()) : null,
    slots.default?.(),
    props.readings.length > 0
      ? h('dl', { 'aria-live': 'polite', 'class': READ }, props.readings.map(reading))
      : props.line ? h('p', { 'aria-live': 'polite', 'class': LINE }, props.line) : null
  ])
})
