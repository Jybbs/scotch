import { vi } from 'vitest'

/**
 * One stand-in observer: the call it was built with and each element it
 * observes.
 */
interface Watcher {
  callback : ResizeObserverCallback
  targets  : Set<Element>
}

/**
 * Stands an observer that records what it observes in for happy-dom's
 * `ResizeObserver`, which observes nothing and never calls back, until the case
 * ends.
 *
 * Returns:
 *   The call that reports every observed element resized to `width` pixels
 *   across, as a browser does once it lays the page out, and how many elements
 *   are still observed.
 */
export function observeResizes(): { observed: () => number, resize: (width?: number) => void } {
  const watchers = [] as Watcher[]
  vi.stubGlobal('ResizeObserver', class {
    readonly #watcher: Watcher

    constructor(callback: ResizeObserverCallback) {
      this.#watcher = { callback, targets: new Set() }
      watchers.push(this.#watcher)
    }

    disconnect(): void {
      this.#watcher.targets.clear()
    }

    observe(target: Element): void {
      this.#watcher.targets.add(target)
    }

    unobserve(target: Element): void {
      this.#watcher.targets.delete(target)
    }
  })
  return {
    observed: () => watchers.reduce((count, { targets }) => count + targets.size, 0),

    resize: (width = 0) => {
      for (const { callback, targets } of watchers) {
        if (targets.size === 0) continue
        const entries = [...targets].map(target => ({ contentRect: { height: 0, width }, target }))
        callback(entries as unknown as ResizeObserverEntry[], undefined as unknown as ResizeObserver)
      }
    }
  }
}
