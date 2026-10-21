import { type PropType, Transition, type VNode, defineComponent, h, shallowRef, useId } from 'vue'

import * as files          from '../../../lib/data/files.ts'
import { counted, summed } from '../../../lib/data/numbers.ts'

/**
 * One initial's archives, ranked by their games, each row drawn over its
 * player's games by decade, beneath a heading naming the initial and its
 * archives' games and above an axis naming the years the curves cross.
 */
const Ranked = defineComponent({
  name: 'ScotchRanked',

  props: {
    initial : { required: true, type: String },
    players : { required: true, type: Array as PropType<readonly files.Player[]> },
    span    : { required: true, type: Object as PropType<files.Span> }
  },

  setup: props => (): VNode => {
    const ranked = files.rankedUnder(props.players, props.initial)
    const games  = summed(ranked.map(player => player.games))
    const marks  = files.MARKED.filter(year => year >= props.span.low && year <= props.span.high)

    return h('div', { class: 'sc-data-ranked' }, [
      h('div', { class: 'sc-data-folio' }, [
        h('b', props.initial),
        h('span', `${ranked.length} ${ranked.length === 1 ? 'file' : 'files'} · ${counted(games)} games`)
      ]),
      h('div', { class: 'sc-data-rows-head' }, [
        h('span', 'No.'),
        h('span', 'Player, over the games by decade'),
        h('span', 'Games')
      ]),
      h('div', { class: 'sc-data-rows' }, ranked.map((player, index) =>
        h('div', {
          class : 'sc-data-player',
          style : { '--sc-data-row': index },
          title : files.playedSpan(player)
        }, [
          h('svg', {
            'aria-hidden'       : 'true',
            class               : 'sc-data-curve',
            preserveAspectRatio : 'none',
            viewBox             : `0 0 ${files.CURVE.width} ${files.CURVE.height}`
          }, [
            h('path', { class: 'sc-data-curve-fill', d: files.curvePath(player, props.span, true) }),
            h('path', { class: 'sc-data-curve-line', d: files.curvePath(player, props.span) })
          ]),
          h('span', { class: 'sc-data-number' }, String(index + 1)),
          h('a', { class: 'sc-data-who', href: player.address }, player.name),
          h('span', { class: 'sc-data-games' }, counted(player.games))
        ]))),
      h('div', { 'aria-hidden': 'true', class: 'sc-data-years' }, marks.map(year =>
        h('span', { style: { left: `${files.yearAt(props.span, year).toFixed(2)}%` } }, String(year))))
    ])
  }
})

/**
 * The rating list: a tab for each initial the archives are filed under, and
 * beneath the tabs the picked initial's archives, ranked by their games and
 * each drawn over its player's games by decade, opening on the initial whose
 * archives hold the most games.
 */
export const Files = defineComponent({
  name  : 'ScotchFiles',
  setup : () => {
    const players  = files.playersOf()
    const initials = files.initialsOf(players)
    const span     = files.curveSpan()
    const picked   = shallowRef(files.busiest(players))
    const id       = useId()
    const tabs     = new Map<string, HTMLElement>()

    const pick = (initial: string, focus = false): void => {
      picked.value = initial
      if (focus) tabs.get(initial)?.focus()
    }

    const keyed = (event: KeyboardEvent): void => {
      const at = initials.indexOf(picked.value)
      const to = { ArrowLeft: at - 1, ArrowRight: at + 1, End: initials.length - 1, Home: 0 }[event.key]
      if (to === undefined) return
      event.preventDefault()
      pick(initials.at(to % initials.length)!, true)
    }

    return (): VNode => h('div', { class: 'sc-data sc-data-plate sc-data-files' }, [
      h('div', {
        'aria-label' : 'Initials',
        class        : 'sc-data-tabs',
        onKeydown    : keyed,
        role         : 'tablist'
      }, initials.map(initial =>
        h('button', {
          'aria-controls' : `${id}-panel`,
          'aria-selected' : initial === picked.value,
          class           : 'sc-data-tab',
          id              : `${id}-${initial}`,
          onClick         : () => pick(initial),
          ref             : (node: unknown) => { if (node instanceof HTMLElement) tabs.set(initial, node) },
          role            : 'tab',
          tabindex        : initial === picked.value ? 0 : -1,
          type            : 'button'
        }, initial))),
      h('div', {
        'aria-labelledby' : `${id}-${picked.value}`,
        class             : 'sc-data-swap',
        id                : `${id}-panel`,
        role              : 'tabpanel'
      }, h(Transition, { name: 'sc-data-swap' }, () =>
        h(Ranked, { initial: picked.value, key: picked.value, players, span })))
    ])
  }
})
