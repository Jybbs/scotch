import { type PropType, type VNode, defineComponent, h } from 'vue'

import { tabbed } from '../../../lib/data/keys.ts'

/**
 * The looks a row of tabs takes, each the row's spacing and its tabs' own: the
 * plain row ruled beneath and its picked tab underlined, the wide row so set
 * apart and unpadded, and the pill row unruled, its picked tab tinted.
 */
const LOOKS = {
  pill  : { row: 'gap-1', tab: 'rounded-[14px] px-2.5 py-[7px] aria-selected:bg-(--sc-data-tint)' },
  plain : {
    row : 'gap-0.5 border-b border-b-(--sc-data-rule)',
    tab : '-mb-px border-b-2 border-b-transparent px-2.5 pt-[7px] pb-2 '
        + 'aria-selected:border-b-(--sc-data-link)'
  },
  wide  : {
    row : 'gap-6 border-b border-b-(--sc-data-rule)',
    tab : '-mb-px border-b-2 border-b-transparent px-0 pt-2 pb-2.5 aria-selected:border-b-(--sc-data-link)'
  }
}
/**
 * A tab, set in its own color while it is the one picked, any count it holds
 * set beside its name in a lighter weight.
 */
const TAB = [
  'cursor-pointer border-0 bg-transparent font-code text-[0.74rem]/none font-semibold tracking-[0.04em]',
  'text-(--sc-data-quiet) uppercase transition-[color,border-color] duration-fade ease-glide',
  'aria-selected:text-(--sc-data-ink) focus-visible:outline-2 focus-visible:outline-(--sc-data-link)',
  '[&_small]:ml-1.5 [&_small]:font-medium [&_small]:text-(--sc-data-quiet)'
]

/**
 * The tabs over a Data widget, one per name, the picked one the only stop for
 * the keyboard, per the tabs pattern of the ARIA Authoring Practices: a press
 * picks a tab, and the arrow keys, Home, and End pick and focus another,
 * wrapping. Each tab controls the element `controls` names for it, and shows
 * what the default slot draws for its name, in the look `look` names.
 */
export const Tabs = defineComponent({
  name: 'ScotchDataTabs',

  props: {
    controls : { required: true, type: Function as PropType<(name: string) => string> },
    label    : { required: true, type: String },
    look     : { default: 'plain', type: String as PropType<keyof typeof LOOKS> },
    names    : { required: true, type: Array as PropType<readonly string[]> },
    on       : { required: true, type: String },
    tabOf    : { default: undefined, type: Function as PropType<(name: string) => string> }
  },

  emits: { 'update:on': (name: string) => typeof name === 'string' },

  setup: (props, { emit, slots }) => {
    const tabs  = new Map<string, HTMLElement>()
    const keyed = (event: KeyboardEvent): void => {
      const to = tabbed(props.names.indexOf(props.on), event.key, props.names.length)
      if (to === undefined) return
      event.preventDefault()
      emit('update:on', props.names[to]!)
      tabs.get(props.names[to]!)?.focus()
    }

    return (): VNode => h('div', {
      'aria-label' : props.label,
      'class'      : ['flex flex-wrap', LOOKS[props.look].row],
      'onKeydown'  : keyed,
      'role'       : 'tablist'
    }, props.names.map(name => h('button', {
      'aria-controls' : props.controls(name),
      'aria-selected' : String(name === props.on),
      'class'         : [TAB, LOOKS[props.look].tab],
      'id'            : props.tabOf?.(name),
      'onClick'       : () => { emit('update:on', name) },
      'ref'           : (node: unknown) => { if (node instanceof HTMLElement) tabs.set(name, node) },
      'role'          : 'tab',
      'tabindex'      : name === props.on ? 0 : -1,
      'type'          : 'button'
    }, slots.default?.({ name }) ?? name)))
  }
})
