import { flushPromises } from '@vue/test-utils'
import { vi }            from 'vitest'

/**
 * Stands in for the browser's observer so a case decides when a drawing comes on
 * screen, and for each element's `animate`, which happy-dom leaves out and which
 * here finishes at once.
 *
 * Returns:
 *   The call that waits for each drawing mounted so far to start observing and
 *   reports each element still observed as on screen.
 */
export function onScreen(): () => Promise<void> {
  const observers = new Set<IntersectionObserverCallback>()
  vi.stubGlobal('IntersectionObserver', class {
    public disconnect: () => void
    public observe = vi.fn<() => void>()

    public constructor(callback: IntersectionObserverCallback) {
      observers.add(callback)
      this.disconnect = () => observers.delete(callback)
    }
  })
  vi.spyOn(Element.prototype, 'animate').mockImplementation(
    () => ({ cancel: vi.fn<() => void>(), playState: 'finished' }) as unknown as Animation
  )
  return async () => {
    await flushPromises()
    observers.forEach(report => {
      report([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    })
    await flushPromises()
  }
}
