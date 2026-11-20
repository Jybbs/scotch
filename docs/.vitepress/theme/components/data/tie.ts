import { type ShallowRef, type VNode, defineComponent, h, shallowRef } from 'vue'

import { useChart }  from '../../../lib/data/chart.ts'
import * as flow     from '../../../lib/data/flow.ts'
import * as tie      from '../../../lib/data/tie.ts'
import { flowDrawn } from './flow.ts'
import * as parts    from './parts.ts'
import { Plate }     from './plate.ts'

/**
 * The ring a control of the figure takes while it holds the focus.
 */
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sc-data-link)'
/**
 * A panel of the readout, every panel drawn in one cell and only the current
 * one shown and reachable.
 */
const PANEL = [
  'pointer-events-none grid min-w-0 grid-cols-[3.2rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5',
  'opacity-0 transition-[opacity,translate] duration-settle ease-glide [grid-area:1/1] [translate:0_4px]',
  'data-on:pointer-events-auto data-on:opacity-100 data-on:[translate:0_0]',
  'max-sm:grid-cols-[2.6rem_minmax(0,1fr)] max-sm:gap-x-2.5'
]
/**
 * A place of the tie, its number on a disc in the color of the ratings its game
 * carries.
 */
const PLACE = [
  'm-0 grid place-items-center rounded-full border-0 p-0 font-code font-bold data-[k=0]:bg-(--sc-data-page)',
  'data-[k=0]:text-(--sc-data-ink) data-[k=0]:[box-shadow:inset_0_0_0_1.5px_var(--sc-data-ink)]',
  'data-[k=1]:bg-[color-mix(in_oklab,var(--sc-data-ink)_60%,var(--sc-data-page))]',
  'data-[k=1]:text-(--sc-data-page)',
  'data-[k=2]:bg-(--sc-data-link) data-[k=2]:text-(--sc-data-page)'
]
/**
 * The ring round a place a branch or a bin lights or a reader pressed, kept
 * outside the edge of a place carrying no rating.
 */
const RING = [
  'aria-pressed:[box-shadow:0_0_0_2px_var(--sc-data-page),0_0_0_3.5px_var(--sc-data-ink)]',
  'data-on:[box-shadow:0_0_0_2px_var(--sc-data-page),0_0_0_3.5px_var(--sc-data-ink)]',
  'data-[k=0]:aria-pressed:[box-shadow:inset_0_0_0_1.5px_var(--sc-data-ink),0_0_0_2px_var(--sc-data-page),0_0_0_3.5px_var(--sc-data-ink)]',
  'data-[k=0]:data-on:[box-shadow:inset_0_0_0_1.5px_var(--sc-data-ink),0_0_0_2px_var(--sc-data-page),0_0_0_3.5px_var(--sc-data-ink)]'
]
/**
 * The sentence a panel reads beneath its line.
 */
const SENTENCE = 'mx-0! mt-[5px]! mb-0! font-body text-[0.92rem]/[1.55]! font-normal'

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
    class : 'relative grid min-w-0 gap-1.5',
    style : layout.narrow ? {} : { height: `${layout.height + 28}px` }
  }, tie.ratingKinds.map((kind, at) => h('div', {
    'class'   : [
      'grid gap-1 border-l-2 border-l-transparent px-1.5 py-1 transition-[border-color,background-color]',
      'duration-settle ease-glide data-on:border-l-(--sc-data-ink)',
      'data-on:bg-[color-mix(in_oklab,var(--sc-data-link)_8%,var(--sc-data-page))]',
      { 'absolute inset-x-0 [transform:translateY(-50%)]': !layout.narrow }
    ],
    'data-on' : lit.bin === null && lit.kind === at ? '' : undefined,
    'style'   : layout.narrow ? {} : { top: `${layout.middles[at]}px` }
  }, [
    h('button', {
      'aria-pressed' : String(focus.by === 'kind' && focus.at === at),
      'class'        : [
        'm-0 flex cursor-pointer items-baseline gap-2 border-0 bg-transparent bg-none px-0 py-0.5 text-left',
        'font-code text-[0.58rem]/[1.2] font-medium tracking-[0.08em] text-(--sc-data-quiet) uppercase',
        'transition-[color] duration-settle ease-glide aria-pressed:text-(--sc-data-ink)', FOCUS
      ],
      'type'         : 'button',
      ...calls({ at, by: 'kind' })
    }, [
      h('b', {
        class: 'font-display text-[1.2rem]/none font-normal tracking-[0] text-(--sc-data-ink) normal-case '
             + 'lining-nums tabular-nums'
      }, tie.shared(kind.share)),
      h('span', `${kind.label}, ${kind.rule}`)
    ]),
    h('div', {
      'aria-label' : `The tie’s ${tie.places(kind.games)}`,
      'class'      : 'flex gap-1.5',
      'role'       : 'group'
    }, kind.games.map(game => place(calls, focus, game, lit)))
  ])))
}

