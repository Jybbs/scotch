import { useIntersectionObserver, useIntervalFn }            from '@vueuse/core'
import { type VNode, defineComponent, h, shallowRef, watch } from 'vue'

import * as sieve    from '../../../lib/data/sieve.ts'
import { stepped }   from '../../../lib/data/keys.ts'
import { counted }   from '../../../lib/data/numbers.ts'
import { useMotion } from '../../../lib/motion/control.ts'
import * as parts    from './parts.ts'

/**
 * How long the sieve holds each step as it plays through, in milliseconds.
 */
const HOLD = 1400
/**
 * A square of the sieve or of its key, on the board's light square or the
 * stored games' dark one, hollow where its game repeats another, and struck
 * through on a tint where its game sits under the floor.
 */
const KIND = [
  '[&_rect]:fill-light data-[k=stored]:[&_rect[data-tone=dark]]:fill-primary',
  'data-[k=repeat]:[&_rect]:fill-none',
  'data-[k=repeat]:[&_rect]:stroke-primary data-[k=repeat]:[&_rect]:stroke-[1.2]',
  'data-[k=below]:[&_rect]:fill-[color-mix(in_oklab,var(--sc-quiet)_28%,var(--sc-page))]',
  '[&_path]:stroke-quiet [&_path]:stroke-[1.4] [&_path]:[stroke-linecap:round]'
]
/**
 * A step's name over its figure beneath the track, the first and last held to
 * the track's ends.
 */
const NAME = [
  'absolute left-[calc(var(--sc-sieve-i)/3*100%)] grid font-code text-[0.75rem]/[20px] font-medium',
  'tracking-[0.1em] whitespace-nowrap text-(--sc-data-quiet) uppercase transition-colors duration-fade',
  'ease-glide data-on:text-(--sc-data-ink)'
]
/**
 * The swatch between two notches of the rail in the colors of the squares the
 * later step drops.
 */
const SPANS = {
  below  : '[background:repeating-linear-gradient(-45deg,var(--sc-quiet)_0_1.4px,color-mix(in_oklab,var(--sc-quiet)_28%,var(--sc-page))_1.4px_7px)]',
  repeat : 'border-[1.2px] border-primary',
  stored : '[background:repeating-linear-gradient(90deg,var(--sc-light)_0_12px,var(--sc-primary)_12px_24px)] '
         + '[box-shadow:inset_0_0_0_1px_var(--sc-rule)]'
} as const
/**
 * The notches and the thumb on the rail, centered on their point of it.
 */
const STOP = 'absolute top-4 box-border bg-page [translate:-50%_-50%]'

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
      'class'     : [KIND, 'transition-opacity duration-glide ease-glide data-gone:opacity-12'],
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
  return h('ul', {
    'aria-label' : 'What each square stands for',
    'class'      : [
      parts.BARE,
      'flex flex-wrap gap-x-[18px] gap-y-1.5 font-code text-[0.75rem]/[18px] font-medium tracking-[0.1em]',
      'text-(--sc-data-quiet) uppercase *:inline-flex *:items-center *:gap-[7px]'
    ]
  }, sieve.KEY.map(({ kind, label }) => h('li', [h('svg', {
      'aria-hidden' : 'true',
      'class'       : [KIND, kind === 'stored' ? 'h-[13px] w-[28px]' : 'size-[13px]'],
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
      'class'     : [
        'absolute top-2.5 left-[calc(var(--sc-sieve-i)/3*100%+10px)] box-border h-3 w-[calc(100%/3-20px)]',
        'rounded-xs transition-opacity duration-glide ease-glide data-gone:opacity-18', SPANS[kind]
      ],
      'data-gone' : kind !== 'stored' && at > index ? '' : undefined,
      'data-k'    : kind,
      'style'     : { '--sc-sieve-i': index }
    })),
    ...sieve.STEPS.map((_, index) => h('i', {
      'class'     : [
        STOP, 'left-[calc(var(--sc-sieve-i)/3*100%)] size-3 rounded-xs border-2 border-rule '
            + 'data-past:border-run'
      ],
      'data-past' : index <= at ? '' : undefined,
      'style'     : { '--sc-sieve-i': index }
    })),
    h('b', {
      class: [
        STOP, 'left-[calc(var(--sc-sieve-at)*100%)] size-6 rounded-[5px] border-2 border-run '
            + 'transition-[left]',
        'duration-glide ease-glide',
        '[box-shadow:inset_0_0_0_4px_var(--sc-page),inset_0_0_0_12px_var(--sc-run),0_1px_3px_color-mix(in_oklab,var(--sc-ink)_30%,transparent)]'
      ]
    })
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
  return h('div', {
    class : 'grid gap-2 px-[calc(var(--sc-sieve-thumb)/2)] [--sc-sieve-thumb:28px]',
    style : { '--sc-sieve-at': at / last }
  }, [
    h('div', {
      'aria-label'     : 'Step',
      'aria-valuemax'  : sieve.STEPS.length,
      'aria-valuemin'  : 1,
      'aria-valuenow'  : at + 1,
      'aria-valuetext' : `${step.name}: ${step.say}`,
      'class'          : 'relative h-8 cursor-pointer touch-none focus-visible:rounded-sm '
                       + 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-run',
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
    steps(at)
  ])
}

/**
 * Draws each step's name over its figure beneath the track, the current one in
 * the ink.
 */
function steps(at: number): VNode {
  const last = sieve.STEPS.length - 1
  return h('ol', {
    'aria-hidden' : 'true',
    'class'       : [parts.BARE, 'relative h-[42px]']
  }, sieve.STEPS.map(({ figure, name }, index) => h('li', {
    'class'   : [
      NAME, {
        0      : 'justify-items-start [translate:calc(var(--sc-sieve-thumb)/-2)_0]',
        [last] : 'justify-items-end [translate:calc(-100%+var(--sc-sieve-thumb)/2)_0]'
      }[index] ?? 'justify-items-center [translate:-50%_0]'
    ],
    'data-on' : index === at ? '' : undefined,
    'style'   : { '--sc-sieve-i': index }
  }, [
    h('span', name),
    h('span', {
      class: 'font-display text-[0.875rem]/[22px] font-normal tracking-[0] normal-case lining-nums '
           + 'tabular-nums'
    }, figure)
  ])))
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
      return h('div', { class: parts.PLATE, ref: root }, [
        h('div', { class: parts.HEAD }, [
          h('span', { class: parts.BIG }, counted(step.total)),
          h('p', { 'aria-live': 'polite', 'class': parts.SAY }, step.say)
        ]),
        key(),
        h('svg', {
          'aria-label' : `${sieve.SQUARES.length} squares, ten thousand games each, at the step ${step.name}`,
          'class'      : 'block h-auto max-h-[640px] w-full',
          'role'       : 'img',
          'viewBox'    : `-1 -1 ${sieve.COLUMNS * 17} ${Math.ceil(sieve.SQUARES.length / sieve.COLUMNS) * 17}`
        }, cells(at.value)),
        slider(at.value, go)
      ])
    }
  }
})
