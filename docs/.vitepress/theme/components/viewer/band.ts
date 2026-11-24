import { type PropType, type Ref, type VNode, defineComponent, h, shallowRef } from 'vue'

import type { Match, Sample }            from '../../../lib/viewer/examples.ts'
import * as games                        from '../../../lib/viewer/games.ts'
import { COVERED, type Loaded, NOTHING } from '../../../lib/viewer/loaded.ts'
import { pgnOf }                         from '../../../lib/viewer/pgn.ts'
import type { Tied }                     from '../../../lib/viewer/ranks.ts'
import { Intake, TAKES }                 from './intake.ts'
import { Seat }                          from './seat.ts'
import { Tally }                         from './tally.ts'

/**
 * The band, the match beside the intake over a rule, one over the other on a
 * narrow screen, washed in the tint while a file is dragged over it.
 */
const BAND = 'grid min-w-0 grid-cols-2 items-center gap-x-10 border-b border-rule pb-[18px] [&_p]:m-0 '
           + '[&_p]:max-w-none data-drag:bg-tint data-drag:[box-shadow:0_0_0_2px_var(--sc-run)] '
           + 'max-lg:col-span-full max-lg:grid-cols-1 max-lg:gap-y-4'
/**
 * The details under the match's headline in the body face.
 */
const DETAILS = 'font-body text-base/[22px] font-normal text-quiet max-sm:text-[0.86rem]/[20px]'
/**
 * One of the two moves where the games part, underlined in its game's color,
 * or covered by a bar of the rule's color while the stored game's move is
 * covered.
 */
const NAMED = 'pb-px font-code text-[0.84rem]/none font-medium whitespace-nowrap text-ink '
            + '[box-shadow:inset_0_-2px_0_var(--sc-viewer-game)] data-covered:bg-rule '
            + 'data-covered:text-transparent'

/**
 * Reads whether a drag carries files, as one carrying a match file does.
 */
function carriesFiles(event: DragEvent): boolean {
  return !!event.dataTransfer?.types.includes('Files')
}

/**
 * What the band says of the loaded match: how many positions the two share, the
 * stored game, where it was played, the plies of the run, and the two moves
 * where the games part, each move in its game's color, the stored game's move
 * covered while `covering` is set.
 */
function details(covering: boolean, loaded: Loaded, tallied: boolean): VNode {
  const stored = loaded.match.stored
  if (!stored || !loaded.shared) return h('p', { class: DETAILS }, NOTHING)
  const { last, meet } = loaded.shared
  return h('p', { class: DETAILS }, [
    games.whereOf(stored) || 'Unknown event',
    dot(),
    `plies ${meet} to ${last}`,
    ...tallied ? [] : ties(loaded),
    loaded.leaving && loaded.parting
      ? h('span', [
          dot(),
          'then ',
          h('span', { 'class': NAMED, 'data-game': 'submitted' }, loaded.leaving),
          ' against ',
          h('span', {
            'class'        : NAMED,
            'data-covered' : covering ? '' : undefined,
            'data-game'    : 'stored'
          }, covering
            ? [
                h('span', { 'aria-hidden': 'true' }, loaded.parting),
                h('span', { class: 'sr-only' }, COVERED)
              ]
            : loaded.parting)
        ])
      : null
  ])
}

/**
 * Draws the middle dot setting one part of the details apart from the next.
 */
function dot(): VNode {
  return h('span', { class: 'text-quiet' }, ' · ')
}

/**
 * Draws the match's half of the band: the count of positions the two games
 * share beside the stored game, the details under it, the tally of the stored
 * games tied on the run where the match lists two or more, and the copies of
 * the link and of the PGN.
 *
 * Args:
 *   covering : Whether the stored game's move where the games part is covered.
 *   key      : The key the half is drawn under, new for each load, so a load
 *     draws it afresh.
 *   loaded   : The loaded match.
 *   link     : Makes the link to the match.
 *   tied     : The stored games tied on the run, the place of the shown one
 *     among them, and the call showing another.
 */
function drawMatch(
  covering : boolean,
  key      : number,
  loaded   : Loaded,
  link     : () => Promise<string>,
  tied     : { at: number, show: (at: number) => void, ties: readonly Tied[] }
): VNode {
  const tallied = tied.ties.length > 1 && !!loaded.shared
  return h('div', { class: 'grid min-w-0 gap-2.5', key }, [
    headline(loaded),
    details(covering, loaded, tallied),
    tallied
      ? h(Tally, { at: tied.at, length: loaded.shared!.length, onShow: tied.show, ties: tied.ties })
      : null,
    h('div', { class: 'flex flex-wrap items-center gap-x-[22px] gap-y-2.5' }, [
      h(Seat, {
        done  : 'Link copied',
        icon  : 'link',
        label : 'Copy link',
        make  : link,
        title : 'A link to this match'
      }),
      h(Seat, {
        done  : 'PGN copied',
        icon  : 'pgn',
        label : 'Copy PGN',
        make  : () => pgnOf(loaded),
        title : 'This game as PGN, the stored game’s moves as a variation'
      })
    ])
  ])
}

