import { type PropType, type VNode, defineComponent, h } from 'vue'

import type { CornerMark } from '../../../lib/data/corner.ts'

/**
 * The marks set in a figure's corner, one per item, in a row or a column, each
 * a swatch of its color or its glyph that opens onto its label in capitals on
 * hover or focus and lights the parts of the figure it names, which its
 * figure reads through `lit`.
 */
export const Corner = defineComponent({
  name: 'ScotchDataCorner',

  props: {
    column : { default: false, type: Boolean },
    items  : { required: true, type: Array as PropType<readonly CornerMark[]> },
    lit    : { default: null, type: String as PropType<string | null> }
  },

  emits: { 'update:lit': (key: string | null) => key === null || typeof key === 'string' },

  setup: (props, { emit }) => {
    const light = (key: string | null): void => { emit('update:lit', key) }

    return (): VNode => h('div', {
      'aria-label' : 'What each mark shows',
      'class'      : ['sc-data-corner', { 'sc-data-corner-column': props.column }],
      'role'       : 'list'
    }, props.items.map(({ glyph, key, label, tone }) => h('button', {
      'aria-label'     : label,
      'class'          : ['sc-data-mark', { 'sc-data-on': key !== null && key === props.lit }],
      'onBlur'         : () => { light(null) },
      'onFocus'        : () => { light(key) },
      'onPointerenter' : () => { light(key) },
      'onPointerleave' : () => { light(null) },
      'role'           : 'listitem',
      'style'          : { '--sc-data-mark': tone },
      'type'           : 'button'
    }, [h('i', glyph ?? ''), h('span', label)])))
  }
})
