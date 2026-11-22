import { type PropType, type VNode, defineComponent, h } from 'vue'

import { readingOrder }  from '../../../lib/methods/board.ts'
import { PIECE }         from '../../../lib/methods/piece-layer.ts'
import * as squares      from '../../../lib/methods/squares.ts'
import type { Standing } from '../../../lib/methods/standing.ts'
import { useMotion }     from '../../../lib/motion/control.ts'

/**
 * The glide each piece of a gliding board takes to its new square, and the
 * fade a captured piece takes.
 */
const GLIDE = '[&>span]:transition-[transform,opacity] [&>span]:duration-glide [&>span]:ease-glide'
/**
 * A grid of the board's eight files and eight ranks, filling the board.
 */
const GRID = 'absolute inset-0 grid grid-cols-[repeat(8,1fr)] grid-rows-[repeat(8,1fr)]'
/**
 * The layer a board's pieces stand in, over the squares and their washes.
 */
export const LAYER = 'pointer-events-none absolute inset-0'
/**
 * A board's square in its shade, beneath a wash in the color of
 * the game its mark names, or both colors split along the diagonal where each
 * game stands a different piece there, fading in and out as the mark changes.
 */
const SQUARE = [
  'relative data-[shade=dark]:bg-primary data-[shade=light]:bg-light',
  'after:absolute after:inset-0 after:opacity-0 after:transition-opacity after:duration-glide',
  'data-mark:after:opacity-100',
  'data-[mark=submitted]:after:bg-submitted/55 data-[mark=stored]:after:bg-stored/55',
  'data-[mark=both]:after:split-wash'
]

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
    'key'        : id,
    'style'      : { opacity: String(placed.opacity), transform: squares.squareAt(placed.square) }
  })
}

/**
 * Draws a board's squares in the order the page reads them, the eighth rank
 * first, each square a mark names washed in that mark's color.
 */
export function drawSquares(marks: readonly (squares.Mark | undefined)[] = []): VNode {
  return h('div', { class: GRID }, readingOrder.map(square => h('i', {
    'class'      : SQUARE,
    'data-mark'  : marks[square],
    'data-shade' : squares.shadeOf(square)
  })))
}

/**
 * A board whose pieces glide from square to square as its position changes,
 * each piece one node for the board's life, a captured piece fading out where
 * it stood, and each square a mark names washed in that mark's color. Every
 * glide and fade holds still where the site's drawings do.
 */
export const GlidingBoard = defineComponent({
  name: 'ScotchGlidingBoard',

  props: {
    label    : { required: true, type: String },
    marks    : { default: () => [], type: Array as PropType<readonly (squares.Mark | undefined)[]> },
    standing : { required: true, type: Array as PropType<readonly Standing[]> }
  },

  setup: props => {
    const { moving } = useMotion()
    return (): VNode => h('div', {
      'aria-label' : props.label,
      'class'      : 'relative aspect-square w-full overflow-hidden rounded-[3px] select-none',
      'role'       : 'img'
    }, [
      drawSquares(props.marks),
      h('div', { class: [LAYER, moving.value ? GLIDE : ''] }, props.standing.map(
        ({ gone, id, piece, square }) => drawPiece(id, { ghost: false, opacity: gone ? 0 : 1, piece, square })
      ))
    ])
  }
})
