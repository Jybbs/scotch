import { useMounted }                               from '@vueuse/core'
import { type VNode, computed, defineComponent, h } from 'vue'

import { useMotion } from '../../../lib/motion/control.ts'

/**
 * The glyph the switch's thumb draws while the drawings move, a swell, and
 * while they hold still, a level line.
 */
const GLYPHS = {
  level : 'M3 8h10',
  swell : 'M2 8c2-4 4-4 6 0s4 4 6 0'
} as const

/**
 * The switch in the navigation bar that pauses and plays every moving drawing
 * on the site, its choice kept for the visit, its thumb drawing a swell while
 * the drawings move and a level line while they hold still. It reads as
 * moving until it mounts, so hydration meets the switch the build rendered on
 * the server.
 */
export const MotionSwitch = defineComponent({
  name: 'ScotchMotionSwitch',

  setup: () => {
    const { moving, toggle } = useMotion()
    const mounted            = useMounted()
    const shown              = computed(() => !mounted.value || moving.value)
    return (): VNode => h('button', {
      'aria-checked' : String(shown.value),
      'aria-label'   : 'Moving drawings',
      'class'        : 'sc-motion',
      'onClick'      : toggle,
      'role'         : 'switch',
      'title'        : shown.value ? 'Pause the moving drawings' : 'Play the moving drawings',
      'type'         : 'button'
    }, h('span', { class: 'sc-motion-thumb' }, h('svg', { 'aria-hidden': 'true', 'viewBox': '0 0 16 16' },
      h('path', { d: shown.value ? GLYPHS.swell : GLYPHS.level }))))
  }
})
