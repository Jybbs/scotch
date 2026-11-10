import { clamp }                                                                                   from '@vueuse/core'
import { type ShallowRef, type VNode, defineComponent, h, nextTick, onMounted, shallowRef, watch } from 'vue'

import { useChart }                          from '../../../lib/data/chart.ts'
import { DURATIONS }                         from '../../../lib/motion/timing.ts'
import * as palette                          from '../../../lib/reference/palette.ts'
import { narrowAt, shareAlong }              from '../../../lib/reference/pick.ts'
import { ORDER, START }                      from '../../../lib/reference/roles.ts'
import { type NodeRef, useBeats, useUnfold } from '../../../lib/reference/timeline.ts'
import { stacked, stage, stepper }           from './parts.ts'
import { roleCard, sheet }                   from './sheet.ts'

/**
 * The picked role, the two pages, the seam between them, and the ring around
 * the picked part, beside the calls that pick a role and move the seam.
 */
interface Seam {
  at     : ShallowRef<number>
  drag   : (event: PointerEvent) => void
  hold   : ShallowRef<HTMLElement | null>
  light  : ShallowRef<HTMLElement | null>
  pick   : (index: number) => void
  ring   : ShallowRef<{ height: number, left: number, top: number, width: number }>
  ringed : ShallowRef<boolean>
  seam   : ShallowRef<number>
}

/**
 * The roles the unfold rings in turn, as when and which.
 */
const LOOKS = [[1500, 'ink'], [3000, 'submitted'], [4500, 'front_paper'], [6000, ORDER[START]!]] as const

/**
 * Holds the ring around the picked part, measuring it once mounted and again
 * each time `narrow` changes, and setting the seam to the part's middle.
 *
 * Returns:
 *   The ring, and the call that measures it and returns the part's middle.
 */
function useRing(
  { at, hold, light, seam }: Pick<Seam, 'at' | 'hold' | 'light' | 'seam'>,
  narrow: () => boolean
): { measure: () => number, ring: Seam['ring'] } {
  const ring = shallowRef({ height: 0, left: 0, top: 0, width: 0 })

  const measure = (): number => {
    const outer = hold.value!.getBoundingClientRect()
    const role  = ORDER[at.value]!
    const part  = role === 'page' ? light.value! : light.value!.querySelector(`[data-role="${role}"]`)!
    const box   = part.getBoundingClientRect()
    const pad   = role === 'page' ? -4 : 2
    ring.value  = { height: box.height + pad * 2, left: box.left - outer.left - pad, top: box.top - outer.top - pad, width: box.width + pad * 2 }
    return box.left - outer.left + box.width / 2
  }

  onMounted(() => {
    seam.value = measure()
  })
  watch(narrow, () => {
    void nextTick(() => {
      seam.value = measure()
    })
  })

  return { measure, ring }
}

/**
 * Holds the seam and runs the unfold on `chart`.
 */
function useSeam(chart: NodeRef, narrow: () => boolean): Seam {
  const at     = shallowRef(START)
  const hold   = shallowRef<HTMLElement | null>(null)
  const light  = shallowRef<HTMLElement | null>(null)
  const seam   = shallowRef(0)
  const ringed = shallowRef(true)
  const beats  = useBeats()

  const { measure, ring } = useRing({ at, hold, light, seam }, narrow)

  const pick = (index: number): void => {
    at.value = index
    void nextTick(() => {
      const [from, goal] = [seam.value, measure()]
      beats.glide(DURATIONS.glide + 80, eased => {
        seam.value = from + (goal - from) * eased
      })
    })
  }
  const drag = (event: PointerEvent): void => {
    beats.halt()
    seam.value = shareAlong(event, hold.value!) * hold.value!.offsetWidth
  }

  useUnfold(chart, beats, {
    length : 8400,
    play   : (time, done) => {
      time.glide(1300, eased => {
        seam.value = hold.value!.offsetWidth * (1 - eased)
      })
      time.at(1500, () => {
        ringed.value = true
      })
      LOOKS.forEach(([ms, role]) => { time.at(ms, () => { pick(ORDER.indexOf(role)) }) })
      time.at(7200, done)
    },
    prime  : () => {
      ringed.value = false
      seam.value   = hold.value?.offsetWidth ?? 0
    },
    settle : () => {
      ringed.value = true
      seam.value   = measure()
    }
  })

  return { at, drag, hold, light, pick, ring, ringed, seam }
}

function handle({ drag, hold, seam }: Seam): VNode {
  return h('div', {
    'aria-label'     : 'Where the light page meets the dark',
    'aria-valuemax'  : 100,
    'aria-valuemin'  : 0,
    'aria-valuenow'  : Math.round(seam.value / Math.max(1, hold.value?.offsetWidth ?? 1) * 100),
    'class'          : 'sc-ref-seam',
    'onKeydown'      : (event: KeyboardEvent) => {
      const move = ({ ArrowLeft: -16, ArrowRight: 16 } as Record<string, number>)[event.key]
      if (move === undefined) return
      event.preventDefault()
      seam.value = clamp(seam.value + move, 0, hold.value!.offsetWidth)
    },
    'onPointerdown'  : (event: PointerEvent) => {
      (event.currentTarget as Element).setPointerCapture(event.pointerId)
      drag(event)
    },
    'onPointermove'  : (event: PointerEvent) => {
      if ((event.currentTarget as Element).hasPointerCapture(event.pointerId)) drag(event)
    },
    'role'           : 'slider',
    'style'          : { transform: `translateX(${seam.value}px)` },
    'tabindex'       : 0
  }, h('i'))
}

function pages(state: Seam): VNode {
  const { height, left, top, width } = state.ring.value
  return h('div', { class: 'sc-ref-hold', ref: state.hold }, [
    h('div', { ref: state.light }, [sheet('light')]),
    h('div', {
      class : 'sc-ref-over',
      style : { clipPath: `inset(0 0 0 ${state.seam.value}px)` }
    }, [sheet('dark')]),
    h('i', {
      'aria-hidden' : 'true',
      'class'       : 'sc-ref-outline',
      'data-off'    : state.ringed.value ? undefined : '',
      'style'       : {
        height    : `${height}px`,
        transform : `translate(${left}px, ${top}px)`,
        width     : `${width}px`
      }
    }),
    handle(state)
  ])
}

function chip({ at, pick }: Seam, index: number): VNode {
  const role = ORDER[index]!
  return h('button', {
    'aria-current' : index === at.value ? 'step' : undefined,
    'aria-label'   : role,
    'class'        : 'sc-ref-chip',
    'onClick'      : () => {
      pick(index)
    },
    'style'        : { '--sc-ref-dark': palette.colorOf(role, 'dark'), '--sc-ref-light': palette.colorOf(role, 'light') },
    'title'        : role,
    'type'         : 'button'
  })
}

/**
 * The roles as one sample page in the light scheme meeting the same page in the
 * dark at a seam a reader drags, which glides to the middle of the part taking
 * the picked role, so that part stands half in each scheme under one ring.
 */
export const Roles = defineComponent({
  name  : 'ReferenceRoles',
  setup : () => {
    const { chart, layout } = useChart(narrowAt)
    const state             = useSeam(chart, () => layout.value.narrow)

    return () => stage(chart, layout.value.narrow, [
      pages(state),
      stepper({
        at    : state.at.value,
        cell  : index => chip(state, index),
        names : ORDER,
        pick  : state.pick
      }),
      stacked(ORDER.map(role => roleCard(role)), state.at.value)
    ])
  }
})
