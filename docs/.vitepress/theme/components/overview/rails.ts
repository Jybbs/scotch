import { type PropType, type VNode, computed, defineComponent, h, shallowRef } from 'vue'

import { useMotion } from '../../../lib/motion/control.ts'
import * as rails    from '../../../lib/overview/rails.ts'
import { Loaded }    from '../../../lib/viewer/loaded.ts'
import { startMark } from '../start.ts'

/**
 * Draws the band behind the column the pointer reads, shown only while it
 * reads one.
 */
function band(loaded: Loaded, cursor: number | undefined): VNode {
  return h('rect', {
    'class'   : 'fill-ink/9 opacity-0 transition-[opacity,x] data-on:opacity-100',
    'data-on' : cursor === undefined ? undefined : '',
    'height'  : rails.RAILS.height,
    'rx'      : 2,
    'width'   : rails.RAILS.cell + rails.RAILS.gap,
    'x'       : rails.bandOf(loaded, cursor ?? loaded.first),
    'y'       : 0
  })
}

/**
 * Draws one entry of the key in its game's color, its label in mono capitals
 * ahead of its move, or the start mark ahead of the label at the starting
 * position.
 */
function entry({ game, label, move, start }: rails.Entry): VNode {
  const named = h('i', {
    class: 'text-[0.62rem] font-semibold tracking-[0.1em] text-quiet not-italic uppercase'
  }, label)
  return h('span', {
    'data-game' : game,
    'class'     : [
      'inline-flex items-center gap-[0.5em]',
      'data-[game=stored]:text-[color-mix(in_oklab,var(--sc-stored)_60%,var(--sc-ink))]',
      'data-[game=submitted]:text-[color-mix(in_oklab,var(--sc-submitted)_60%,var(--sc-ink))]'
    ]
  }, start ? [startMark(), named] : [named, move === undefined ? null : h('span', move)])
}

/**
 * Draws the key over the rails, one entry per game, read aloud as it changes.
 */
function keyOf(entries: rails.Entry[]): VNode {
  return h('p', {
    'aria-live' : 'polite',
    'class'     : [
      'm-0 mb-2 flex min-h-5.5 flex-wrap gap-x-4.5 gap-y-1',
      'font-code text-[0.8rem]/5.5 font-medium text-ink tabular-nums'
    ]
  }, entries.map(it => entry(it)))
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
    'data-game' : it.game,
    'data-lit'  : lit === it.cursor ? '' : undefined,
    'data-tone' : it.game === 'both' ? (it.cursor % 2 ? 'dark' : 'light') : undefined,
    'height'    : rails.RAILS.cell,
    'ref'       : register,
    'rx'        : 1.5,
    'width'     : rails.RAILS.cell,
    'x'         : it.x,
    'y'         : rails.RAILS.middle + it.lift - rails.RAILS.cell / 2,
    'class'     : [
      'data-[tone=dark]:fill-primary data-[tone=light]:fill-light',
      'data-[game=stored]:fill-stored data-[game=submitted]:fill-submitted',
      'data-lit:stroke-ink data-lit:stroke-[0.9]'
    ]
  })
}

/**
 * The example match drawn as two rails of squares, one square per position,
 * set on one line of board squares while the games share a position and
 * lifted apart where they differ, under a key naming the run and each game's
 * move where the two part. Pointing at the rails replays the run and the
 * parting, fading the parting line in after the run, unless the site's
 * drawings hold still or a replay is still running, and then lights a band
 * behind the position under the pointer and reads it into the key.
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

    return () => h('figure', { class: 'mx-0 my-6 cursor-crosshair' }, [
      keyOf(key.value),
      h('svg', {
        'aria-label'     : `Both games share ${props.loaded.shared!.length} positions, then part`,
        'class'          : 'block h-auto w-full overflow-visible',
        'onPointerdown'  : read,
        'onPointerenter' : replay,
        'onPointerleave' : rest,
        'onPointermove'  : read,
        'role'           : 'img',
        'viewBox'        : `0 0 ${rails.widthOf(props.loaded)} ${rails.RAILS.height}`
      }, [
        band(props.loaded, cursor.value),
        ...squares.value.map(it => square(it, cursor.value, node => {
          if (node instanceof Element) nodes.set(it, node)
        })),
        h('line', {
          class : 'stroke-ink stroke-1 [stroke-dasharray:2_2]',
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
