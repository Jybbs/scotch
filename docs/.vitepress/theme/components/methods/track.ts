import { type PropType, type VNode, defineComponent, h } from 'vue'

import { type Pair, TRACK } from '../../../lib/methods/runs.ts'
import { useMotion }        from '../../../lib/motion/control.ts'

/**
 * How a track is drawn: the ply its marker stands at, whether its lines are
 * set heavy, the clip showing each line up to the ply in view, whether the
 * site's drawings move, the pair of games it draws, and the last ply it shows
 * strong.
 */
interface Drawn {
  at     : number | undefined
  bold   : boolean
  clip   : { clipPath: string }
  moving : boolean
  pair   : Pair
  reach  : number
}

const STROKES = { stored: 'stroke-stored', submitted: 'stroke-submitted' } as const
const GLIDE   = 'transition-[clip-path] duration-glide ease-glide'

/**
 * Draws a band over each ply that moves the marker there once pressed.
 */
function hits(pair: Pair, pick: ((ply: number) => void) | undefined): VNode[] {
  if (!pick) return []
  return Array.from({ length: pair.columns }, (_, ply) => h('rect', {
    class   : 'cursor-pointer fill-transparent',
    height  : TRACK.apart + 2 * TRACK.margin,
    key     : `hit${ply}`,
    onClick : () => pick(ply),
    width   : TRACK.step,
    x       : (ply - 0.5) * TRACK.step,
    y       : -TRACK.margin
  }))
}

/**
 * Draws each game's line twice, faint in full and strong up to the ply in
 * view.
 */
function lines(drawn: Drawn): VNode[] {
  const width = drawn.bold ? 'stroke-[3] [vector-effect:non-scaling-stroke]' : 'stroke-[2.4]'
  return (['submitted', 'stored'] as const).flatMap((game, lane) => {
    const path = drawn.pair.lineOf(lane)
    return [
      h('path', { class: ['fill-none opacity-25', width, STROKES[game]], d: path }),
      h('path', {
        class : ['fill-none', width, STROKES[game], drawn.moving ? GLIDE : ''],
        d     : path,
        style : drawn.clip
      })
    ]
  })
}

/**
 * Draws the dashed box a track sets around the plies from `from` to `to`, both
 * counted, or nothing where it boxes none.
 */
function boxed(box: readonly number[] | undefined): VNode[] {
  if (!box) return []
  const [from = 0, to = 0] = box
  return [h('rect', {
    class  : 'fill-ink/6 stroke-ink stroke-[1.1] [stroke-dasharray:3_2]',
    height : TRACK.apart + 2 * TRACK.margin - 2,
    rx     : 3,
    width  : (to - from + 1) * TRACK.step,
    x      : (from - 0.5) * TRACK.step,
    y      : 1 - TRACK.margin
  })]
}

/**
 * Draws the marker riding each game's line at the ply in view.
 */
function riders({ at, bold, moving, pair }: Drawn): VNode[] {
  if (at === undefined) return []
  const glide = moving ? 'transition-transform duration-glide ease-glide' : ''
  return [0, 1].map(lane => h('circle', {
    class : ['fill-ink stroke-page stroke-[1.5]', glide],
    cx    : 0,
    cy    : 0,
    key   : `rider${lane}`,
    r     : TRACK.dot + (bold ? 5 : 1.4),
    style : { transform: `translate(${at * TRACK.step}px, ${pair.heightAt(lane, at)}px)` }
  }))
}

/**
 * Draws the shared line through each run longer than one position, and a
 * station on every position the two games share, hollow past the ply in view.
 */
function shared(drawn: Drawn): VNode[] {
  const middle = TRACK.apart / 2
  const width  = drawn.bold ? 'stroke-[4.5] [vector-effect:non-scaling-stroke]' : 'stroke-[3.4]'
  const joined = drawn.pair.runs.filter(run => run.length > 1).map(run => h('path', {
    class : ['fill-none stroke-run', width, drawn.moving ? GLIDE : ''],
    d     : `M ${run.start * TRACK.step} ${middle} H ${(run.start + run.length - 1) * TRACK.step}`,
    style : drawn.clip
  }))
  const stations = Array.from({ length: drawn.pair.columns }, (_, ply) => ply)
    .filter(ply => drawn.pair.runAt(ply))
    .map(ply => h('circle', {
      cx    : ply * TRACK.step,
      cy    : middle,
      key   : `run${ply}`,
      r     : TRACK.dot + (drawn.bold ? 3 : 0.8),
      class : ply > drawn.reach
            ? 'fill-page stroke-run/40 stroke-[1.4]'
            : 'fill-run stroke-page stroke-[1.2]'
    }))
  return [...joined, ...stations]
}

/**
 * Two games as two lines, a station for each position, running apart where the
 * games differ and joining into one line in the run's color wherever they
 * stand on one position, a marker riding both to the ply in view and each line
 * past it faint, over a dashed box around the plies `box` names.
 */
export const Track = defineComponent({
  name: 'ScotchTrack',

  props: {
    at     : { default: undefined, type: Number },
    bold   : { default: false, type: Boolean },
    box    : { default: undefined, type: Array as PropType<number[]> },
    label  : { required: true, type: String },
    onPick : { default: undefined, type: Function as PropType<(ply: number) => void> },
    pair   : { required: true, type: Object as PropType<Pair> }
  },

  setup: props => {
    const { moving } = useMotion()
    return (): VNode => {
      const { margin } = TRACK
      const last       = props.pair.columns - 1
      const reach      = props.at ?? last
      const drawn      = {
        at     : props.at,
        bold   : props.bold,
        clip   : { clipPath: `inset(-4px ${(last - reach) * TRACK.step}px -4px -4px)` },
        moving : moving.value,
        pair   : props.pair,
        reach  : reach
      }
      return h('svg', {
        'aria-label' : props.label,
        'class'      : 'block h-auto w-full overflow-visible',
        'role'       : 'img',
        'viewBox'    : `${-margin} ${-margin} ${last * TRACK.step + 2 * margin} ${TRACK.apart + 2 * margin}`
      }, [...boxed(props.box), ...lines(drawn), ...shared(drawn), ...riders(drawn), ...hits(props.pair, props.onPick)])
    }
  }
})
