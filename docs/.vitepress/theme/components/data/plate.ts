import { type PropType, type VNode, defineComponent, h } from 'vue'

import * as lengths from '../../../lib/data/lengths.ts'
import { tenth }    from '../../../lib/data/numbers.ts'

/**
 * Draws one reading as a label over its value, the first reading's value in the
 * display face and any count beside a value in a smaller type.
 */
function reading([label, value, count]: readonly string[], index: number): VNode {
  return h('div', [
    h('dt', label),
    h('dd', [index > 0 ? value : h('b', value), count ? h('small', ` ${count}`) : null])
  ])
}

/**
 * Draws the axis of moves beneath a chart at `y`, one label at each move
 * `TICKS` names, hidden from a screen reader.
 */
export function moveTicks(layout: Pick<lengths.SharesLayout, 'left' | 'plot'>, y: number): VNode[] {
  return lengths.TICKS.map(tick => h('text', {
    'aria-hidden' : 'true',
    class         : 'sc-data-axis',
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
    class : 'sc-data-mover',
    style : { height: `${height}px`, top: `${top}px`, transform: `translate3d(${tenth(x)}px, 0, 0)` }
  })
}

/**
 * The plate every Data widget sits on: a figure in the display face beside the
 * sentence it reads as, the controls and the chart in its slots, and beneath
 * them either a row of readings, each a label over its value with an optional
 * count in a smaller type, or one line of reading.
 */
export const Plate = defineComponent({
  name: 'ScotchDataPlate',

  props: {
    big      : { default: '', type: String },
    line     : { default: '', type: String },
    readings : { default: () => [], type: Array as PropType<readonly (readonly string[])[]> },
    say      : { default: '', type: String }
  },

  setup: (props, { slots }) => (): VNode => h('div', { class: 'sc-data sc-data-plate' }, [
    props.big || props.say
      ? h('div', { class: 'sc-data-head' }, [
          h('span', { class: 'sc-data-big' }, props.big),
          h('p', { class: 'sc-data-say' }, props.say)
        ])
      : null,
    slots.tools ? h('div', { class: 'sc-data-tools' }, slots.tools()) : null,
    slots.default?.(),
    props.readings.length > 0
      ? h('dl', { 'aria-live': 'polite', class: 'sc-data-read' }, props.readings.map(reading))
      : h('p', { 'aria-live': 'polite', class: 'sc-data-line' }, props.line)
  ])
})
