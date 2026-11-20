import { type PropType, type VNode, defineComponent, h, onMounted, shallowRef } from 'vue'

import { SplitBoard, placedOf }          from '../../../lib/front/split.ts'
import type { Position }                 from '../../../lib/methods/example.ts'
import type { How }                      from '../../../lib/methods/motion.ts'
import { squareAt }                      from '../../../lib/methods/squares.ts'
import { LAYER, drawPiece, drawSquares } from '../methods/board.ts'

/**
 * The ring each game's board takes once the boards part, the stored game's
 * pieces dimmed beneath its cover.
 */
const APART = {
  stored    : 'in-data-apart:[box-shadow:0_0_0_1px_var(--sc-rule),0_0_0_3px_var(--sc-stored)]',
  submitted : 'in-data-apart:[box-shadow:0_0_0_1px_var(--sc-rule),0_0_0_3px_var(--sc-submitted)]'
} as const

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
        'data-game'  : props.game,
        'ref'        : node,
        'role'       : 'img',
        'class'      : [
          'relative aspect-[1] w-full overflow-hidden rounded-[3px] transition-[box-shadow] duration-settle',
          '[box-shadow:0_0_0_1px_var(--sc-rule),0_0_0_3px_var(--sc-entry)]',
          APART[props.game as keyof typeof APART]
        ]
      }, [
        drawSquares(),
        h('i', {
          'class'       : 'absolute top-0 left-0 size-[12.5%] bg-(--sc-entry)/42 '
                        + 'will-change-[transform,opacity]',
          'data-landed' : '',
          'style'       : to === null ? { opacity: '0' } : { opacity: '1', transform: squareAt(to) }
        }),
        h('div', {
          'class'      : [
            LAYER,
            'transition-[opacity] duration-settle',
            props.game === 'stored' ? 'in-data-apart:opacity-28' : ''
          ],
          'data-layer' : ''
        }, Array.from(placedOf(props.position), ([id, placed]) =>
          drawPiece(id, placed)))
      ])
    }
  }
})

