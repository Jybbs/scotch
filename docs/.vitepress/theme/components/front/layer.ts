import { type VNode, defineComponent, h, shallowRef } from 'vue'

import { useMarkLayer } from '../../../lib/front/layer.ts'

/**
 * The layer held behind the whole front page, the hero and every entry
 * scrolling over it, which draws the mark built of chess pieces, each piece
 * pouring into its cell as the page scrolls down and lifting out as it scrolls
 * back up.
 */
export const Layer = defineComponent({
  name: 'ScotchFrontLayer',

  setup: () => {
    const canvas = shallowRef<HTMLCanvasElement | null>(null)
    useMarkLayer(canvas)
    return (): VNode => h('div', { 'aria-hidden': 'true', 'class': 'sc-front-layer' },
      h('canvas', { class: 'sc-front-mark', ref: canvas }))
  }
})
