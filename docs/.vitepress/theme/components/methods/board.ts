import { useResizeObserver } from '@vueuse/core'
import { type PropType, type Ref, type VNode, defineComponent, h, onMounted, shallowRef } from 'vue'

import { MatchBoard, readingOrder } from '../../../lib/methods/board.ts'
import { type Example, cellOf }     from '../../../lib/methods/example.ts'
import type { How }                 from '../../../lib/methods/motion.ts'
import { PIECE }                    from '../../../lib/methods/piece-layer.ts'
import * as squares                 from '../../../lib/methods/squares.ts'

/**
 * The layer a board's pieces stand in, over the squares and their washes.
 */
export const LAYER = 'pointer-events-none absolute inset-0'
/**
 * A grid of the board's eight files and eight ranks, filling the board.
 */
const GRID = 'absolute inset-0 grid grid-cols-[repeat(8,1fr)] grid-rows-[repeat(8,1fr)]'
/**
 * The leader running from a mark's square down to its tag, hidden until the
 * board is measured.
 */
const LEADER = 'absolute left-0 w-px origin-bottom bg-ink opacity-0 will-change-[transform,opacity] '
             + '[box-shadow:0_0_0_1px_color-mix(in_oklab,var(--sc-page)_70%,transparent)]'
/**
 * The tag naming a mark in the key, centered on the row its leader ends at.
 */
const TAG = 'absolute left-0 -mt-[7px] flex h-3.5 items-center font-code text-[0.65rem]/[14px] font-medium '
          + 'tracking-[0.06em] whitespace-nowrap text-ink opacity-0 will-change-[transform,opacity]'
/**
 * A square's wash, a game's color over the square where that game alone
 * stands a piece there and both colors split along the diagonal where each
 * does.
 */
const WASH = [
  'will-change-[opacity]',
  '[&:is([data-kind=submitted],[data-kind=stored])]:bg-(--sc-run-game)/52',
  '[&:is([data-kind=submitted],[data-kind=stored])]:[box-shadow:inset_0_0_0_2px_var(--sc-run-game)]',
  'data-[kind=both]:bg-[linear-gradient(135deg,color-mix(in_oklab,var(--sc-submitted)_60%,transparent)_0_49.4%,color-mix(in_oklab,var(--sc-ground)_70%,transparent)_49.4%_50.6%,color-mix(in_oklab,var(--sc-stored)_60%,transparent)_50.6%)]'
]

/**
 * Draws the board at a ply: its squares, a wash over each square the two games
 * differ on, every piece the ply shows, and the stamp naming one position,
 * beside the key beneath it, whose leaders stay hidden until the board is
 * measured.
 *
 * Args:
 *   board   : The ref the board's node binds to.
 *   example : The line and the stored game the board draws.
 *   key     : The ref the key's node binds to.
 *   ply     : The ply the board is drawn at.
 */
function drawBoard(
  board   : Ref<HTMLElement | null>,
  example : Example,
  key     : Ref<HTMLElement | null>,
  ply     : number
): VNode[] {
  const stamped = cellOf(example, ply) === 'run'
  const pieces  = Array.from(squares.placedAt(example, ply), ([id, placed]) => drawPiece(id, placed))
  return [
    h('div', {
      'aria-hidden' : 'true',
      'class'       : 'relative aspect-[1] overflow-hidden rounded-[3px] [grid-area:board]',
      'ref'         : board
    }, [
      drawSquares(),
      washes(squares.marksAt(example, ply)),
      h('div', { 'class': LAYER, 'data-layer': '' }, pieces),
      h('span', {
        'class'      : [
          'pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-[999px] bg-dark/80',
          'px-[9px] py-[3px] font-code text-[0.54rem]/[14px] font-semibold tracking-[0.12em]',
          'whitespace-nowrap text-ground uppercase opacity-0 will-change-[opacity]'
        ],
        'data-stamp' : '',
        'style'      : { opacity: stamped ? '1' : '0' }
      }, 'One position')
    ]),
    drawKey(key)
  ]
}

/**
 * Draws the key beneath the board, a leader and a tag naming each mark.
 */
function drawKey(key: Ref<HTMLElement | null>): VNode {
  const parts = squares.MARKS.flatMap(mark => [
    h('i', { 'class': LEADER, 'data-kind': mark }),
    h('span', { 'class': TAG, 'data-kind': mark }, squares.MARK_NAMES[mark])
  ])
  return h('div', { 'aria-hidden': 'true', 'class': 'relative h-[108px] [grid-area:key]', 'ref': key }, parts)
}

function washes(marks: readonly (squares.Mark | undefined)[]): VNode {
  return h('div', { 'class': GRID, 'data-washes': '' }, readingOrder.map(square => h('i', {
    'class'     : WASH,
    'data-kind' : marks[square],
    'style'     : { opacity: marks[square] ? '1' : '0' }
  })))
}

/**
 * Draws one piece of a board's layer on its square, named for the piece it
 * stays as the board moves it.
 */
export function drawPiece(id: string, placed: squares.Placed): VNode {
  return h('span', {
    'class'      : PIECE,
    'data-ghost' : placed.ghost ? '' : undefined,
    'data-id'    : id,
    'data-piece' : placed.piece,
    'innerHTML'  : squares.pieceMarkup(placed.piece),
    'style'      : { opacity: String(placed.opacity), transform: squares.squareAt(placed.square) }
  })
}

/**
 * Draws a board's squares in the order the page reads them, the eighth rank
 * first.
 */
export function drawSquares(): VNode {
  return h('div', { class: GRID }, readingOrder.map(square => h('i', {
    'class'      : 'data-[shade=dark]:bg-primary data-[shade=light]:bg-light',
    'data-shade' : squares.shadeOf(square)
  })))
}

/**
 * The board the Methods widget steps and the key beneath it, drawn once at the
 * ply the widget opens on and then moved in place by a `MatchBoard`, whose
 * `show` the widget calls whenever the reader steps and whose leaders follow
 * the board's size as it changes.
 */
export const RunBoard = defineComponent({
  name: 'ScotchRunBoard',

  props: {
    example : { required: true, type: Object as PropType<Example> },
    opening : { required: true, type: Number }
  },

  setup: (props, { expose }) => {
    const board = shallowRef<HTMLElement | null>(null)
    const key   = shallowRef<HTMLElement | null>(null)
    let driver: MatchBoard | undefined

    onMounted(() => {
      driver = new MatchBoard(board.value!, props.example, key.value!, props.opening)
      driver.measure()
    })
    useResizeObserver(board, () => driver?.measure())
    expose({ show: (ply: number, how?: How) => driver?.show(ply, how) })

    return () => drawBoard(board, props.example, key, props.opening)
  }
})
