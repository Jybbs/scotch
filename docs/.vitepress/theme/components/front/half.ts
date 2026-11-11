import { type PropType, type VNode, defineComponent, h, onMounted, shallowRef } from 'vue'

import { SplitBoard, placedOf }   from '../../../lib/front/split.ts'
import type { Position }          from '../../../lib/methods/example.ts'
import type { How }               from '../../../lib/methods/motion.ts'
import { squareAt }               from '../../../lib/methods/squares.ts'
import { drawPiece, drawSquares } from '../methods/board.ts'

/**
 * What a board of the split exposes, the call that moves its pieces to a
 * position.
 */
export interface Shown {
  show : (position: Position, how?: How) => void
}

/**
 * One board of the split, drawn once at the position the split opens on and
 * then moved in place by a `SplitBoard`, whose `show` the split calls at each
 * step.
 */
export const Half = defineComponent({
  name: 'ScotchFrontHalf',

  props: {
    game     : { required: true, type: String },
    label    : { required: true, type: String },
    position : { required: true, type: Object as PropType<Position> }
  },

  setup: (props, { expose }) => {
    const node = shallowRef<HTMLElement | null>(null)
    let driver: SplitBoard | undefined
    onMounted(() => {
      driver = new SplitBoard(node.value!)
    })
    expose({ show: (position: Position, how?: How) => driver?.show(position, how) })

    return (): VNode => {
      const to = props.position.to
      return h('div', {
        'aria-label' : props.label,
        'class'      : 'sc-front-board',
        'data-game'  : props.game,
        'ref'        : node,
        'role'       : 'img'
      }, [
        drawSquares(),
        h('i', {
          class : 'sc-front-landed',
          style : to === null ? { opacity: '0' } : { opacity: '1', transform: squareAt(to) }
        }),
        h('div', { class: 'sc-run-layer' }, Array.from(placedOf(props.position), ([id, placed]) =>
          drawPiece(id, placed)))
      ])
    }
  }
})

