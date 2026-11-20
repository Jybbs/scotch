import { useTransition }                                                    from '@vueuse/core'
import { type PropType, type VNode, computed, defineComponent, h, shallowRef, watch } from 'vue'

import * as files      from '../../../lib/data/files.ts'
import { counted }     from '../../../lib/data/numbers.ts'
import { useMotion }   from '../../../lib/motion/control.ts'
import * as timing     from '../../../lib/motion/timing.ts'

/**
 * The card, railed at its left in the hue of the file's section.
 */
const CARD = 'relative grid min-w-0 gap-[9px] overflow-hidden rounded-[8px_8px_8px_0] border '
           + 'border-(--sc-data-rule) bg-raised py-[13px] pr-4 pl-5 before:absolute before:inset-y-0 '
           + 'before:right-auto before:left-0 before:w-1 before:bg-(--sc-data-hue) '
           + 'before:transition-[background-color] before:duration-settle '
           + "before:ease-glide before:content-['']"
/**
 * The row of a file's decades, a cell per decade shaded by its games and
 * recoloring left to right.
 */
const CELLS = 'grid h-4 grid-cols-[repeat(var(--sc-data-n),minmax(0,1fr))] gap-0.5 *:rounded-xs '
            + '[--sc-data-empty:color-mix(in_oklab,var(--sc-data-rule)_45%,transparent)] '
            + '*:bg-[color-mix(in_oklab,var(--sc-data-hue)_calc(var(--sc-data-v,0)*100%),var(--sc-data-empty))] '
            + '*:transition-[background-color] *:delay-[calc(var(--sc-data-k,0)*14ms)] *:duration-settle '
            + '*:ease-glide'
/**
 * A file's path or an opening's move on the card, in the code face.
 */
const CODE = 'min-w-0 bg-transparent bg-none p-0 font-code font-medium text-(--sc-data-ink)'
/**
 * A label of the scale beneath the cells, at its point of the scale.
 */
const SCALE = 'absolute top-0 whitespace-nowrap transition-[left] duration-glide ease-glide'
/**
 * Where each label of the scale stands against its point.
 */
const SIDES = {
  after  : '[transform:none]',
  before : '[transform:translateX(-100%)]',
  middle : '[transform:translateX(-50%)]'
} as const
/**
 * The tab beneath the card naming the file's other section.
 */
const TAB = 'flex max-w-[calc(100%-16px)] min-w-0 items-center gap-2 justify-self-start overflow-hidden '
          + 'rounded-b-md border border-(--sc-data-rule) [border-top:0] bg-(--sc-data-page) px-3 pt-1.5 '
          + 'pb-[7px] font-body text-[0.78rem]/none font-normal whitespace-nowrap text-(--sc-data-quiet)'

/**
 * Draws an opening's moves, or a cell for each of `count` decades shaded by the
 * games of that decade.
 */
function cells(card: files.Card, count: number, entry: files.Entry): VNode {
  if (entry.section === 'Openings') {
    return h('div', { class: 'flex h-4 items-stretch gap-1' }, card.moves.map(move => h('code', {
      class: [
        CODE, 'inline-grid place-items-center overflow-visible rounded-xs px-1.5 text-[0.68rem]/none',
        'bg-[color-mix(in_oklab,var(--sc-data-hue)_22%,transparent)] text-ellipsis whitespace-nowrap'
      ]
    }, move)))
  }
  return h('div', { class: CELLS, style: { '--sc-data-n': count } }, card.cells.map((value, place) =>
    h('i', { style: { '--sc-data-k': place, '--sc-data-v': value } })))
}

/**
 * Draws the scale beneath the cells, each decade it names centered under its
 * cell, the first set to the left of its cell and the last to the right where
 * the two would otherwise run together, or an opening's place among the
 * Openings by games at the scale's left.
 */
function scaleOf(card: files.Card, entry: files.Entry, width: number): VNode[] {
  if (entry.section === 'Openings') {
    return [h('span', {
      'class'     : [SCALE, SIDES.after, 'left-0'],
      'data-side' : 'after'
    }, `No. ${card.rank + 1} of ${card.of} by games held`)]
  }
  const close = card.scale.length > 1 && card.scale[1]![1] - card.scale[0]![1] < 3
  return card.scale.map(([label, at], place) => {
    const side = close && place < 2 ? (['before', 'after'] as const)[place]! : 'middle'
    return h('span', {
      'class'     : [SCALE, SIDES[side]],
      'data-side' : side,
      'style'     : { left: `${(at + 0.5) / width * 100}%` }
    }, label)
  })
}

/**
 * Draws a section's name beside a dot in its hue.
 */
function stamp(section: files.Section): VNode {
  return h('span', {
    class : 'inline-flex items-center gap-[5px] font-code text-[0.62rem]/none font-semibold '
          + 'tracking-[0.08em] whitespace-nowrap text-(--sc-data-quiet) uppercase before:size-[7px] '
          + 'before:rounded-full '
          + "before:bg-(--sc-data-hue) before:content-['']",
    style : { '--sc-data-hue': files.HUES[section] }
  }, section)
}

