import { useResizeObserver } from '@vueuse/core'
import { type PropType, type Ref, type VNode, defineComponent, h, onMounted, shallowRef } from 'vue'

import { MatchBoard, readingOrder } from '../../../lib/methods/board.ts'
import { type Example, cellOf }     from '../../../lib/methods/example.ts'
import type { How }                 from '../../../lib/methods/motion.ts'
import * as squares                 from '../../../lib/methods/squares.ts'

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
  const pieces  = Array.from(squares.placedAt(example, ply), ([id, placed]) => piece(id, placed))
  return [
    h('div', { 'aria-hidden': 'true', 'class': 'sc-run-board', 'ref': board }, [
      h('div', { class: 'sc-run-squares' }, readingOrder.map(square =>
        h('i', { 'class': 'sc-run-square', 'data-shade': squares.shadeOf(square) }))),
      washes(squares.marksAt(example, ply)),
      h('div', { class: 'sc-run-layer' }, pieces),
      h('span', { class: 'sc-run-stamp', style: { opacity: stamped ? '1' : '0' } }, 'One position')
    ]),
    drawKey(key)
  ]
}

/**
 * Draws the key beneath the board, a leader and a tag naming each mark.
 */
function drawKey(key: Ref<HTMLElement | null>): VNode {
  const parts = squares.MARKS.flatMap(mark => [
    h('i', { 'class': 'sc-run-leader', 'data-kind': mark }),
    h('span', { 'class': 'sc-run-tag', 'data-kind': mark }, squares.MARK_NAMES[mark])
  ])
  return h('div', { 'aria-hidden': 'true', 'class': 'sc-run-key', 'ref': key }, parts)
}

function piece(id: string, placed: squares.Placed): VNode {
  return h('span', {
    'class'      : 'sc-run-piece',
    'data-ghost' : placed.ghost ? '' : undefined,
    'data-id'    : id,
    'data-piece' : placed.piece,
    'innerHTML'  : squares.pieceMarkup(placed.piece),
    'style'      : { opacity: String(placed.opacity), transform: squares.squareAt(placed.square) }
  })
}

function washes(marks: readonly (squares.Mark | undefined)[]): VNode {
  return h('div', { class: 'sc-run-washes' }, readingOrder.map(square => h('i', {
    'class'     : 'sc-run-wash',
    'data-kind' : marks[square],
    'style'     : { opacity: marks[square] ? '1' : '0' }
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
