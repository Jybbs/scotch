import { useMutationObserver } from '@vueuse/core'
import { type PropType, type VNode, defineComponent, h, onMounted, shallowRef } from 'vue'

import type { CornerMark } from '../../../lib/data/corner.ts'

/**
 * A square of the legend, its color or its glyph, ringed in the link's color
 * while it is lit.
 */
const MARK = [
  'group/mark inline-flex cursor-default items-center rounded-[3px] border-0 bg-transparent p-0.5',
  'focus-visible:outline-2 focus-visible:outline-(--sc-data-link)'
]
/**
 * The swatch a square of the legend shows.
 */
const SWATCH = [
  'inline-grid size-4 flex-none place-items-center rounded-[1px] [background:var(--sc-data-tone)] font-code',
  'text-[0.75rem]/none font-medium text-(--sc-data-ink) not-italic',
  '[box-shadow:inset_0_0_0_1px_color-mix(in_oklab,var(--sc-data-ink)_14%,transparent)]',
  'group-data-on/mark:outline-2 group-data-on/mark:outline-offset-1',
  'group-data-on/mark:outline-(--sc-data-link)'
]

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
      chart.value = root.value?.closest<HTMLElement>('[data-chart]') ?? null
      read()
    })
    useMutationObserver(chart, read, { attributeFilter: ['aria-pressed'], subtree: true })

    return (): VNode => {
      const at   = shown.value
      const held = rest.value === null ? undefined : props.items.find(({ key }) => key === rest.value)
      const said = at === null ? held?.label ?? '' : props.items[at]!.label
      return h('div', { class: 'grid gap-1.5', ref: root }, [
        h('div', {
          'aria-label' : 'What each mark shows',
          'class'      : ['flex flex-wrap gap-1', props.column ? 'flex-col items-start' : 'items-center'],
          'role'       : 'list'
        }, props.items.map(({ glyph, key, label, tone }, index) => h('button', {
          'aria-label'     : label,
          'class'          : MARK,
          'data-on'        : at === index || key !== null && key === props.lit ? '' : undefined,
          'onBlur'         : () => { light(null) },
          'onFocus'        : () => { light(index) },
          'onKeydown'      : (event: KeyboardEvent) => { if (event.key === 'Escape') light(null) },
          'onPointerenter' : () => { light(index) },
          'onPointerleave' : () => { light(null) },
          'role'           : 'listitem',
          'style'          : { '--sc-data-tone': tone },
          'type'           : 'button'
        }, h('i', { 'aria-hidden': 'true', 'class': SWATCH }, glyph ?? '')))),
        h('p', {
          'aria-live' : 'polite',
          'class'     : 'm-0! min-h-[18px] font-code text-[0.75rem]/[18px]! font-medium tracking-[0.1em] '
                      + 'text-(--sc-data-ink) uppercase'
        }, said)
      ])
    }
  }
})
