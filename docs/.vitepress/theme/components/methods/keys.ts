import { type PropType, type VNode, defineComponent, h, shallowRef } from 'vue'

import { type Keyed, type Passant, type Turned, keyedOf, travelOf } from '../../../lib/methods/keys.ts'
import * as squares                                                from '../../../lib/methods/squares.ts'
import { squareNamed }                                             from '../../../lib/reference/pieces.ts'
import { tracked }                                                 from '../../../lib/methods/standing.ts'
import { usePlayer }                                               from '../../../lib/methods/stepping.ts'
import { useMotion }                                               from '../../../lib/motion/control.ts'
import { GlidingBoard, type Wash }                                 from './board.ts'
import { cells, reels }                                            from './digits.ts'
import { BUTTON, CAPS, CARD, GAME_TEXT, NOTE, controls, stacked }  from './parts.ts'

/**
 * A row of the sum: its head over its digits, then beside them, narrowed where
 * the board stands beside the sum.
 */
const ROW = 'grid items-center gap-x-3 gap-y-1 sm:grid-cols-[13.5rem_auto] '
          + 'lg:grid-cols-[12rem_auto] lg:gap-x-1.5'

/**
 * Draws what one number of the key stands for: the piece on its square, in the
 * square's shade, or a disc for the side to move or a right, lit where the
 * number joins the key and faded where it leaves.
 */
function glyph({ joins, term }: Turned): VNode {
  const lit = joins ? 'ring-2 ring-run' : 'opacity-55'
  if (term.piece === null || term.square === null) {
    return h('span', { 'aria-hidden': 'true', 'class': ['grid size-7 place-items-center rounded-[3px] bg-raised', lit] },
      h('span', { class: 'block size-3.5 rounded-full border-[1.5px] border-ink bg-light' }))
  }
  return h('span', {
    'aria-hidden' : 'true',
    'class'       : [
      'block size-7 rounded-[3px] [&_svg]:block [&_svg]:size-full',
      squares.shadeOf(term.square) === 'dark' ? 'bg-primary' : 'bg-light',
      lit
    ],
    'innerHTML'   : squares.pieceMarkup(term.piece)
  })
}

/**
 * Draws one row of the sum: its head and its digits.
 */
function row(head: VNode, body: VNode, key: string): VNode {
  return h('div', { class: ROW, key }, [head, body])
}

/**
 * Draws the head of a row of the sum: its sign and its name.
 */
function named(text: string, tone: string, sign: string): VNode {
  return h('span', { class: 'flex items-center gap-2' }, [
    h('span', { class: 'grid size-7 place-items-center font-code text-[0.9rem]/[1] text-quiet' }, sign),
    h('span', { class: [CAPS, tone] }, text)
  ])
}

/**
 * Draws the numbers a move turns, each as what it stands for, its name, and
 * its digits, unfolding in turn as the move plays.
 */
function turns(keyed: Keyed, ply: number, live: boolean, moving: boolean): VNode {
  return h('div', { class: 'grid gap-1.5' }, keyed.turns[ply]!.map((turned, at) => row(
    h('span', { class: 'flex items-center gap-2' }, [
      glyph(turned),
      h('span', { class: [CAPS, turned.joins ? 'text-run' : 'text-quiet'] },
        `⊕ ${turned.joins ? 'In' : 'Out'} · ${turned.term.name}`)
    ]),
    h('span', {
      class : ['[animation-fill-mode:backwards]', live && moving ? 'animate-unfold' : ''],
      style : { animationDelay: `${at * 60}ms` }
    }, [cells(turned.term.value)]),
    `term${ply}${at}`
  )))
}

/**
 * Draws the key a move writes worked as a sum in columns: the key before, each
 * number the move turns, and the key after rolling to its new digits, each
 * column the move turns washed in the key before and the key after, every
 * ply's numbers set in one cell so the sum keeps one height from the first ply
 * to the last.
 */