/**
 * Draws the line under the file's name: its section, its path, and its decades
 * or its heading.
 */
function subLine(entry: files.Entry, settled: (node: unknown) => void): VNode {
  return h('div', {
    class : 'flex min-w-0 items-center gap-2.5 overflow-hidden font-body text-[0.8rem]/[1.2] font-normal '
          + 'whitespace-nowrap text-(--sc-data-quiet)',
    ref   : settled
  }, [
    stamp(entry.section),
    h('code', { class: [CODE, 'overflow-hidden text-[0.72rem]/none text-ellipsis whitespace-nowrap'] },
      entry.listed.file),
    h('span', files.heading(entry))
  ])
}

/**
 * Draws the tab beneath the card naming the same file name under another
 * section, or the one section it stands under.
 */
function tab(entry: files.Entry, other: files.Entry | null, settled: (node: unknown) => void): VNode {
  return h('div', { class: TAB, ref: settled }, [
    h('span', { class: 'font-code text-[0.6rem]/[1.3] font-semibold tracking-[0.09em] uppercase' },
      other ? 'Also under' : 'Only under'),
    ...other
      ? [
          stamp(other.section),
          h('code', {
            class: [CODE, 'flex-none overflow-hidden text-[0.72rem]/none text-ellipsis whitespace-nowrap']
          }, other.listed.file),
          h('span', {
            class: 'font-code text-[0.72rem]/none font-medium text-(--sc-data-quiet) tabular-nums '
                 + 'max-sm:hidden'
          }, `${counted(other.listed.games)} held`)
        ]
      : [stamp(entry.section)]
  ])
}

/**
 * Draws the file's name beside the `games` the store holds from it.
 */
function titleRow(entry: files.Entry, games: number, settled: (node: unknown) => void): VNode {
  return h('div', { class: 'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3' }, [
    h('p', {
      class : 'm-0! min-w-0 overflow-hidden font-display text-[1.32rem]/[1.15]! font-normal text-ellipsis '
            + 'whitespace-nowrap!',
      ref   : settled,
      title : entry.listed.title
    }, entry.listed.title),
    h('b', { class: 'text-right font-code text-[0.9rem]/none font-medium tabular-nums' }, [
      counted(games),
      h('small', {
        class: 'ml-1.5 font-code text-[0.62rem]/none font-medium tracking-[0.06em] text-(--sc-data-quiet) '
             + 'normal-nums uppercase'
      }, 'held')
    ])
  ])
}

/**
 * Lifts the card's name, its sub line, and its tab into place one after the
 * other each time `entry` changes, unless the site's drawings hold still,
 * returning the call that registers the node at each place in that order.
 */
function useSettle(entry: () => files.Entry): (place: number) => (node: unknown) => void {
  const { moving } = useMotion()
  const settled    = shallowRef<HTMLElement[]>([])
  const frames     = [{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }]
  const easing     = timing.cubicBezier(timing.CURVES.glide)

  watch(entry, () => {
    if (!moving.value) return
    settled.value.forEach((node, place) => node.animate(frames, {
      delay    : place * timing.DURATIONS.lag,
      duration : timing.DURATIONS.enter,
      easing   : easing,
      fill     : 'backwards'
    }))
  })

  return place => node => {
    if (node instanceof HTMLElement) settled.value[place] = node
  }
}

/**
 * The card beneath the file list, its rail in the hue of the file's section:
 * the file's name over the games the store holds from it, counting toward each
 * new file's figure, then its section, its path, and its decades or its
 * heading, then one cell per decade shaded by the games of that decade and
 * recoloring left to right as the file changes, or an opening's moves, and on
 * a tab beneath the card the same file name under another section.
 */
export const Rail = defineComponent({
  name: 'ScotchRail',

  props: {
    decades : { required: true, type: Array as PropType<readonly number[]> },
    entries : { required: true, type: Array as PropType<readonly files.Entry[]> },
    entry   : { required: true, type: Object as PropType<files.Entry> }
  },

  setup: props => {
    const { moving } = useMotion()
    const card       = computed(() => files.cardOf(props.decades, props.entries, props.entry))
    const twin       = computed(() => files.twinOf(props.entries, props.entry))
    const shown      = useTransition(computed(() => card.value.games), {
      disabled : computed(() => !moving.value),
      duration : timing.DURATIONS.settle,
      easing   : timing.CURVES.glide
    })
    const settling   = useSettle(() => props.entry)

    return (): VNode => h('div', { 'aria-live': 'polite', 'class': 'grid min-w-0' }, [
      h('div', { class: CARD, style: { '--sc-data-hue': files.HUES[props.entry.section] } }, [
        titleRow(props.entry, Math.round(shown.value), settling(0)),
        subLine(props.entry, settling(1)),
        cells(card.value, props.decades.length, props.entry),
        h('div', {
          class: 'relative h-3 font-code text-[0.6rem]/none font-medium text-(--sc-data-quiet) tabular-nums'
        }, scaleOf(card.value, props.entry, props.decades.length))
      ]),
      tab(props.entry, twin.value, settling(2))
    ])
  }
})
