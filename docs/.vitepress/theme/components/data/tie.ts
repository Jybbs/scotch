import { type ShallowRef, type VNode, defineComponent, h, shallowRef } from 'vue'

import { useChart }  from '../../../lib/data/chart.ts'
import * as flow     from '../../../lib/data/flow.ts'
import * as tie      from '../../../lib/data/tie.ts'
import { flowDrawn } from './flow.ts'
import { Plate }     from './plate.ts'

/**
 * Builds the calls pointing a part of the figure at a focus, on a pointer
 * entering it, a press, or the keyboard's focus.
 */
function calling(focus: ShallowRef<tie.Focus>): (to: tie.Focus) => Record<string, () => void> {
  return to => {
    const go = (): void => { focus.value = to }
    return { onClick: go, onFocus: go, onPointerenter: go }
  }
}

/**
 * Draws the places and the branches beside the flow, or beneath it where the
 * figure is narrow, each branch a control lighting the places it holds and
 * each place a control lighting its game.
 */
function leaves(
  calls  : ReturnType<typeof calling>,
  focus  : tie.Focus,
  layout : flow.FlowLayout,
  lit    : tie.Lit
): VNode {
  return h('div', {
    class : ['sc-data-tie-leaves', { 'sc-data-tie-beside': !layout.narrow }],
    style : layout.narrow ? {} : { height: `${layout.height + 28}px` }
  }, tie.ratingKinds.map((kind, at) => h('div', {
    class : ['sc-data-tie-leaf', { 'sc-data-on': lit.bin === null && lit.kind === at }],
    style : layout.narrow ? {} : { top: `${layout.middles[at]}px` }
  }, [
    h('button', {
      'aria-pressed' : String(focus.by === 'kind' && focus.at === at),
      'class'        : 'sc-data-tie-head',
      'type'         : 'button',
      ...calls({ at, by: 'kind' })
    }, [h('b', tie.shared(kind.share)), h('span', `${kind.label}, ${kind.rule}`)]),
    h('div', {
      'aria-label' : `The tie’s ${tie.places(kind.games)}`,
      'class'      : 'sc-data-tie-places',
      'role'       : 'group'
    }, kind.games.map(game => place(calls, focus, game, lit)))
  ])))
}

/**
 * Draws one place of the tie as a control lighting that game, ringed where a
 * branch or a bin lights it and dimmed where the focus lights other games.
 */
function place(calls: ReturnType<typeof calling>, focus: tie.Focus, game: tie.TiedGame, lit: tie.Lit): VNode {
  const shown = lit.games.includes(game)
  return h('button', {
    'aria-label'   : `Place ${game.place}, ${game.name}, ${tie.ratingSpoken(game)}`,
    'aria-pressed' : String(focus.by === 'game' && focus.at === game.place - 1),
    'class'        : ['sc-data-tie-place', { 'sc-data-off': !shown, 'sc-data-on': !lit.game && shown }],
    'data-k'       : game.rated,
    'type'         : 'button',
    ...calls({ at: game.place - 1, by: 'game' })
  }, String(game.place))
}

/**
 * Draws the readout beneath the figure, one panel for every focus with only
 * the current one shown, so a change of focus crossfades between them, above
 * the meter of the share of every stored game the focus holds.
 */
function readout(focus: tie.Focus, lit: tie.Lit): VNode {
  const every: tie.Focus[] = [
    ...tie.tiedGames.map((_, at) => ({ at, by: 'game' as const })),
    ...tie.ratingKinds.map((_, at) => ({ at, by: 'kind' as const })),
    ...tie.meanBins.map((_, at) => ({ at, by: 'bin' as const }))
  ]
  return h('div', { 'aria-live': 'polite', 'class': 'sc-data-tie-readout' }, [
    h('div', { class: 'sc-data-tie-panels' }, every.map(each => {
      const shown = each.at === focus.at && each.by === focus.by
      const panel = tie.panelOf(each)
      return h('div', {
        'aria-hidden' : String(!shown),
        'class'       : ['sc-data-tie-panel', { 'sc-data-on': shown }]
      }, [
        each.by === 'game'
          ? h('span', { 'class': 'sc-data-tie-place', 'data-k': tie.tiedGames[each.at]!.rated }, panel.big)
          : h('span', { class: 'sc-data-tie-big' }, panel.big),
        h('div', [h('strong', panel.title), h('small', panel.line), h('p', panel.sentence)])
      ])
    })),
    h('div', { class: 'sc-data-tie-meter' }, [
      h('span', { class: 'sc-data-tie-gauge' }, [h('i', { style: { '--sc-data-tie-share': lit.share } })]),
      h('span', 'Share of every stored game')
    ])
  ])
}

/**
 * The order a match shows tied games in, drawn as every stored game flowing
 * through the order's two tests, the band carrying both ratings by the mean of
 * the two, and each place, branch, pin, and bin a control reading out what it
 * holds.
 */
export const TieOrder = defineComponent({
  name  : 'ScotchTieOrder',
  setup : () => {
    const focus = shallowRef<tie.Focus>({ at: 0, by: 'game' })
    const calls = calling(focus)

    const { chart, layout, sized, style } = useChart(flow.flowLayout)

    return (): VNode => {
      const lit  = tie.litBy(focus.value)
      const kind = tie.ratingKinds[lit.kind]!
      const look = layout.value.narrow
        ? style.value
        : { ...style.value, gridTemplateColumns: `${layout.value.plot}px minmax(0, 1fr)` }
      return h(Plate, { big: tie.shared(kind.share), say: tie.kindLead(kind) }, () => [
        h('div', { class: 'sc-data-chart sc-data-tie', ref: chart, style: look }, sized.value
          ? [flowDrawn(calls, layout.value, lit), leaves(calls, focus.value, layout.value, lit)]
          : []),
        readout(focus.value, lit)
      ])
    }
  }
})
