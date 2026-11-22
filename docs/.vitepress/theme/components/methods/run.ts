import { type PropType, type VNode, defineComponent, h } from 'vue'

import { type Drawn, drawnOf }                   from '../../../lib/methods/drawn.ts'
import { type Example, exampleOf }               from '../../../lib/methods/example.ts'
import type { Pair }                             from '../../../lib/methods/runs.ts'
import * as squares                              from '../../../lib/methods/squares.ts'
import { type Player, usePlayer }                from '../../../lib/methods/stepping.ts'
import { useMotion }                             from '../../../lib/motion/control.ts'
import { GlidingBoard }                          from './board.ts'
import { CAPS, CARD, GAME_TEXT, NOTE, controls } from './parts.ts'
import { Track }                                 from './track.ts'

type Game = keyof Drawn['moves']

/**
 * The sentence beside the track naming what its joins show.
 */
const JOINS = 'Where the lines join, the two games stand on one position. The search follows each join as '
            + 'far as it runs, and the stored game sharing the longest run is the match.'

/**
 * Draws the line's board at a ply, each square the stored game differs on
 * washed, above a key naming each wash it shows, or the one position the two
 * games share.
 */
function board(drawn: Drawn, example: Example, ply: number): VNode {
  const marks = squares.marksAt(example, ply)
  const shown = squares.MARKS.filter(mark => marks.includes(mark))
  const color = { both: 'text-quiet', ...GAME_TEXT }
  const place = 'grid w-full max-w-64 content-start gap-2 justify-self-center [grid-area:board] md:max-w-none'
  return h('div', { class: place }, [
    h(GlidingBoard, {
      label    : `The line at ply ${ply}, each square the stored game differs on washed`,
      marks    : marks,
      standing : drawn.pieces.submitted[ply]!
    }),
    h('div', { class: [CAPS, 'flex flex-wrap justify-between gap-x-3 text-quiet'] }, drawn.pair.inRow(ply)
      ? [h('span', { class: 'text-run' }, 'One position')]
      : shown.map(mark => h('span', { class: color[mark] }, squares.MARK_NAMES[mark])))
  ])
}

/**
 * Draws the count of the run at a ply, large, beside a meter of the longest
 * run's positions filled one by one to that count, the figure rising anew at
 * each position the run gains.
 */
function counter(pair: Pair, ply: number, moving: boolean): VNode {
  const row     = pair.inRow(ply)
  const longest = pair.longest.length
  const shared  = row === 1 ? 'Position shared, the first in a row' : 'Positions shared in a row'
  const head    = row ? shared : 'Positions differ, the count starts over'
  const scale   = `Of ${longest}, the longest run the two games share`
  const meter   = Array.from({ length: longest }, (_, at) => h('i', {
    class : [
      'h-2.5 flex-1 rounded-[2px] transition-colors duration-glide',
      at < row ? 'bg-run' : 'bg-quiet/20'
    ],
    style : { transitionDelay: moving ? `${Math.max(0, at - row + 1) * 30}ms` : '0ms' }
  }))
  const place = 'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1 [grid-area:count]'
  return h('div', { class: place }, [
    h('span', {
      'aria-live' : 'polite',
      'class'     : [
        'row-span-3 min-w-[2ch] text-center font-display text-[3.25rem]/[1] tabular-nums',
        'transition-colors duration-glide',
        row ? 'text-run' : 'text-quiet',
        moving && row ? 'animate-rise' : ''
      ],
      'key'       : `count${row}`
    }, String(row)),
    h('span', { class: [CAPS, row ? 'text-run' : 'text-quiet'] }, head),
    h('div', { 'aria-hidden': 'true', 'class': 'flex gap-[3px]' }, meter),
    h('span', { class: [CAPS, 'text-quiet tabular-nums'] }, scale)
  ])
}

function moveRow(drawn: Drawn, game: Game, ply: number): VNode {
  return h('div', { class: 'flex items-baseline justify-between gap-3 border-b border-rule/60 py-1.5' }, [
    h('span', { class: [CAPS, GAME_TEXT[game]] }, drawn.names[game]),
    h('span', { class: 'font-code text-[0.8rem]/[18px] text-ink tabular-nums' }, drawn.moves[game][ply])
  ])
}

function track(drawn: Drawn, player: Player): VNode {
  const { length, start } = drawn.pair.longest
  return h('div', { class: 'grid gap-2 self-center [grid-area:track]' }, [
    h(Track, {
      at     : player.ply.value,
      label  : 'The two games as two lines joining where they share a position',
      onPick : player.jump,
      pair   : drawn.pair
    }),
    h('div', { class: [CAPS, 'flex justify-between text-quiet'] }, [
      h('span', 'Start'),
      h('span', { class: 'text-run' }, `Run of ${length} · plies ${start} to ${start + length - 1}`),
      h('span', `Ply ${drawn.last}`)
    ])
  ])
}

/**
 * The widget The Longest Run steps through a match with: the line built for
 * the page and the stored game it meets by another order as two lines of a
 * track, a station for each position, the lines joining into one where the
 * games stand on one position, a marker riding them in step with a board of
 * the line washing each square the two differ on, the count of the run beside
 * it, and each game's move at the ply in view.
 */
export const Run = defineComponent({
  name: 'ScotchRun',

  props: {
    example: { default: () => exampleOf(), type: Object as PropType<Example> }
  },

  setup: props => {
    const drawn             = drawnOf(props.example)
    const { length, start } = drawn.pair.longest
    const player            = usePlayer(drawn.last, start + Math.floor(length / 2))
    const { moving }        = useMotion()

    return (): VNode => {
      const ply = player.ply.value
      return h('div', {
        class: [
          CARD,
          'gap-x-8',
          '[grid-template-areas:"status"_"track"_"count"_"moves"_"board"]',
          'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
          'md:[grid-template-areas:"status_status"_"track_track"_"count_board"_"moves_board"_"note_board"]',
          'lg:grid-cols-[minmax(0,1fr)_13rem]',
          'lg:[grid-template-areas:"status_status"_"track_board"_"count_board"_"moves_board"_"note_board"]'
        ]
      }, [
        h('div', { class: 'flex flex-wrap items-center justify-between gap-2 [grid-area:status]' }, [
          controls(player, drawn.last),
          h('span', { class: [CAPS, 'text-quiet tabular-nums'], role: 'status' }, drawn.pair.statusAt(ply))
        ]),
        track(drawn, player),
        counter(drawn.pair, ply, moving.value),
        h('div', { class: 'grid [grid-area:moves]' }, [
          moveRow(drawn, 'submitted', ply),
          moveRow(drawn, 'stored', ply)
        ]),
        h('p', { class: [NOTE, '[grid-area:note] max-md:hidden'] }, JOINS),
        board(drawn, props.example, ply)
      ])
    }
  }
})
