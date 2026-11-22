import { clamp }                                                      from '@vueuse/core'
import { type ShallowRef, type VNode, defineComponent, h, shallowRef } from 'vue'

import { stepped }          from '../../../lib/data/keys.ts'
import { counted }          from '../../../lib/data/numbers.ts'
import { REACH }            from '../../../lib/methods/reach.ts'
import { useMotion }        from '../../../lib/motion/control.ts'
import { CAPS, CARD, NOTE } from './parts.ts'

const { counts, games, high, longest, low, median, tallest } = REACH

/**
 * The count read out under the pointer, set large.
 */
const FIGURE = 'font-display text-[2rem]/[1] text-ink tabular-nums'
/**
 * The lengths the axis names: the first, then every tenth short of the
 * longest.
 */
const TICKS = [1, ...Array.from({ length: Math.ceil(longest / 10) - 1 }, (_, at) => (at + 1) * 10)]

const centerOf  = (length: number): string => `${(length - 0.5) / longest * 100}%`
const countAt   = (length: number): number => counts[length - 1]!
const gamesOf   = (count: number): string => `${counted(count)} ${count === 1 ? 'game' : 'games'}`
const holds     = (count: number): string => count === 1 ? 'game holds' : 'games hold'
const positions = (length: number): string => `${length} ${length === 1 ? 'position' : 'positions'}`

/**
 * Draws the bars, one for each length, the median's in the run's color, the
 * picked length's in ink, the middle half's shaded, and the rest quiet.
 */
function bars(picked: number, moving: boolean): VNode {
  const fill = (at: number): string => {
    if (at === median) return 'fill-run'
    if (at === picked) return 'fill-ink'
    return at >= low && at <= high ? 'fill-run/65' : 'fill-quiet/35'
  }
  return h('svg', {
    'aria-hidden'         : 'true',
    'class'               : 'absolute inset-0 block size-full',
    'preserveAspectRatio' : 'none',
    'viewBox'             : `0 0 ${longest} ${tallest}`
  }, counts.map((count, index) => h('rect', {
    class  : [fill(index + 1), moving ? 'transition-[fill] duration-glide' : ''],
    height : count,
    width  : 0.76,
    x      : index + 0.12,
    y      : tallest - count
  })))
}

/**
 * Draws a hairline from the top of the plot down to the bar of a length, under
 * the label calling it out.
 */
function leader(length: number, tone: string): VNode {
  return h('i', {
    'aria-hidden' : 'true',
    'class'       : ['absolute top-0 w-px', tone],
    'style'       : { height: `${(1 - countAt(length) / tallest) * 100}%`, left: centerOf(length) }
  })
}

/**
 * Draws the plot: the median and the longest called out over the bars, the
 * bars as a slider over the lengths, and the axis under them.
 */
function plot(length: ShallowRef<number>, moving: boolean): VNode {
  return h('div', { class: 'grid gap-1.5 [grid-area:plot]' }, [
    h('div', { class: [CAPS, 'relative h-4'] }, [
      h('span', { class: 'absolute -translate-x-1/2 text-run', style: { left: centerOf(median) } },
        `Median ${median}`),
      h('span', { class: 'absolute right-0 text-quiet' }, `Longest ${longest}`)
    ]),
    h('div', {
      ...sliderOf(length),
      class: 'relative h-28 cursor-crosshair touch-none rounded-[2px] focus-ring md:h-40'
    }, [leader(median, 'bg-run/60'), leader(longest, 'bg-quiet/60'), bars(length.value, moving)]),
    h('div', { class: [CAPS, 'relative h-4 text-quiet'] }, TICKS.map(at => h('span', {
      class : ['absolute', at === 1 ? 'left-0' : '-translate-x-1/2'],
      style : at === 1 ? undefined : { left: centerOf(at) }
    }, String(at)))),
    h('span', { class: [CAPS, 'text-right text-quiet'] }, 'Positions in the longest run')
  ])
}

/**
 * Draws the count at the picked length large, the sentence it opens, and the
 * key to the shaded middle half.
 */
function readout(picked: number): VNode {
  return h('div', { class: 'grid content-start gap-2 [grid-area:read] lg:justify-items-end lg:text-right' }, [
    h('div', { 'aria-live': 'polite', 'class': 'grid gap-1' }, [
      h('span', { class: FIGURE }, counted(countAt(picked))),
      h('p', { class: NOTE }, `${holds(countAt(picked))} a longest run of ${positions(picked)}`)
    ]),
    h('span', { class: 'inline-flex items-center gap-2' }, [
      h('i', { 'aria-hidden': 'true', 'class': 'size-2.5 shrink-0 rounded-[2px] bg-run/65' }),
      h('span', { class: [CAPS, 'text-quiet'] }, `Middle half, ${low} to ${high}`)
    ])
  ])
}

/**
 * Builds the attributes and calls making the plot a slider over the lengths:
 * the pointer picks the length under it, the keys step it, and a mouse leaving
 * returns it to the median.
 */
function sliderOf(length: ShallowRef<number>): Record<string, unknown> {
  const pick = (event: PointerEvent): void => {
    const box    = (event.currentTarget as Element).getBoundingClientRect()
    length.value = clamp(Math.floor((event.clientX - box.left) / box.width * longest) + 1, 1, longest)
  }
  return {
    'aria-label'     : 'Length of the longest run',
    'aria-valuemax'  : longest,
    'aria-valuemin'  : 1,
    'aria-valuenow'  : length.value,
    'aria-valuetext' : `${gamesOf(countAt(length.value))} with a longest run of ${length.value}`,
    'onKeydown'      : (event: KeyboardEvent): void => {
      const to = stepped(longest, event.key, 1, length.value)
      if (to === undefined) return
      event.preventDefault()
      length.value = to
    },
    'onPointerdown'  : pick,
    'onPointerleave' : (event: PointerEvent): void => {
      if (event.pointerType === 'mouse') length.value = median
    },
    'onPointermove'  : pick,
    'role'           : 'slider',
    'tabindex'       : 0
  }
}

/**
 * The spread of the longest run's length over the sampled games: a bar for
 * each length counting the games whose longest run holds it, the middle half
 * of the games shaded, the median and the longest called out over their bars,
 * and the count at the length under the pointer read out beside them. It
 * follows the ARIA slider pattern over the lengths, the arrows stepping it one,
 * Page Up and Page Down ten, and Home and End to either end, and returns to the
 * median when a mouse leaves it.
 */
export const Reach = defineComponent({
  name  : 'ScotchReach',
  setup : () => {
    const { moving } = useMotion()
    const length     = shallowRef(median)

    return (): VNode => h('div', {
      class: [
        CARD, 'gap-x-6',
        '[grid-template-areas:"head"_"plot"_"read"]',
        'md:grid-cols-[11rem_minmax(0,1fr)] md:[grid-template-areas:"head_plot"_"read_plot"]',
        'lg:grid-cols-[minmax(0,1fr)_auto] lg:[grid-template-areas:"head_read"_"plot_plot"]'
      ]
    }, [
      h('div', { class: 'grid gap-1 [grid-area:head]' }, [
        h('span', { class: [CAPS, 'text-run'] }, 'The longest run, per sampled game'),
        h('p', { class: NOTE },
          `A bar for each length, counting the ${counted(games)} sampled games whose longest run holds it.`)
      ]),
      plot(length, moving.value),
      readout(length.value)
    ])
  }
})
