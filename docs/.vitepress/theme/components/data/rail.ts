import { useTransition }                                                    from '@vueuse/core'
import { type PropType, type VNode, computed, defineComponent, h, shallowRef, watch } from 'vue'

import * as files      from '../../../lib/data/files.ts'
import { counted }     from '../../../lib/data/numbers.ts'
import { useMotion }   from '../../../lib/motion/control.ts'
import * as timing     from '../../../lib/motion/timing.ts'

/**
 * Draws a section's name beside a dot in its hue.
 */
function stamp(section: files.Section): VNode {
  return h('span', { class: 'sc-data-stamp', style: { '--sc-data-hue': files.HUES[section] } }, section)
}

/**
 * Draws the scale beneath the cells, each decade it names centered under its
 * cell, the first set to the left of its cell and the last to the right where
 * the two would otherwise run together, or an opening's place among the
 * Openings by games at the scale's left.
 */
function scaleOf(card: files.Card, entry: files.Entry, width: number): VNode[] {
  if (entry.section === 'Openings') {
    return [h('span', { class: 'sc-data-rank' }, `No. ${card.rank + 1} of ${card.of} by games held`)]
  }
  const close = card.scale.length > 1 && card.scale[1]![1] - card.scale[0]![1] < 3
  return card.scale.map(([label, at], place) => h('span', {
    class : { 'sc-data-after': close && place === 1, 'sc-data-before': close && place === 0 },
    style : { left: `${(at + 0.5) / width * 100}%` }
  }, label))
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

    return (): VNode => {
      const { entry } = props
      const opening   = entry.section === 'Openings'
      const other     = twin.value

      return h('div', { 'aria-live': 'polite', class: 'sc-data-rail' }, [
        h('div', { class: 'sc-data-rail-card', style: { '--sc-data-hue': files.HUES[entry.section] } }, [
          h('div', { class: 'sc-data-rail-top' }, [
            h('p', { class: 'sc-data-rail-name', ref: settling(0), title: entry.listed.title },
              entry.listed.title),
            h('b', [counted(Math.round(shown.value)), h('small', 'held')])
          ]),
          h('div', { class: 'sc-data-rail-sub', ref: settling(1) }, [
            stamp(entry.section),
            h('code', entry.listed.file),
            h('span', files.heading(entry))
          ]),
          opening
            ? h('div', { class: 'sc-data-rail-moves' }, card.value.moves.map(move => h('code', move)))
            : h('div', { class: 'sc-data-rail-cells', style: { '--sc-data-n': props.decades.length } },
                card.value.cells.map((value, place) =>
                  h('i', { style: { '--sc-data-k': place, '--sc-data-v': value } }))),
          h('div', { class: 'sc-data-rail-scale' }, scaleOf(card.value, entry, props.decades.length))
        ]),
        h('div', { class: 'sc-data-rail-tab', ref: settling(2) }, other
          ? [h('span', 'Also under'), stamp(other.section), h('code', other.listed.file),
             h('span', { class: 'sc-data-rail-twin' }, `${counted(other.listed.games)} held`)]
          : [h('span', 'Only under'), stamp(entry.section)])
      ])
    }
  }
})
