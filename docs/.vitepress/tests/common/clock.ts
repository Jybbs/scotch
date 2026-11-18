import { type VueWrapper, flushPromises } from '@vue/test-utils'
import { test as base, vi }               from 'vitest'
import { createApp }                      from 'vue'

/**
 * Extends Vitest's `test` with a `clock` fixture, Vitest's fake timers standing
 * in for the real ones until the case ends, which a case advances through the
 * fixture. Vue's development build starts a 3,000 ms devtools timer once, when
 * the file's first app builds its renderer, so the fixture builds it on the
 * real clock and the fake one holds only the timers the case starts.
 */
export const test = base.extend<{ clock: typeof vi }>({
  clock: async ({ onTestFinished }, use) => {
    onTestFinished(() => {
      vi.useRealTimers()
    })
    createApp({})
    await use(vi.useFakeTimers())
  }
})

/**
 * Picks the first step of the front page widget `widget` mounts through the
 * Home key on its clock line, since each widget opens on its last.
 */
export async function homed(widget: VueWrapper): Promise<void> {
  await widget.find('.sc-front-clock').trigger('keydown', { key: 'Home' })
  await flushPromises()
}