/**
 * Draws the meter of the share of every stored game the lit focus holds.
 */
function meter(lit: tie.Lit): VNode {
  return h('div', {
    class: 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 font-code text-[0.56rem]/none '
         + 'font-medium tracking-[0.1em] text-(--sc-data-quiet) uppercase'
  }, [
    h('span', {
      class: 'block h-1.5 overflow-hidden rounded-[1px] '
           + 'bg-[color-mix(in_oklab,var(--sc-data-rule)_50%,var(--sc-data-page))]'
    }, [h('i', {
      class : 'block h-full w-[calc(var(--sc-data-tie-share,0)*100%)] bg-(--sc-data-link) '
            + 'transition-[width] duration-settle ease-glide',
      style : { '--sc-data-tie-share': lit.share }
    })]),
    h('span', 'Share of every stored game')
  ])
}

/**
 * Draws the panel of one focus, a figure or a place beside its title, line,
 * and sentence, faded in and lifted into place while it is the current one.
 */
function panel(each: tie.Focus, focus: tie.Focus): VNode {
  const shown = each.at === focus.at && each.by === focus.by
  const read  = tie.panelOf(each)
  return h('div', { 'aria-hidden': String(!shown), 'class': PANEL, 'data-on': shown ? '' : undefined }, [
    each.by === 'game'
      ? h('span', {
          'class'  : [PLACE, 'size-[2.3rem] text-[0.95rem]/none'],
          'data-k' : tie.tiedGames[each.at]!.rated
        }, read.big)
      : h('span', {
          class: 'font-display text-[1.7rem]/[1.05] font-normal lining-nums tabular-nums '
               + 'max-sm:text-[1.35rem]'
        }, read.big),
    h('div', [
      h('strong', { class: 'block font-body text-[0.95rem]/[1.3] font-semibold' }, read.title),
      h('small', {
        class: 'mt-0.5 block font-code text-[0.58rem]/[1.45] font-medium tracking-[0.08em] '
             + 'text-(--sc-data-quiet) uppercase'
      }, read.line),
      h('p', { class: SENTENCE }, read.sentence)
    ])
  ])
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
    'class'        : [
      PLACE, RING, FOCUS, 'size-[1.6rem] cursor-pointer text-[0.68rem]/none '
                        + 'transition-[box-shadow,opacity,scale]',
      'duration-settle ease-glide aria-pressed:[scale:1.12] data-off:opacity-38'
    ],
    'data-k'       : game.rated,
    'data-off'     : shown ? undefined : '',
    'data-on'      : !lit.game && shown ? '' : undefined,
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
  return h('div', {
    'aria-live' : 'polite',
    'class'     : 'grid min-w-0 gap-2.5 border-t-[1.5px] border-t-(--sc-data-ink) pt-2.5'
  }, [h('div', { class: 'grid min-w-0' }, every.map(each => panel(each, focus))), meter(lit)])
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
        h('div', {
          class : [parts.CHART, 'grid grid-cols-[minmax(0,1fr)] items-start gap-x-[22px] gap-y-3.5'],
          ref   : chart,
          style : look
        }, sized.value
          ? [flowDrawn(calls, layout.value, lit), leaves(calls, focus.value, layout.value, lit)]
          : []),
        readout(focus.value, lit)
      ])
    }
  }
})
