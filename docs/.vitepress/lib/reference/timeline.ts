import * as core                                from '@vueuse/core'
import { type Ref, computed, onMounted, watch } from 'vue'

import * as timing from '../motion/timing.ts'

/**
 * The element a drawing unfolds on, empty until it mounts.
 */
export type NodeRef = Ref<HTMLElement | null | undefined>

interface Tween {
  frame: number
}

/**
 * What a drawing's unfold runs on, every timer, tween, and animation it starts
 * held so one call cancels whatever is still running. A glide is the tween a
 * reader's pick starts, which replaces the glide before it and which `halt`
 * cancels. Under reduced motion a tween paints its end at once and an animation
 * does not start.
 */
export interface Beats {
  at    : (ms: number, run: () => void) => void
  glide : (ms: number, paint: (eased: number) => void) => void
  halt  : () => void
  move  : (node: Element, keys: Keyframe[], options: KeyframeAnimationOptions) => void
  stop  : () => void
  tween : (ms: number, paint: Painter, options?: TweenOptions) => void
}

/**
 * How a drawing unfolds: the state it waits in, what it plays once it first
 * comes on screen, the state it ends on, and the milliseconds past which it ends
 * whatever is still playing.
 */
export interface Story {
  length : number
  play   : (beats: Beats, done: () => void) => void
  prime  : () => void
  settle : () => void
}

type Painter = (eased: number, share: number) => void

interface TweenOptions {
  delay? : number
  done?  : () => void
  ease?  : (share: number) => number
}

/**
 * The share of a drawing on screen that starts its unfold.
 */
const SEEN = 0.3

const GLIDE = timing.bezier(timing.CURVES.glide)

/**
 * Starts a tween, reading each frame's clock against the first frame's.
 */
function frames(
  ms                                 : number,
  paint                              : Painter,
  { delay = 0, done, ease = GLIDE }  : TweenOptions,
  finish                             : (tween: Tween) => void
): Tween {
  const tween: Tween = { frame: 0 }
  let start: number | undefined

  const step = (now: number): void => {
    start ??= now
    if (now - start < delay) {
      tween.frame = requestAnimationFrame(step)
      return
    }
    const share = core.clamp((now - start - delay) / ms, 0, 1)
    paint(ease(share), share)
    if (share < 1) tween.frame = requestAnimationFrame(step)
    else {
      finish(tween)
      done?.()
    }
  }
  tween.frame = requestAnimationFrame(step)
  return tween
}

/**
 * Starts a timer that takes itself out of `timers` as it runs.
 */
function once(timers: Set<ReturnType<typeof setTimeout>>, ms: number, run: () => void): ReturnType<typeof setTimeout> {
  const timer = setTimeout(() => {
    timers.delete(timer)
    run()
  }, ms)
  return timer
}

/**
 * Starts an animation and holds it in `moves` until it finishes.
 */
function animated(moves: Set<Animation>, node: Element, keys: Keyframe[], options: KeyframeAnimationOptions): void {
  const move = node.animate(keys, { easing: timing.cubicBezier(timing.CURVES.glide), fill: 'backwards', ...options })
  moves.add(move)
  move.onfinish = () => moves.delete(move)
}

/**
 * Writes the call that starts a tween and holds it in `tweens` until it ends,
 * which under reduced motion paints the tween's end at once.
 */
function starter(tweens: Set<Tween>, reduced: Ref<string>): (ms: number, paint: Painter, options?: TweenOptions) => Tween {
  return (ms, paint, options = {}) => {
    if (reduced.value === 'reduce') {
      paint(1, 1)
      options.done?.()
      return { frame: 0 }
    }
    const tween = frames(ms, paint, options, ended => tweens.delete(ended))
    tweens.add(tween)
    return tween
  }
}

/**
 * Holds one drawing's timers, tweens, and animations until its scope ends.
 */
export function useBeats(): Beats {
  const reduced = core.usePreferredReducedMotion()
  const moves   = new Set<Animation>()
  const tweens  = new Set<Tween>()
  const timers  = new Set<ReturnType<typeof setTimeout>>()
  const start   = starter(tweens, reduced)
  let gliding: Tween | undefined

  const drop = (tween: Tween): void => {
    cancelAnimationFrame(tween.frame)
    tweens.delete(tween)
  }
  const halt = (): void => {
    if (gliding !== undefined) drop(gliding)
  }
  const stop = (): void => {
    timers.forEach(timer => {
      clearTimeout(timer)
    })
    moves.forEach(move => {
      move.cancel()
    })
    tweens.forEach(tween => {
      drop(tween)
    })
    timers.clear()
    moves.clear()
  }
  core.tryOnScopeDispose(stop)

  return {
    at: (ms, run) => {
      timers.add(once(timers, ms, run))
    },
    glide: (ms, paint) => {
      halt()
      gliding = start(ms, paint)
    },
    halt: halt,
    move: (node, keys, options) => {
      if (reduced.value !== 'reduce') animated(moves, node, keys, options)
    },
    stop: stop,
    tween: (ms, paint, options) => {
      start(ms, paint, options)
    }
  }
}

/**
 * Runs a drawing's unfold once it first comes on screen, starting from `prime`,
 * and ends on `settle` once the unfold finishes, a reader touches the drawing,
 * or the unfold reaches its length. A reader who prefers reduced motion gets
 * `settle` alone, whenever that preference turns on.
 *
 * Args:
 *   node  : The drawing's element.
 *   beats : The timers the drawing's other motion shares, so a touch ends both.
 *   story : How the drawing unfolds.
 */
export function useUnfold(node: NodeRef, beats: Beats, story: Story): void {
  const preference = core.usePreferredReducedMotion()
  const reduced    = computed(() => preference.value === 'reduce')
  let running      = false

  const end = (): void => {
    running = false
    beats.stop()
    story.settle()
  }
  const touch = (): void => {
    if (running) end()
  }
  const { stop } = core.useIntersectionObserver(node, ([entry]) => {
    if (!entry?.isIntersecting) return
    stop()
    if (reduced.value) return
    running = true
    story.prime()
    story.play(beats, touch)
    beats.at(story.length, touch)
  }, { threshold: SEEN })

  onMounted(reduced.value ? story.settle : story.prime)
  watch(reduced, value => {
    if (value) end()
  })
  core.useEventListener(node, 'pointerdown', touch)
  core.useEventListener(node, 'keydown', (event: KeyboardEvent) => {
    if (!['Shift', 'Tab'].includes(event.key)) touch()
  })
}
