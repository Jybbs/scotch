import { useMutationObserver } from '@vueuse/core'
import { type PropType, type VNode, defineComponent, h, onMounted, shallowRef } from 'vue'

import type { CornerMark } from '../../../lib/data/corner.ts'

/**
 * The legend set in a figure's corner: a rank of squares, one per item in a
 * row or a column, each its color or its glyph, over one caption line. A
 * square under the pointer or the focus names its label on the caption and
 * lights the parts of the figure it names, which its figure reads through
 * `lit`, and while none is, the caption names the part the chart holds
 * pressed.
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
    const shown = shallowRef<number | null>(null)
    const root  = shallowRef<HTMLElement | null>(null)
    const chart = shallowRef<HTMLElement | null>(null)
    const rest  = shallowRef<string | null>(null)
    const read  = (): void => {
      rest.value = chart.value?.querySelector<HTMLElement>('[aria-pressed="true"]')?.dataset['k'] ?? null
    }
    const light = (at: number | null): void => {
      shown.value = at
      emit('update:lit', at === null ? null : props.items[at]!.key)
    }

    onMounted(() => {
      chart.value = root.value?.closest<HTMLElement>('.sc-data-chart') ?? null
      read()
    })
    useMutationObserver(chart, read, { attributeFilter: ['aria-pressed'], subtree: true })

    return (): VNode => {
      const at   = shown.value
      const held = rest.value === null ? undefined : props.items.find(({ key }) => key === rest.value)
      const said = at === null ? held?.label ?? '' : props.items[at]!.label
      return h('div', { class: 'sc-data-legend', ref: root }, [
        h('div', {
          'aria-label' : 'What each mark shows',
          'class'      : ['sc-data-legend-list', { 'is-column': props.column }],
          'role'       : 'list'
        }, props.items.map(({ glyph, key, label, tone }, index) => h('button', {
          'aria-label'     : label,
          'class'          : [
            'sc-data-legend-mark', { 'is-on': at === index || key !== null && key === props.lit }
          ],
          'onBlur'         : () => { light(null) },
          'onFocus'        : () => { light(index) },
          'onKeydown'      : (event: KeyboardEvent) => { if (event.key === 'Escape') light(null) },
          'onPointerenter' : () => { light(index) },
          'onPointerleave' : () => { light(null) },
          'role'           : 'listitem',
          'style'          : { '--sc-data-tone': tone },
          'type'           : 'button'
        }, h('i', { 'aria-hidden': 'true' }, glyph ?? '')))),
        h('p', { 'aria-live': 'polite', 'class': 'sc-data-legend-caption' }, said)
      ])
    }
  }
})
