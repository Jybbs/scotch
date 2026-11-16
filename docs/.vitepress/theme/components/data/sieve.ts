import { useIntersectionObserver, useIntervalFn }            from '@vueuse/core'
import { type VNode, defineComponent, h, shallowRef, watch } from 'vue'

import * as sieve    from '../../../lib/data/sieve.ts'
import { stepped }   from '../../../lib/data/keys.ts'
import { counted }   from '../../../lib/data/numbers.ts'
import { useMotion } from '../../../lib/motion/control.ts'

/**
 * How long the sieve holds each step as it plays through, in milliseconds.
 */
const HOLD = 1400

/**
 * Draws each square of the sieve at the step `at`, the stored ones on the
 * board's light and dark squares, a repeated one hollow, one under the floor
 * struck through, and each dimmed once a step drops it.
 */
function cells(at: number): VNode[] {
  return sieve.SQUARES.map((kind, index) => {
    const x     = index % sieve.COLUMNS * 17
    const y     = Math.floor(index / sieve.COLUMNS) * 17
    const inset = kind === 'repeat' ? 0.6 : 0
    return h('g', {
      'class'     : 'sc-sieve-cell',
      'data-gone' : at >= sieve.DROPPED[kind] ? '' : undefined,
      'data-k'    : kind
    }, [
      h('rect', {
        'data-tone' : (x + y) / 17 % 2 ? 'dark' : 'light',
        'height'    : 15 - inset * 2,
        'rx'        : 1.5,
        'width'     : 15 - inset * 2,
        'x'         : x + inset,
        'y'         : y + inset
      }),
      kind === 'below' ? h('path', { d: `M${x + 3.5} ${y + 11.5}L${x + 11.5} ${y + 3.5}` }) : null
    ])
  })
}

/**
 * Draws the key: a swatch and a label for each kind of square, the stored
 * games' swatch a light square beside a dark one, as the grid alternates them.
 */
function key(): VNode {
  return h('ul', { 'aria-label': 'What each square stands for', 'class': 'sc-sieve-key' },
    sieve.KEY.map(({ kind, label }) => h('li', [h('svg', {
      'aria-hidden' : 'true',
      'data-k'      : kind,
      'viewBox'     : kind === 'stored' ? '0 0 32 15' : '0 0 15 15'
    }, [
      h('rect', { 'data-tone': 'light', 'height': 15, 'rx': 1.5, 'width': 15 }),
      kind === 'stored'
        ? h('rect', { 'data-tone': 'dark', 'height': 15, 'rx': 1.5, 'width': 15, 'x': 17 })
        : null,
      kind === 'below' ? h('path', { d: 'M3.5 11.5L11.5 3.5' }) : null
    ]), label])))
}

/**
 * Draws the rail's marks at the step `at`: one swatch between each pair of
 * notches for the kind of square the later step drops, the notches, and the
 * thumb.
 */
function marks(at: number): VNode[] {
  return [
    ...(['below', 'repeat', 'stored'] as const).map((kind, index) => h('i', {
      'class'     : 'sc-sieve-span',
      'data-gone' : kind !== 'stored' && at > index ? '' : undefined,
      'data-k'    : kind,
      'style'     : { '--sc-sieve-i': index }
    })),
    ...sieve.STEPS.map((_, index) => h('i', {
      'class'     : 'sc-sieve-notch',
      'data-past' : index <= at ? '' : undefined,
      'style'     : { '--sc-sieve-i': index }
    })),
    h('b', { class: 'sc-sieve-thumb' })
  ]
}

/**
 * Draws the slider beneath the sieve at the step `at`: the rail's marks, its
 * thumb dragged or moved by the arrow keys, Home, and End, and each step's name
 * over its figure beneath its notch.
 */
function slider(at: number, go: (step: number) => void): VNode {
  const last = sieve.STEPS.length - 1
  const step = sieve.STEPS[at]!
  const to   = (event: PointerEvent): void => {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
    go(sieve.stepAt((event.clientX - box.left) / box.width))
  }
  return h('div', { class: 'sc-sieve-step', style: { '--sc-sieve-at': at / last } }, [
    h('div', {
      'aria-label'     : 'Step',
      'aria-valuemax'  : sieve.STEPS.length,
      'aria-valuemin'  : 1,
      'aria-valuenow'  : at + 1,
      'aria-valuetext' : `${step.name}: ${step.say}`,
      'class'          : 'sc-sieve-rail',
      'role'           : 'slider',
      'tabindex'       : 0,

      'onKeydown': (event: KeyboardEvent) => {
        const next = stepped(last, event.key, 0, at, false)
        if (next === undefined) return
        event.preventDefault()
        go(next)
      },

      'onPointerdown': (event: PointerEvent) => {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
        to(event)
      },

      'onPointermove': (event: PointerEvent) => {
        if ((event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) to(event)
      }
    }, marks(at)),
    h('ol', { 'aria-hidden': 'true', 'class': 'sc-sieve-names' }, sieve.STEPS.map(({ figure, name }, index) =>
      h('li', { 'data-on': index === at ? '' : undefined, 'style': { '--sc-sieve-i': index } }, [
        h('span', name),
        h('span', { class: 'sc-sieve-figure' }, figure)
      ])))
  ])
}

/**
 * The sieve on the Data overview: a square for every ten thousand games the
 * fetched files hold over a slider through the four steps to the stored games,
 * each step dimming the squares it drops beside the sentence saying what it
 * drops. The steps play through once as the sieve comes into view, unless the
 * site's drawings hold still or the reader has moved the slider, and the sieve
 * rests on the stored games.
 */
export const Sieve = defineComponent({
  name: 'ScotchDataSieve',

  setup: () => {
    const last       = sieve.STEPS.length - 1
    const { moving } = useMotion()
    const at         = shallowRef(moving.value ? 0 : last)
    const root       = shallowRef<HTMLElement | null>(null)
    const held       = shallowRef(false)
    const ticker     = useIntervalFn(() => {
      at.value += 1
      if (at.value >= last) ticker.pause()
    }, HOLD, { immediate: false })
    const go = (step: number): void => {
      held.value = true
      ticker.pause()
      at.value = step
    }
    const { stop } = useIntersectionObserver(root, ([entry]) => {
      if (!entry?.isIntersecting) return
      stop()
      if (moving.value && !held.value) ticker.resume()
    })

    watch(moving, now => {
      if (!now) go(last)
    })

    return (): VNode => {
      const step = sieve.STEPS[at.value]!
      return h('div', { class: 'sc-data sc-data-plate sc-data-sieve sc-sieve', ref: root }, [
        h('div', { class: 'sc-data-head' }, [
          h('span', { class: 'sc-data-big' }, counted(step.total)),
          h('p', { 'aria-live': 'polite', 'class': 'sc-data-say' }, step.say)
        ]),
        key(),
        h('svg', {
          'aria-label' : `${sieve.SQUARES.length} squares, ten thousand games each, at the step ${step.name}`,
          'class'      : 'sc-sieve-grid',
          'role'       : 'img',
          'viewBox'    : `-1 -1 ${sieve.COLUMNS * 17} ${Math.ceil(sieve.SQUARES.length / sieve.COLUMNS) * 17}`
        }, cells(at.value)),
        slider(at.value, go)
      ])
    }
  }
})
