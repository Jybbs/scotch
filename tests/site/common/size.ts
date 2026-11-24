import { onTestFinished }              from 'vitest'
import { type ShallowRef, shallowRef } from 'vue'

/**
 * The width every chart a stand-in measures reads, 600 pixels unless a case
 * narrows it.
 */
export const width = shallowRef(600)

/**
 * Measures every chart the stand-in measures at `pixels` until the case ends,
 * when its width goes back to 600 pixels.
 */
export function resized(pixels: number): void {
  width.value = pixels
  onTestFinished(() => {
    width.value = 600
  })
}

/**
 * Narrows every chart the stand-in measures to no width until the case ends.
 */
export function unsized(): void {
  resized(0)
}

/**
 * Stands in for VueUse's `useElementSize`, measuring every element at `width`
 * across and no height.
 */
export function useElementSize(): { height: ShallowRef<number>, width: ShallowRef<number> } {
  return { height: shallowRef(0), width }
}
