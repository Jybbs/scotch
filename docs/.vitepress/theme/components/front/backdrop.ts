import { defineComponent, h, shallowRef } from 'vue'

import { useBackdrop } from '../../../lib/front/backdrop.ts'

/**
 * The front page's backdrop, a canvas fixed across the viewport behind the hero
 * and the cards, where the two games of the oval play around the lockup and the
 * stored game's other moves wait down the page. A reader of the page and a
 * screen reader meet only the content over it.
 */
export const Backdrop = defineComponent({
  name  : 'ScotchBackdrop',
  setup : () => {
    const root   = shallowRef<HTMLElement | null>(null)
    const canvas = shallowRef<HTMLCanvasElement | null>(null)
    useBackdrop(canvas, root)
    return () => h('div', { 'aria-hidden': 'true', class: 'sc-backdrop', ref: root }, [
      h('canvas', { ref: canvas })
    ])
  }
})
