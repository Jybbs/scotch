import { useElementSize } from '@vueuse/core'
import { type ComputedRef, type ShallowRef, computed, shallowRef } from 'vue'

/**
 * A chart's element, the layout it draws at the element's width, whether that
 * width has been measured yet, and the style holding the element at least as
 * tall as the layout.
 */
interface Sized<T> {
  chart  : ShallowRef<HTMLElement | null>
  layout : ComputedRef<T>
  sized  : ComputedRef<boolean>
  style  : ComputedRef<{ minHeight: string }>
}

/**
 * Reads where a pointer event falls on the element handling it, in pixels from
 * that element's top left corner, wherever the page places the element.
 */
export function pointerAt(event: PointerEvent): { x: number, y: number } {
  const box = (event.currentTarget as Element).getBoundingClientRect()
  return { x: event.clientX - box.left, y: event.clientY - box.top }
}

/**
 * Measures a chart's element and lays the chart out across its width in whole
 * pixels, a width of 0 meaning the element has not been measured yet, where the
 * chart draws nothing but still takes the layout's height, which reads no
 * width.
 *
 * Args:
 *   layoutOf: The layout the chart draws at a width.
 */
export function useChart<T extends { height: number }>(layoutOf: (width: number) => T): Sized<T> {
  const chart     = shallowRef<HTMLElement | null>(null)
  const { width } = useElementSize(chart)
  const layout    = computed(() => layoutOf(Math.floor(width.value)))

  return {
    chart  : chart,
    layout : layout,
    sized  : computed(() => width.value > 0),
    style  : computed(() => ({ minHeight: `${layout.value.height}px` }))
  }
}
