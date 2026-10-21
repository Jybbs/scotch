import { type Component, defineComponent, h } from 'vue'

import { FIGURE }          from '../../lib/markdown/placements.ts'
import { DATA_WIDGETS }    from './data/index.ts'
import { METHODS_WIDGETS } from './methods/index.ts'

/**
 * Each widget a page places, under the name the placements give it.
 */
export const WIDGETS: Record<string, Component> = { ...DATA_WIDGETS, ...METHODS_WIDGETS }

/**
 * Draws the widget a placement names, setting any content the placement wraps,
 * such as a region's table, folded shut beneath it for a reader without scripts
 * and for the site's search.
 */
export const Figure = defineComponent({
  name  : FIGURE,
  props : { name: { required: true, type: String } },
  setup : (props, { slots }) => () => {
    const widget = WIDGETS[props.name]
    return h('figure', { class: 'sc-figure', 'data-name': props.name }, [
      widget ? h(widget) : null,
      slots.default
        ? h('details', { class: 'sc-folded' }, [h('summary', 'The table beneath'), slots.default()])
        : null
    ])
  }
})
