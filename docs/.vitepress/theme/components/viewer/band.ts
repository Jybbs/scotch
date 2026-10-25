import { type PropType, type Ref, type VNode, defineComponent, h, shallowRef } from 'vue'

import type { Match, Sample }   from '../../../lib/viewer/examples.ts'
import * as games               from '../../../lib/viewer/games.ts'
import { readMatch }            from '../../../lib/viewer/link.ts'
import { type Loaded, NOTHING } from '../../../lib/viewer/loaded.ts'
import { pgnOf }                from '../../../lib/viewer/pgn.ts'
import { Intake }               from './intake.ts'
import { Seat }                 from './seat.ts'

/**
 * Reads whether a drag carries files, as one carrying a match file does.
 */
function carriesFiles(event: DragEvent): boolean {
  return !!event.dataTransfer?.types.includes('Files')
}

/**
 * What the band says of the loaded match: how many positions the two share, the
 * stored game, where it was played, the plies of the run, and the two moves
 * where the games part, each move in its game's color.
 */
function details(loaded: Loaded): VNode {
  const stored = loaded.match.stored
  if (!stored || !loaded.shared) return h('p', { class: 'sc-viewer-details' }, NOTHING)
  const { last, meet } = loaded.shared
  return h('p', { class: 'sc-viewer-details' }, [
    games.whereOf(stored) || 'Unknown event',
    dot(),
    `plies ${meet} to ${last}`,
    ...ties(loaded),
    loaded.leaving && loaded.parting
      ? h('span', [
          dot(),
          'then ',
          h('span', { 'class': 'sc-viewer-move-named', 'data-game': 'submitted' }, loaded.leaving),
          ' against ',
          h('span', { 'class': 'sc-viewer-move-named', 'data-game': 'stored' }, loaded.parting)
        ])
      : null
  ])
}

/**
 * Draws the middle dot setting one part of the details apart from the next.
 */
function dot(): VNode {
  return h('span', { class: 'sc-viewer-dot' }, ' · ')
}

/**
 * Draws the match's half of the band: the count of positions the two games
 * share beside the stored game, the details under it, and the copies of the
 * link and of the PGN.
 *
 * Args:
 *   key    : The key the half is drawn under, new for each load, so a load
 *     draws it afresh.
 *   loaded : The loaded match.
 *   link   : Makes the link to the match.
 */
function drawMatch(key: number, loaded: Loaded, link: () => Promise<string>): VNode {
  return h('div', { class: 'sc-viewer-match', key }, [
    headline(loaded),
    details(loaded),
    h('div', { class: 'sc-viewer-tags' }, [
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
 * Makes the whole band take a dropped match file, counting the drags entering
 * and leaving it so the band stays marked while a drag crosses its children.
 */
function dropOn(drag: Ref<number>, read: (file: File) => void): Record<string, (event: DragEvent) => void> {
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
      if (file) read(file)
    }
  }
}

function headline(loaded: Loaded): VNode {
  const stored = loaded.match.stored
  return h('p', { class: 'sc-viewer-headline' }, [
    h('b', { class: 'sc-viewer-count' }, String(loaded.shared?.length ?? 0)),
    h('span', [
      h('span', { class: 'sc-viewer-pre' }, 'positions shared with '),
      h('span', { class: 'sc-viewer-name' }, stored ? games.nameOf(stored) : 'no stored game')
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
 * in the display face beside the stored game, the details under it, and the
 * copies of the link and of the PGN, with the intake at its right, meaning the
 * PGN entry, disabled and marked as arriving with in-browser matching, the two
 * examples, and a picker for a match file. The whole band takes a match file
 * dropped on it, and the line under the intake names the first thing a picked
 * or dropped file lacks.
 */
export const Band = defineComponent({
  name: 'ScotchBand',

  props: {
    link    : { required: true, type: Function as PropType<() => Promise<string>> },
    loaded  : { required: true, type: Object as PropType<Loaded> },
    problem : { required: true, type: String },
    sample  : { default: undefined, type: String as PropType<Sample> }
  },

  emits: {
    load    : (match: Match, source: string, sample?: Sample) => !!match && !!source && sample !== null,
    problem : (text: string) => typeof text === 'string'
  },

  setup: (props, { emit }) => {
    let count   = 0
    const drag  = shallowRef(0)
    const loads = new WeakMap<Loaded, number>()
    const read  = async (file: File): Promise<void> => {
      const reading = readMatch(await file.text(), file.name)
      if (reading.match) emit('load', reading.match, file.name)
      else emit('problem', reading.problem)
    }
    const take = (file: File): void => {
      void read(file)
    }
    const on    = dropOn(drag, take)
    const keyOf = (loaded: Loaded): number => {
      if (!loads.has(loaded)) loads.set(loaded, ++count)
      return loads.get(loaded)!
    }

    return () => h('section', {
      'aria-label' : 'The match and your game',
      'class'      : 'sc-viewer-band',
      'data-drag'  : drag.value > 0 ? '' : undefined,
      ...on
    }, [
      drawMatch(keyOf(props.loaded), props.loaded, props.link),
      h(Intake, {
        onFile  : take,
        problem : props.problem,
        sample  : props.sample,
        onLoad  : (match: Match, source: string, sample?: Sample) => {
          emit('load', match, source, sample)
        }
      })
    ])
  }
})
