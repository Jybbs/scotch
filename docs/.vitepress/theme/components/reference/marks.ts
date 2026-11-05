import { type ShallowRef, type VNode, defineComponent, h, shallowRef, useId } from 'vue'

import { percent }                           from '../../../lib/data/numbers.ts'
import { useChart }                          from '../../../lib/data/chart.ts'
import { MARKS, type MarkFrame, frameAt }    from '../../../lib/reference/marks.ts'
import { narrowAt }                          from '../../../lib/reference/pick.ts'
import { type NodeRef, useBeats, useUnfold } from '../../../lib/reference/timeline.ts'
import { cardOf }                            from '../../../lib/site/routes.ts'
import { stacked, stage }                    from './parts.ts'

/**
 * Where the drawing stands along its stops, beside the calls that glide it to a
 * stop and set it down at a place.
 */
interface Walk {
  glide : (goal: number) => void
  place : ShallowRef<number>
  set   : (place: number) => void
}

/**
 * The stage's height in pixels, which every stop keeps, so no stop moves the
 * sentence beneath it.
 */
const HEIGHT = 264
/**
 * Each hop of the unfold, as the stop it reaches, when it starts, and how long
 * it runs in milliseconds.
 */
const HOPS: readonly (readonly [number, number, number])[] = [[1, 300, 900], [2, 1500, 1150], [3, 3000, 900], [4, 4400, 900]]
const LAST = MARKS.stops.length - 1

/**
 * Holds the place along the stops and runs the unfold on `chart`.
 */
function useWalk(chart: NodeRef): Walk {
  const place = shallowRef(LAST)
  const beats = useBeats()

  useUnfold(chart, beats, {
    length : 6000,
    play   : (time, done) => {
      HOPS.forEach(([goal, delay, ms]) => {
        time.tween(ms, eased => {
          place.value = goal - 1 + eased
        }, { delay })
      })
      time.at(5500, done)
    },
    prime  : () => {
      place.value = 0
    },
    settle : () => {
      place.value = LAST
    }
  })

  return {
    glide: goal => {
      const from = place.value
      beats.glide(900, eased => {
        place.value = from + (goal - from) * eased
      })
    },
    place: place,
    set: at => {
      beats.halt()
      place.value = at
    }
  }
}

function drawing(id: string, frame: MarkFrame, width: number): VNode {
  const y      = HEIGHT - 14
  const middle = width / 2
  return h('svg', { 'aria-hidden': 'true', 'viewBox': `0 0 ${width} ${HEIGHT}` }, [
    h('clipPath', { id: `${id}-letters` }, h('rect', { height: 1100, width: 3000 * frame.letters, x: 600, y: -900 })),
    h('clipPath', { id: `${id}-tagline` }, h('rect', { height: 400, width: 3700 * frame.tagline, x: -120, y: 60 })),
    h('g', { style: { opacity: 1 - frame.card }, transform: frame.transform }, [
      h('path', { 'd': MARKS.mark.paths[0]!, 'fill-rule': 'nonzero' }),
      h('path', { 'clip-path': `url(#${id}-letters)`, 'd': MARKS.wordmark.paths[1]!, 'fill-rule': 'nonzero' }),
      h('path', { 'clip-path': `url(#${id}-tagline)`, 'd': MARKS.lockup.paths[2]!, 'fill-rule': 'nonzero' })
    ]),
    h('path', {
      class : 'sc-ref-span',
      d     : `M${middle - frame.half} ${y - 4}V${y + 4}M${middle - frame.half} ${y}H${middle + frame.half}M${middle + frame.half} ${y - 4}V${y + 4}`
    })
  ])
}

function reading(place: number, frame: MarkFrame): VNode {
  const stop  = MARKS.stops[Math.round(place)]!
  const size  = frame.card > 0.5 ? `${stop.width} by ${stop.height}` : `${Math.round(frame.unitsW)} by ${Math.round(frame.unitsH)}`
  const fit   = frame.card > 0.5 ? frame.cardWide / stop.width : frame.shown
  return h('div', { class: 'sc-ref-readout' }, [
    h('b', stop.name),
    h('small', `${size} px${fit < 1 ? `, shown at ${percent(fit)}` : ''}`)
  ])
}

function card(frame: MarkFrame): VNode {
  return h('img', {
    alt    : 'The link card of this page',
    height : 200,
    src    : cardOf('reference/identity.md'),
    style  : {
      display   : frame.card > 0 ? undefined : 'none',
      opacity   : frame.card,
      transform : `translate(${frame.cardLeft}px, ${frame.cardTop}px)`,
      width     : `${frame.cardWide}px`
    },
    width  : 400
  })
}

function controls({ glide, place, set }: Walk): VNode {
  return h('div', [
    h('input', {
      'aria-label' : 'Along the marks from the favicon to the lockup',
      'class'      : 'sc-ref-range',
      'max'        : LAST * 100,
      'min'        : 0,
      'onInput'    : (event: Event) => {
        set(Number((event.target as HTMLInputElement).value) / 100)
      },
      'type'       : 'range',
      'value'      : place.value * 100
    }),
    h('div', { class: 'sc-ref-stops' }, MARKS.stops.map((stop, index) => h('button', {
      'data-at' : Math.round(place.value) === index ? '' : undefined,
      'onClick' : () => {
        glide(index)
      },
      'style'   : { left: `${index / LAST * 100}%` },
      'type'    : 'button'
    }, [h('span', stop.name), h('span', `${stop.width} wide`)])))
  ])
}

/**
 * The marks along one range from the favicon to the lockup, ordered by width and
 * spaced evenly, the S growing and taking on the letters, the link card and the
 * tagline, each stop naming where the site or the README sets that mark.
 */
export const Marks = defineComponent({
  name  : 'ReferenceMarks',
  setup : () => {
    const { chart, layout, sized } = useChart(narrowAt)
    const id                       = useId()
    const walk                     = useWalk(chart)

    return () => {
      const place = walk.place.value
      const width = layout.value.width
      const frame = frameAt(place, width, HEIGHT)
      return stage(chart, layout.value.narrow, [
        h('div', { class: 'sc-ref-zoom', style: { height: `${HEIGHT}px` } }, sized.value
          ? [card(frame), drawing(id, frame, width), reading(place, frame)]
          : undefined),
        controls(walk),
        stacked(MARKS.stops.map(stop => h('p', { class: 'sc-ref-say' }, stop.sentence)), Math.round(place))
      ])
    }
  }
})
