import { type PropType, type VNode, defineComponent, h } from 'vue'

import type { Drive } from '../../../lib/front/drive.ts'
import { Plate }      from '../data/plate.ts'
import { Clock }      from './clock.ts'
import { Count }      from './count.ts'

/**
 * What a widget's readout names at a step: its figure in the display face, an
 * empty figure while the widget waits on one, the unit set beside it, the
 * sentence it reads as, and a row of readings, each a label over its value.
 */
export interface Readout {
  big      : string
  readings : readonly (readonly string[])[]
  say      : string
  unit     : string
}

/**
 * Draws the head of a widget's readout, its count and its unit on one line and
 * the sentence on a row of its own beneath them.
 */
function head({ big, say, unit }: Readout): VNode {
  const figure = [h(Count, { figure: big }), h('span', { class: 'sc-front-unit' }, unit)]
  return h('div', { class: 'sc-front-head' }, [
    h('div', { class: 'sc-front-figure' }, figure),
    h('p', { class: 'sc-front-say' }, say)
  ])
}

/**
 * The panel every front page widget sits on, the Data widgets' plate holding
 * the widget's count, its unit, and its sentence, the drawing in its slot, the
 * clock line naming each step beneath it, and the row of readings, a pointer
 * resting on the panel or focus sitting inside it holding the widget where it
 * stands.
 */
export const Panel = defineComponent({
  name: 'ScotchFrontPanel',

  props: {
    drive   : { required: true, type: Object as PropType<Drive> },
    label   : { required: true, type: String },
    names   : { required: true, type: Array as PropType<readonly string[]> },
    readout : { required: true, type: Object as PropType<Readout> }
  },

  setup: (props, { slots }) => (): VNode => h('div', {
    class          : 'sc-front-panel',
    onFocusin      : () => props.drive.hold(true),
    onFocusout     : () => props.drive.hold(false),
    onPointerenter : () => props.drive.hold(true),
    onPointerleave : () => props.drive.hold(false)
  }, h(Plate, { readings: props.readout.readings }, () => [
    head(props.readout),
    h('div', { class: 'sc-front-draw' }, slots.default?.()),
    h(Clock, { at: props.drive.at.value, label: props.label, names: props.names, pick: props.drive.go })
  ]))
})
