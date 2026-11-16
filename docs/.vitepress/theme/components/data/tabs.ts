import { type PropType, type VNode, defineComponent, h } from 'vue'

import { tabbed } from '../../../lib/data/keys.ts'

/**
 * The tabs over a Data widget, one per name, the picked one the only stop for
 * the keyboard, per the tabs pattern of the ARIA Authoring Practices: a press
 * picks a tab, and the arrow keys, Home, and End pick and focus another,
 * wrapping. Each tab controls the element `controls` names for it, and shows
 * what the default slot draws for its name.
 */
export const Tabs = defineComponent({
  name: 'ScotchDataTabs',

  props: {
    controls : { required: true, type: Function as PropType<(name: string) => string> },
    label    : { required: true, type: String },
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
      'class'      : 'sc-data-tabs',
      'onKeydown'  : keyed,
      'role'       : 'tablist'
    }, props.names.map(name => h('button', {
      'aria-controls' : props.controls(name),
      'aria-selected' : String(name === props.on),
      'class'         : 'sc-data-tab',
      'id'            : props.tabOf?.(name),
      'onClick'       : () => { emit('update:on', name) },
      'ref'           : (node: unknown) => { if (node instanceof HTMLElement) tabs.set(name, node) },
      'role'          : 'tab',
      'tabindex'      : name === props.on ? 0 : -1,
      'type'          : 'button'
    }, slots.default?.({ name }) ?? name)))
  }
})
