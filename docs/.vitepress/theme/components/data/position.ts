import { type VNode, h } from 'vue'

import { readingOrder }     from '../../../lib/methods/board.ts'
import { shadeOf }          from '../../../lib/methods/squares.ts'
import { piecesAt }         from '../../../lib/viewer/drawing.ts'
import { SQUARE, cornerOf } from '../../../lib/viewer/trail.ts'

/**
 * Draws a placement on a board `size` pixels across facing White, its squares
 * shaded as the viewer's board shades them and its pieces at rest.
 */
export function positionBoard(placement: string, label: string, size: number): VNode {
  return h('svg', {
    'aria-label' : label,
    'class'      : 'sc-data-position',
    'height'     : size,
    'role'       : 'img',
    'viewBox'    : `0 0 ${8 * SQUARE} ${8 * SQUARE}`,
    'width'      : size
  }, [
    ...readingOrder.map(square => h('rect', {
      'class'      : 'sc-viewer-square',
      'data-shade' : shadeOf(square),
      'height'     : SQUARE,
      'width'      : SQUARE,
      ...cornerOf(square)
    })),
    ...piecesAt(placement).map(({ markup, transform }) => h('g', {
      class     : 'sc-data-position-piece',
      innerHTML : markup,
      transform : transform
    }))
  ])
}