function sum(keyed: Keyed, ply: number, moving: boolean): VNode {
  const shown  = Math.max(ply, 1)
  const before = keyed.keys[shown - 1]!
  const after  = keyed.keys[ply]!
  const plies  = Array.from({ length: keyed.last }, (_, at) => at + 1)
  return h('div', { class: 'grid gap-1.5' }, [
    h('div', { 'aria-hidden': ply ? undefined : 'true', 'class': ['grid gap-1.5', ply ? '' : 'invisible'] }, [
      row(named('The key before', 'text-quiet', ''), cells(before, index => ply > 0 && before[index] !== after[index]), 'before'),
      stacked(shown - 1, plies.map(at => turns(keyed, at, at === shown, moving)))
    ]),
    h('hr', { class: 'm-0! border-rule sm:ml-[14.25rem]' }),
    row(named(ply ? 'The key after' : 'The key of the start', 'text-run', '='),
      reels(after, ply ? before : undefined, moving), 'after')
  ])
}

/**
 * Draws a position whose en passant file the key reads or leaves out, beside
 * its two keys.
 */
function passantOf(each: Passant): VNode {
  const [placement, , , target] = each.fen.split(' ') as [string, string, string, string]
  const same  = each.counted === each.cleared
  const marks: Wash[] = []
  marks[squareNamed(target)] = each.legal ? 'to' : 'from'
  return h('div', { class: 'grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3 rounded-md border border-rule bg-raised p-3' }, [
    h(GlidingBoard, {
      label    : `${each.legal ? 'A pawn free to capture' : 'A pinned pawn'}: ${each.fen}`,
      marks    : marks,
      standing : tracked([placement])[0]!
    }),
    h('div', { class: 'grid content-start gap-1' }, [
      h('span', { class: [CAPS, each.legal ? 'text-run' : 'text-quiet'] }, each.legal ? `Can capture on ${target}` : 'Pinned, cannot capture'),
      h('span', { class: 'font-body text-[0.8125rem]/[18px] text-ink' },
        each.legal ? `The ${target[0]} file counts, so two keys` : 'The file is left out, so one key'),
      h('span', { class: [CAPS, 'mt-1 text-quiet'] }, `With ${target} · without`),
      h('span', { class: 'grid font-code text-[0.68rem]/[17px] text-ink tabular-nums' }, [
        h('span', each.counted.toUpperCase()),
        h('span', { class: same ? 'text-run' : '' }, same ? '= the same key' : each.cleared.toUpperCase())
      ])
    ])
  ])
}

/**
 * Draws the foot of the widget: the en passant file behind a button while the
 * line has not met the stored game, and the stored game's order and key once
 * it has, every state set in one cell so the foot keeps one height.
 */
function foot(keyed: Keyed, meets: boolean, open: { value: boolean }): VNode {
  const button = (): VNode => h('button', {
    'aria-pressed' : String(open.value),
    'class'        : [BUTTON, 'justify-self-start'],
    'onClick'      : () => { open.value = !open.value },
    'tabindex'     : meets ? -1 : 0,
    'type'         : 'button'
  }, open.value ? 'Hide the en passant file' : 'The en passant file')
  return h('div', {
    class: [
      'grid gap-2 rounded-md border p-3 transition-colors duration-glide [grid-area:end]',
      meets ? 'border-run bg-tint' : 'border-rule bg-raised'
    ]
  }, [stacked(meets ? 2 : Number(open.value), [
    h('div', { class: 'grid justify-items-start gap-2' }, [
      button(),
      h('p', { class: NOTE }, 'Step to the last ply to meet the same position reached by another order.')
    ]),
    h('div', { class: 'grid gap-2' }, [
      button(),
      h('div', { class: 'grid gap-3 sm:grid-cols-2' }, keyed.passant.map(each => passantOf(each)))
    ]),
    h('div', { class: 'grid gap-2' }, [
      h('span', { class: [CAPS, GAME_TEXT.stored] }, `${keyed.stored.name}, by another order`),
      h('span', { class: 'font-code text-[0.74rem]/[18px] text-ink' }, keyed.stored.moves),
      cells(keyed.stored.key),
      h('p', { class: NOTE }, 'The same position, so the same numbers and the same key, whatever order set them.')
    ])
  ])])
}

/**
 * Draws the board of the line at a ply, the squares its move leaves and
 * enters washed.
 */
