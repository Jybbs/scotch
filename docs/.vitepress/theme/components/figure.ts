import { type Component, type ShallowRef, defineComponent, h, onMounted, shallowRef } from 'vue'

import { FIGURE }            from '../../lib/markdown/placements.ts'
import { DATA_WIDGETS }      from './data/index.ts'
import { FRONT_WIDGETS }     from './front/index.ts'
import { METHODS_WIDGETS }   from './methods/index.ts'
import { REFERENCE_WIDGETS } from './reference/index.ts'

/**
 * Each widget a page places, under the name the placements give it.
 */
export const WIDGETS: Record<string, Component> = {
  ...DATA_WIDGETS,
  ...FRONT_WIDGETS,
  ...METHODS_WIDGETS,
  ...REFERENCE_WIDGETS
}

/**
 * Builds the call hiding each row of the tables inside `folded` whose text
 * does not hold the query a field beside them reads.
 */
function finding(folded: ShallowRef<HTMLElement | null>): (event: Event) => void {
  return event => {
    const query = (event.target as HTMLInputElement).value.trim().toLowerCase()
    for (const row of folded.value?.querySelectorAll<HTMLTableRowElement>('tbody tr') ?? [])
      row.hidden = !row.textContent!.toLowerCase().includes(query)
  }
}

/**
 * Draws the widget a placement names, setting any content the placement wraps,
 * such as a region's tables, folded shut beneath it for a reader without
 * scripts and for the site's search, with a field finding a row once scripts
 * run.
 */
export const Figure = defineComponent({
  name  : FIGURE,
  props : { name: { required: true, type: String } },
  setup : (props, { slots }) => {
    const folded = shallowRef<HTMLElement | null>(null)
    const live   = shallowRef(false)
    onMounted(() => { live.value = true })

    return () => {
      const widget = WIDGETS[props.name]
      return h('figure', { class: 'sc-figure', 'data-name': props.name }, [
        widget ? h(widget) : null,
        slots.default
          ? h('details', { class: 'sc-folded', ref: folded }, [
            h('summary', 'The table beneath'),
            live.value
              ? h('input', {
                'aria-label' : 'Find a row',
                class        : 'sc-folded-find',
                onInput      : finding(folded),
                placeholder  : 'Find a row',
                type         : 'search'
              })
              : null,
            slots.default()
          ])
          : null
      ])
    }
  }
})
