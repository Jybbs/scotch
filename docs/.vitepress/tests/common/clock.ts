import { test as base, vi } from 'vitest'

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
