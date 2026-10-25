import { useResizeObserver }                                         from '@vueuse/core'
import { type PropType, type VNode, defineComponent, h, shallowRef } from 'vue'

import * as controls    from '../../../lib/viewer/controls.ts'
import type { Loaded } from '../../../lib/viewer/loaded.ts'
import { snapRow }     from '../../../lib/viewer/pixel.ts'
import type { Facing } from '../../../lib/viewer/trail.ts'

/**
 * Draws one control as a button naming its step beside the cap of its first
 * key and listing every key that takes it, `state` setting whether it goes
 * nowhere or presses.
 */
function drawControl(
  control : controls.Key,
  state   : Record<string, boolean | string>,
  onClick : () => void
): VNode {
  return h('button', {
    'aria-keyshortcuts' : control.keys.map(key => key.length === 1 ? key.toUpperCase() : key).join(' '),
    'class'             : 'sc-viewer-control',
    'data-control'      : control.name,
    'onClick'           : onClick,
    'title'             : control.title,
    'type'              : 'button',
    ...state
  }, [h('span', control.label), h('kbd', { 'aria-hidden': 'true', 'class': 'sc-viewer-key' }, control.cap)])
}

/**
 * The controls on a pill, the four steps in one group and the two the shared
 * run gives in another beside the flip, each a button naming its step beside
 * the cap of its first key and listing every key that takes it, a control that
 * goes nowhere from the cursor disabled and the flip pressed while the boards
 * face Black's side, the whole row kept on whole device pixels as it and its
 * column resize.
 */
export const Controls = defineComponent({
  name: 'ScotchControls',

  props: {
    cursor : { required: true, type: Number },
    facing : { required: true, type: String as PropType<Facing> },
    loaded : { required: true, type: Object as PropType<Loaded> }
  },

  emits: {
    go   : (to: number | undefined) => to === undefined || Number.isFinite(to),
    turn : (facing: Facing) => facing === 'black' || facing === 'white'
  },

  setup: (props, { emit }) => {
    const row = shallowRef<HTMLElement | null>(null)

    useResizeObserver([row, () => row.value?.parentElement], () => {
      if (row.value) snapRow(row.value, window.devicePixelRatio || 1)
    })

    const button = (control: controls.Control): VNode => drawControl(control, {
      disabled: controls.idle(control, props.cursor, props.loaded)
    }, () => {
      emit('go', control.to(props.loaded, props.cursor))
    })

    const flip = (): VNode => drawControl(controls.FLIP, {
      'aria-pressed': String(props.facing === 'black')
    }, () => {
      emit('turn', props.facing === 'white' ? 'black' : 'white')
    })

    const grouped = (group: string): (VNode | null)[] => [
      ...controls.CONTROLS.filter(control => control.group === group).map(control => button(control)),
      group === 'run' ? flip() : null
    ]

    return () => h('div', {
      'aria-label' : 'Step through the match',
      'class'      : 'sc-viewer-controls',
      'ref'        : row,
      'role'       : 'group'
    }, Object.entries(controls.GROUPS).map(([group, label]) => h('div', {
      'aria-label' : label,
      'class'      : 'sc-viewer-group',
      'data-group' : group,
      'role'       : 'group'
    }, grouped(group))))
  }
})