/**
 * Makes the whole band take a dropped file, counting the drags entering and
 * leaving it so the band stays marked while a drag crosses its children.
 */
function dropOn(drag: Ref<number>, take: (file: File) => void): Record<string, (event: DragEvent) => void> {
  return {
    onDragenter: event => {
      if (carriesFiles(event)) drag.value++
    },
    onDragleave: () => {
      drag.value = Math.max(0, drag.value - 1)
    },
    onDragover: event => {
      if (carriesFiles(event)) event.preventDefault()
    },
    onDrop: event => {
      event.preventDefault()
      drag.value = 0
      const file = event.dataTransfer?.files[0]
      if (file) take(file)
    }
  }
}

function headline(loaded: Loaded): VNode {
  const stored = loaded.match.stored
  return h('p', { class: 'flex items-center gap-[18px] text-ink max-sm:gap-3' }, [
    h('b', {
      class: 'font-display text-[4.8rem]/[70px] font-normal lining-nums tabular-nums text-run '
           + 'max-lg:text-[3.8rem]/[56px] max-sm:text-[3rem]/[44px]'
    }, String(loaded.shared?.length ?? 0)),
    h('span', [
      h('span', {
        class: 'block font-body text-[1.05rem]/[22px] font-normal text-quiet italic'
      }, 'positions shared with '),
      h('span', {
        class: 'block font-display text-[1.7rem]/[32px] font-normal max-sm:text-[1.3rem]/[26px]'
      }, stored ? games.nameOf(stored) : 'no stored game')
    ])
  ])
}

/**
 * Names how many stored games share as long a run with the submitted game,
 * where the stored game ties with others, and nothing where it ties with none.
 */
function ties(loaded: Loaded): (VNode | string)[] {
  const { match: { ties: others }, shared } = loaded
  if (!others || !shared) return []
  const positions = shared.length === 1 ? '1 position' : `${shared.length} positions`
  const phrase    = `one of ${others + 1} stored games sharing ${positions}`
  return [dot(), phrase]
}

/**
 * The band at the top of the stage: the count of positions the two games share
 * in the display face beside the stored game, the details under it, the tally
 * of the stored games `ties` lists where it lists two or more, its presses
 * reaching the tool through `show`, and the copies of the link and of the PGN,
 * with the intake at its right, meaning the PGN entry, the two examples, and a
 * picker for a match file or a game. The whole band takes either file dropped
 * on it, reaching the tool through `file` as a picked one does, an example
 * through `load`, and a game in PGN through `pgn`, and the line under the
 * intake names the problem a file or a submitted game carries.
 */
export const Band = defineComponent({
  name: 'ScotchBand',

  props: {
    at       : { default: 0, type: Number },
    covering : { default: false, type: Boolean },
    link     : { required: true, type: Function as PropType<() => Promise<string>> },
    loaded   : { required: true, type: Object as PropType<Loaded> },
    problem  : { required: true, type: String },
    sample   : { default: undefined, type: String as PropType<Sample> },
    ties     : { default: () => [], type: Array as PropType<readonly Tied[]> }
  },

  emits: {
    ...TAKES,
    pgn  : (text: string, source: string) => !!text && !!source,
    show : (at: number) => Number.isInteger(at)
  },

  setup: (props, { emit }) => {
    let count   = 0
    const drag  = shallowRef(0)
    const loads = new WeakMap<Loaded, number>()
    const take  = (file: File): void => emit('file', file)
    const on    = dropOn(drag, take)
    const keyOf = (loaded: Loaded): number => {
      if (!loads.has(loaded)) loads.set(loaded, ++count)
      return loads.get(loaded)!
    }

    return () => h('section', {
      'aria-label' : 'The match and your game',
      'class'      : BAND,
      'data-drag'  : drag.value > 0 ? '' : undefined,
      ...on
    }, [
      drawMatch(props.covering, keyOf(props.loaded), props.loaded, props.link, {
        at   : props.at,
        show : (at: number) => emit('show', at),
        ties : props.ties
      }),
      h(Intake, {
        onFile  : take,
        problem : props.problem,
        sample  : props.sample,

        onLoad: (match: Match, source: string, sample?: Sample) => {
          emit('load', match, source, sample)
        },

        onPgn: (text: string) => {
          emit('pgn', text, 'the pasted game')
        }
      })
    ])
  }
})
