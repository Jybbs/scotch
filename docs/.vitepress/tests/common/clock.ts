import { type VueWrapper, flushPromises } from '@vue/test-utils'
import { test as base, vi }               from 'vitest'

/**
 * Extends Vitest's `test` with a `clock` fixture, Vitest's fake timers standing
 * in for the real ones until the case ends, which a case advances through the
 * fixture.
 */
export const test = base.extend<{ clock: typeof vi }>({
  clock: async ({ onTestFinished }, use) => {
    onTestFinished(() => {
      vi.useRealTimers()
    })
    await use(vi.useFakeTimers())
  }
})

/**
 * Picks the first step of the front page widget `widget` mounts through the
 * Home key on its clock line, since each widget opens on its last.
 */
export async function homed(widget: VueWrapper): Promise<void> {
  await widget.find("[role='slider']").trigger('keydown', { key: 'Home' })
  await flushPromises()
}
