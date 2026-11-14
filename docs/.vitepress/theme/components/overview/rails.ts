import { type PropType, type VNode, computed, defineComponent, h, shallowRef } from 'vue'

import { useMotion } from '../../../lib/motion/control.ts'
import * as rails    from '../../../lib/overview/rails.ts'
import { Loaded }    from '../../../lib/viewer/loaded.ts'
import { startMark } from '../start.ts'

/**
 * Draws one entry of the key in its game's color, its label in mono capitals
 * ahead of its move, or the start mark ahead of the label at the starting
 * position.
 */
function entry({ game, label, move, start }: rails.Entry): VNode {
  const named = h('i', { class: 'sc-rails-label' }, label)
  return h('span', { 'class': 'sc-rails-entry', 'data-game': game }, start ? [startMark(), named] : [
    named,
    move === undefined ? null : h('span', { class: 'sc-rails-move' }, move)
  ])
}

/**
 * Replays the run and the parting over the drawn squares, fading the parting
 * line in once the run has passed.
 *
 * Returns:
 *   The animations the replay started.
 */
function replayRails(loaded: Loaded, nodes: Map<rails.Square, Element>, cut?: Element): Animation[] {
  const moves = [
    ...[...nodes].map(([it, node]) => [node, rails.replayOf(loaded, it)] as const),
    ...cut ? [[cut, rails.cutReplayOf(loaded)] as const] : []
  ]
  return moves.map(([node, { delay, duration, keys }]) =>
    node.animate(keys, { delay, duration, fill: 'backwards' }))
}

/**
 * Draws a square of the rails, a shared square in the board's light or dark
 * as its column alternates and a parted square in its game's color, lit while
 * the pointer reads its position.
 */
function square(it: rails.Square, lit: number | undefined, register: (node: unknown) => void): VNode {
  return h('rect', {
    'class'     : { 'is-lit': lit === it.cursor, 'sc-rails-square': true },
    'data-game' : it.game,
    'data-tone' : it.game === 'both' ? (it.cursor % 2 ? 'dark' : 'light') : undefined,
    'height'    : rails.RAILS.cell,
    'ref'       : register,
    'rx'        : 1.5,
    'width'     : rails.RAILS.cell,
    'x'         : it.x,
    'y'         : rails.RAILS.middle + it.lift - rails.RAILS.cell / 2
  })
}

/**
 * The example match drawn as two rails of squares, one square per position,
 * set on one line of board squares while the games share a position and
 * lifted apart where they differ, under a key naming the run and each game's
 * move where the two part. Pointing at the rails replays the run and the
 * parting, fading the parting line in after the run, unless the site's
 * drawings hold still or a replay is still running, and then reads the
 * position under the pointer into the key.
 */
export const Rails = defineComponent({
  name: 'ScotchRails',

  props: {
    loaded: { default: () => rails.example, type: Object as PropType<Loaded> }
  },

  setup: props => {
    const { moving } = useMotion()
    const cursor     = shallowRef<number>()
    const cut        = shallowRef<Element>()
    const nodes      = new Map<rails.Square, Element>()
    const squares    = computed(() => rails.squaresOf(props.loaded))
    const key        = computed(() =>
      cursor.value === undefined ? rails.restingKey(props.loaded) : rails.keyAt(props.loaded, cursor.value))
    let running: Animation[] = []

    const replay = (): void => {
      if (moving.value && !running.some(animation => animation.playState === 'running')) {
        running = replayRails(props.loaded, nodes, cut.value)
      }
    }
    const read = (event: PointerEvent): void => {
      const box    = (event.currentTarget as Element).getBoundingClientRect()
      cursor.value = rails.cursorAt(props.loaded, (event.clientX - box.left) / box.width)
    }
    const rest = (): void => {
      cursor.value = undefined
    }

    return () => h('figure', { class: 'sc-rails' }, [
      h('p', { 'aria-live': 'polite', 'class': 'sc-rails-key' }, key.value.map(entry)),
      h('svg', {
        'aria-label'     : `Both games share ${props.loaded.shared!.length} positions, then part`,
        'class'          : 'sc-rails-drawing',
        'onPointerdown'  : read,
        'onPointerenter' : replay,
        'onPointerleave' : rest,
        'onPointermove'  : read,
        'role'           : 'img',
        'viewBox'        : `0 0 ${rails.widthOf(props.loaded)} ${rails.RAILS.height}`
      }, [
        ...squares.value.map(it => square(it, cursor.value, node => {
          if (node instanceof Element) nodes.set(it, node)
        })),
        h('line', {
          class : 'sc-rails-cut',
          ref   : cut,
          x1    : rails.cutOf(props.loaded),
          x2    : rails.cutOf(props.loaded),
          y1    : 0,
          y2    : rails.RAILS.height
        })
      ])
    ])
  }
})