function board(keyed: Keyed, ply: number): VNode {
  const marks: Wash[] = []
  const { from, to } = ply ? travelOf(keyed.turns[ply]!) : {}
  if (from !== undefined) marks[from] = 'from'
  if (to !== undefined) marks[to] = 'to'
  return h('div', { class: 'grid content-start gap-2 [grid-area:board] max-md:max-w-72' }, [
    h(GlidingBoard, { label: `The line at ply ${ply}`, marks, standing: keyed.pieces[ply]! }),
    h('span', { class: [CAPS, GAME_TEXT.submitted] }, 'The line built for the page')
  ])
}

/**
 * Draws the widget between its status line and its foot: the sentence naming
 * where the line goes, the key the move writes, the board, and the note
 * beside them.
 */
function middle(keyed: Keyed, ply: number, moving: boolean): VNode[] {
  const { last, numbers, stored } = keyed
  return [
    stacked(Number(ply === last), [
      h('p', { class: 'm-0! font-body text-[0.9rem]/[21px]! text-ink' }, 'Each move takes the numbers of what it '
        + `changed out of the key and puts the new ones in. By ply ${last}, ${stored.name} reach the same `
        + 'position by another order, and the same key.'),
      h('p', { class: 'm-0! font-body text-[0.9rem]/[21px]! text-run' },
        `Ply ${last}: ${stored.name} reach this position by another order, and it takes the same key.`)
    ], '[grid-area:goal]'),
    h('div', { class: 'grid min-w-0 content-start gap-1.5 [grid-area:key]' }, [
      h('span', { class: [CAPS, 'text-run'] }, ply ? `The key after ${keyed.moves[ply]}` : 'The key of the starting position'),
      sum(keyed, ply, moving)
    ]),
    board(keyed, ply),
    h('div', { class: 'grid content-start gap-1 [grid-area:chain]' }, [stacked(Number(ply > 0), [
      h('p', { class: NOTE }, `${numbers} numbers combine into it, one for each piece on its square, each castling `
        + 'right, and White to move. Each move turns only the numbers it changes.'),
      h('p', { class: NOTE }, 'Each column of digits combines on its own, so only the washed columns change, '
        + 'and every other column comes out as it went in.')
    ])])
  ]
}

/**
 * The widget Position Keys steps through a line with: one board of the line a
 * move at a time, its pieces gliding, the key each move writes worked as a sum
 * of the key before and the numbers the move turns, ending where the stored
 * game reaches the same position by another order and the same key, every
 * part holding one height from the first ply to the last.
 */
export const Keys = defineComponent({
  name: 'ScotchKeys',

  props: {
    keyed: { default: () => keyedOf(), type: Object as PropType<Keyed> }
  },

  setup: props => {
    const { last }   = props.keyed
    const player     = usePlayer(last, 1)
    const { moving } = useMotion()
    const open       = shallowRef(false)

    return (): VNode => {
      const ply = player.ply.value
      return h('div', { class: '@container' }, h('div', {
        class: [
          CARD,
          'gap-x-6 lg:gap-x-4',
          '[grid-template-areas:"status"_"goal"_"key"_"board"_"chain"_"end"]',
          'md:grid-cols-[15rem_minmax(0,1fr)]',
          'md:[grid-template-areas:"status_status"_"goal_goal"_"key_key"_"board_chain"_"end_end"]',
          'lg:grid-cols-[minmax(min-content,1fr)_minmax(0,14rem)] lg:grid-rows-[auto_auto_auto_1fr_auto]',
          'lg:[grid-template-areas:"status_status"_"goal_goal"_"key_board"_"chain_board"_"end_end"]'
        ]
      }, [
        h('div', { class: 'flex flex-wrap items-center justify-between gap-2 [grid-area:status]' }, [
          controls(player, last),
          h('span', { class: [CAPS, 'text-quiet tabular-nums'], role: 'status' },
            ply ? `Ply ${ply} · ${props.keyed.moves[ply]}` : 'Ply 0 · the start')
        ]),
        ...middle(props.keyed, ply, moving.value),
        foot(props.keyed, ply === last, open)
      ]))
    }
  }
})
