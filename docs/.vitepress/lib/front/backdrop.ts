import {
  type Pausable,
  defaultDocument,
  useDocumentVisibility,
  useElementVisibility,
  useEventListener,
  usePreferredReducedMotion,
  useRafFn,
  useResizeObserver
} from '@vueuse/core'
import { type Ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'

import { useDark }       from '../identity/scheme.ts'
import type { Pointing } from './scene.ts'
import { View }          from './view.ts'

/**
 * Passes the page's scrolling and every pointer event to the backdrop, drawing
 * it again after each one while its frame loop is paused, and lays it out again
 * after the window resizes.
 */
function useInputs(
  canvas   : Ref<HTMLCanvasElement | null>,
  loop     : Pausable,
  schedule : () => void,
  view     : View
): void {
  const redraw = (): void => {
    if (!loop.isActive.value) view.render(canvas.value)
  }
  const point = (kind: Pointing) => (event: PointerEvent): void => {
    view.point(kind, event)
    redraw()
  }

  useEventListener('resize', schedule, { passive: true })
  useEventListener('scroll', () => {
    view.scroll()
    redraw()
  }, { passive: true })
  useEventListener('pointerdown', point('down'), { passive: true })
  useEventListener('pointermove', point('move'), { passive: true })
  useEventListener(['pointercancel', 'pointerup'], point('up'), { passive: true })
  useEventListener(defaultDocument?.documentElement, 'pointerleave', point('leave'), { passive: true })
}

/**
 * Lays the backdrop out once the faces have loaded, and again on the next
 * animation frame after the call it returns runs, one frame serving every call
 * made before it, painting its drawings where the pieces were laid out again
 * and otherwise drawing what it holds.
 *
 * Returns:
 *   The call that schedules the backdrop to be laid out again.
 */
function useLayout(
  canvas  : Ref<HTMLCanvasElement | null>,
  home    : Ref<HTMLElement | null>,
  repaint : () => Promise<void>,
  view    : View
): () => void {
  const build = (): void => {
    if (!home.value || !canvas.value) return
    if (view.build(home.value, canvas.value)) void repaint()
    else view.render(canvas.value)
  }

  onMounted(async () => {
    await document.fonts?.ready
    build()
  })
  return useRafFn(build, { immediate: false, once: true }).resume
}

/**
 * Runs the front page's backdrop on its canvas: lays the oval out around the
 * lockup once the faces have loaded and again whenever the page's size changes,
 * paints every piece's drawings in the page's color scheme, and draws a frame
 * on each animation frame while the page is on screen and its tab is shown, or
 * holds every piece still for a reader who prefers reduced motion, drawing
 * again only as the page scrolls, the window resizes, or a pointer event
 * arrives, a tap among them gathering the oval or letting it go. The drawings
 * are painted again once the root element takes or drops the `dark` class the
 * site's appearance switch sets, since that is when the colors they read
 * change.
 *
 * Args:
 *   canvas : The canvas the backdrop draws on, fixed across the viewport.
 *   root   : The backdrop's own element, inside the front page.
 *   view   : The backdrop as the page shows it.
 */
export function useBackdrop(
  canvas : Ref<HTMLCanvasElement | null>,
  root   : Ref<HTMLElement | null>,
  view   : View = new View()
): void {
  const dark    = useDark()
  const home    = computed(() => root.value?.closest<HTMLElement>('.VPHome') ?? null)
  const reduced = usePreferredReducedMotion()
  const seen    = useElementVisibility(home)
  const shown   = useDocumentVisibility()
  const loop    = useRafFn(
    ({ delta }) => view.draw(canvas.value, view.scene.step(delta, window.innerHeight)),
    { immediate: false }
  )

  const sync = (): void => {
    view.scene.animate = reduced.value !== 'reduce'
    if (view.scene.animate && view.drawings && seen.value && shown.value === 'visible') {
      view.scene.held = false
      loop.resume()
      return
    }
    loop.pause()
    if (!view.scene.animate) view.scene.hold()
    view.render(canvas.value)
  }

  const repaint = async (): Promise<void> => {
    if (await view.repaint(root.value!, dark.value)) sync()
  }

  const schedule = useLayout(canvas, home, repaint, view)
  onBeforeUnmount(() => view.clear(home.value))
  watch(dark, repaint)
  watch([reduced, seen, shown], sync)
  useResizeObserver(home, schedule)
  useInputs(canvas, loop, schedule, view)
}
