import { defaultDocument, usePreferredReducedMotion, useSessionStorage } from '@vueuse/core'
import { type ComputedRef, computed, watchEffect }                       from 'vue'

type Choice = (typeof CHOICES)[number]

/**
 * Whether the site's drawings move, beside the call a press of the motion
 * switch makes.
 */
export interface Motion {
  moving : ComputedRef<boolean>
  toggle : () => void
}

/**
 * Each choice the motion switch holds, `auto` following the reader's system,
 * whose drawings hold still where it sets `prefers-reduced-motion: reduce`,
 * until a press of the switch sets one of the other two.
 */
const CHOICES = ['auto', 'paused', 'playing'] as const
/**
 * The key the motion switch keeps its choice under in session storage, so the
 * choice holds across the pages of one visit.
 */
export const MOTION_KEY = 'scotch-motion'

/**
 * Follows whether the site's drawings move, which they do unless the reader has
 * paused them through the motion switch or the reader's system sets reduced
 * motion and the reader has not pressed play since, and marks the root element
 * with `data-motion` set to `paused` or `playing`, which a stylesheet's endless
 * animation reads. Every call shares one choice through session storage, whose
 * writes VueUse passes to each other call in the document.
 */
export function useMotion(): Motion {
  const reduced = usePreferredReducedMotion()
  const choice  = useSessionStorage<Choice>(MOTION_KEY, 'auto', { initOnMounted: true })
  const moving  = computed(() =>
    choice.value === 'auto' ? reduced.value !== 'reduce' : choice.value === 'playing')

  watchEffect(() => {
    if (defaultDocument) defaultDocument.documentElement.dataset.motion = moving.value ? 'playing' : 'paused'
  })

  return {
    moving : moving,
    toggle : () => {
      choice.value = moving.value ? 'paused' : 'playing'
    }
  }
}
