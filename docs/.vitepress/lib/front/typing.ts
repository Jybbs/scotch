import { useIntersectionObserver } from '@vueuse/core'
import { type ComputedRef, type ShallowRef, onBeforeUnmount, shallowRef, watch } from 'vue'

import { useMotion } from '../motion/control.ts'
import { beatsOf }   from './session.ts'

/**
 * One frame of the terminal: the command it is on, how many of its characters
 * are typed, and how many of its lines have printed.
 */
export interface Frame {
  printed : number
  step    : number
  typed   : number
}

/**
 * How long the terminal holds each kind of frame, in milliseconds: the prompt
 * before a command, the beat after its last character as if Enter were
 * pressed, each line printed, and each beat of typing.
 */
export interface Pace {
  enter  : number
  line   : number
  prompt : number
  type   : number
}

/**
 * One command the terminal types and the lines it prints.
 */
export interface Typed {
  command : string
  out     : readonly string[]
}

/**
 * The terminal playing its frames: the element whose arrival in view starts
 * it, the frame it stands on, whether it is playing, whether the site's
 * drawings move, and the call replaying it.
 */
export interface Typing {
  at      : ShallowRef<number>
  frames  : readonly Frame[]
  moving  : ComputedRef<boolean>
  play    : () => void
  playing : ShallowRef<boolean>
  root    : ShallowRef<HTMLElement | null>
}

/**
 * The pace the front page's opening types at.
 */
export const PACE: Pace = { enter: 480, line: 220, prompt: 640, type: 110 }

/**
 * Lists the frames the terminal plays: each command typed a few characters a
 * beat, as the Guide's session types it, then each line it prints in turn.
 */
export function framesOf(commands: readonly Typed[]): Frame[] {
  const blank = { figure: '', unit: '', verb: '' }
  const beats = beatsOf(commands.map(({ command, out }) => ({ ...blank, command, out })))
  return beats.flatMap(({ done, step, typed }) => done
    ? commands[step]!.out.map((_, line) => ({ printed: line + 1, step, typed }))
    : [{ printed: 0, step, typed }])
}

/**
 * Reads how long `frame` holds before the next one.
 */
export function holdOf(commands: readonly Typed[], frame: Frame, pace: Pace = PACE): number {
  if (frame.printed) return pace.line
  if (frame.typed === 0) return pace.prompt
  return frame.typed === commands[frame.step]!.command.length ? pace.enter : pace.type
}

/**
 * Plays the terminal once its element is at least 40 percent in view, a frame
 * at a time, and shows the whole session at once wherever the site's drawings
 * hold still, the terminal resting on its last frame until it plays.
 */
export function useTyping(commands: readonly Typed[], pace: Pace = PACE): Typing {
  const frames     = framesOf(commands)
  const last       = frames.length - 1
  const root       = shallowRef<HTMLElement | null>(null)
  const at         = shallowRef(last)
  const playing    = shallowRef(false)
  const { moving } = useMotion()
  let timer: ReturnType<typeof setTimeout> | undefined

  const stop = (): void => {
    clearTimeout(timer)
    playing.value = false
  }
  const tick = (): void => {
    if (at.value >= last) return stop()
    timer = setTimeout(() => {
      at.value += 1
      tick()
    }, holdOf(commands, frames[at.value]!, pace))
  }
  const play = (): void => {
    stop()
    if (!moving.value) return
    at.value      = 0
    playing.value = true
    tick()
  }
  const { stop: unwatch } = useIntersectionObserver(root, ([entry]) => {
    if (!entry?.isIntersecting) return
    unwatch()
    play()
  }, { threshold: 0.4 })

  watch(moving, now => {
    if (now) return
    stop()
    at.value = last
  })
  onBeforeUnmount(stop)

  return { at, frames, moving, play, playing, root }
}
