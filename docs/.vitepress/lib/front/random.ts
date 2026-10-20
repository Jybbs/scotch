/**
 * Builds a generator of shares between 0 and 1 that repeats for the same seed,
 * through Tommy Ettinger's Mulberry32, so the front page lays its pieces out
 * the same way on every load.
 */
export function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state      = (state + 0x6d2b79f5) >>> 0
    let mixed  = Math.imul(state ^ (state >>> 15), state | 1)
    mixed     ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}
